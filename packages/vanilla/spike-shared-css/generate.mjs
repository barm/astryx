// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file generate.mjs
 * @input manifest.mjs plus the canonical Core StyleX source files it references
 * @output generated/readable.css, generated/reference.css, and generated/fixtures.json
 * @position Proof-of-concept compiler from StyleX atomic output to readable selectors
 */

import {transformAsync} from '@babel/core';
import stylexBabelPlugin from '@stylexjs/babel-plugin';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {cases, mappings} from './manifest.mjs';

const require = createRequire(import.meta.url);
const spikeRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(spikeRoot, '../../..');
const generatedRoot = path.join(spikeRoot, 'generated');
const checkMode = process.argv.includes('--check');

const presetTypeScript = require.resolve('@babel/preset-typescript', {
  paths: [path.join(repoRoot, 'packages/core')],
});
const presetReact = require.resolve('@babel/preset-react', {
  paths: [path.join(repoRoot, 'packages/core')],
});

function propertyName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral') {
    return String(node.value);
  }
  throw new Error(`Unsupported object key node ${node.type}`);
}

function staticValue(node) {
  if (node == null || node.type === 'NullLiteral') return null;
  if (
    node.type === 'StringLiteral' ||
    node.type === 'BooleanLiteral' ||
    node.type === 'NumericLiteral'
  ) {
    return node.value;
  }
  if (node.type === 'ObjectExpression') {
    const value = {};
    for (const property of node.properties) {
      if (property.type !== 'ObjectProperty' || property.computed) {
        throw new Error(`Unsupported object member ${property.type}`);
      }
      value[propertyName(property.key)] = staticValue(property.value);
    }
    return value;
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.map(element => staticValue(element));
  }
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'NumericLiteral'
  ) {
    return -node.argument.value;
  }
  throw new Error(`Unsupported static value node ${node.type}`);
}

function collectDeclarations(body, declarations, requestedBindings) {
  for (const statement of body) {
    if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
      collectDeclarations(
        [statement.declaration],
        declarations,
        requestedBindings,
      );
      continue;
    }
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id.type !== 'Identifier' || !declaration.init) continue;
      if (
        declaration.init.type === 'ObjectExpression' &&
        requestedBindings.has(declaration.id.name)
      ) {
        declarations.set(declaration.id.name, staticValue(declaration.init));
      }
    }
  }
}

async function compileSource(relativePath, requestedBindings) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = await readFile(absolutePath, 'utf8');
  // Keep otherwise-inlined style objects observable in the transformed AST.
  // This instrumentation exists only in memory and never changes Core source.
  const probeExports = [...requestedBindings]
    .map((binding, index) => `${binding} as __spike_style_${index}`)
    .join(', ');
  const instrumentedSource = `${source}\nexport {${probeExports}};\n`;
  const result = await transformAsync(instrumentedSource, {
    ast: true,
    code: false,
    babelrc: false,
    configFile: false,
    filename: absolutePath,
    sourceType: 'module',
    presets: [
      [presetTypeScript, {isTSX: true, allExtensions: true}],
      [presetReact, {runtime: 'automatic'}],
    ],
    plugins: [
      [
        stylexBabelPlugin,
        {
          classNamePrefix: 'axref',
          dev: false,
          runtimeInjection: false,
          propertyValidationMode: 'throw',
          genConditionalClasses: true,
          treeshakeCompensation: true,
          unstable_moduleResolution: {
            type: 'commonJS',
            rootDir: repoRoot,
          },
        },
      ],
    ],
  });

  if (!result?.ast)
    throw new Error(`Babel returned no AST for ${relativePath}`);
  const declarations = new Map();
  collectDeclarations(result.ast.program.body, declarations, requestedBindings);

  const rules = new Map();
  for (const [className, cssByDirection, priority] of result.metadata?.stylex ??
    []) {
    rules.set(className, {className, cssByDirection, priority});
  }
  return {declarations, rules};
}

function getStyleMap(compiled, mapping) {
  const binding = compiled.declarations.get(mapping.binding);
  if (!binding) {
    throw new Error(
      `${mapping.source} has no compiled object binding ${mapping.binding}`,
    );
  }
  const styleMap = binding[mapping.key];
  if (!styleMap || typeof styleMap !== 'object') {
    throw new Error(
      `${mapping.source} has no compiled style ${mapping.binding}.${mapping.key}`,
    );
  }
  return styleMap;
}

function collectClasses(value, availableRules, output = []) {
  if (typeof value === 'string') {
    for (const className of value.split(/\s+/)) {
      if (availableRules.has(className)) output.push(className);
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, availableRules, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key !== '$$css') collectClasses(item, availableRules, output);
    }
  }
  return output;
}

function unique(values) {
  return [...new Set(values)];
}

function mergeStyleMaps(mappingRecords) {
  const merged = new Map();
  for (const {styleMap} of mappingRecords) {
    for (const [property, value] of Object.entries(styleMap)) {
      if (property === '$$css') continue;
      if (value == null || value === false) merged.delete(property);
      else merged.set(property, value);
    }
  }

  const availableRules = new Map(
    mappingRecords.flatMap(({compiled}) => [...compiled.rules]),
  );
  return unique(collectClasses(Object.fromEntries(merged), availableRules));
}

function ruleBodies(rule, replacementSelector = null) {
  const bodies = [];
  for (const direction of ['ltr', 'rtl']) {
    const css = rule.cssByDirection[direction];
    if (!css) continue;
    bodies.push({
      css: replacementSelector
        ? css.replaceAll(`.${rule.className}`, replacementSelector)
        : css,
      direction,
      priority: rule.priority,
    });
  }
  return bodies;
}

function renderCSS(title, rules) {
  const sorted = rules
    .map((rule, index) => ({...rule, index}))
    .sort((left, right) =>
      left.priority === right.priority
        ? left.index - right.index
        : left.priority - right.priority,
    );
  const body = sorted.map(rule => `  ${rule.css}`).join('\n');
  return `/* ${title}\n * Generated by spike-shared-css/generate.mjs. Do not edit.\n */\n@layer reset, astryx-base, astryx-prose, astryx-theme;\n\n@layer astryx-base {\n${body}\n}\n`;
}

async function writeOrCheck(relativePath, content) {
  const target = path.join(spikeRoot, relativePath);
  if (checkMode) {
    const current = await readFile(target, 'utf8');
    if (current !== content) {
      throw new Error(`${relativePath} is stale; run node generate.mjs`);
    }
    return;
  }
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(target, content);
}

async function main() {
  const sources = unique(mappings.map(mapping => mapping.source));
  const requestedBindingsBySource = new Map(
    sources.map(source => [
      source,
      new Set(
        mappings
          .filter(mapping => mapping.source === source)
          .map(mapping => mapping.binding),
      ),
    ]),
  );
  const compiledBySource = new Map(
    await Promise.all(
      sources.map(async source => [
        source,
        await compileSource(source, requestedBindingsBySource.get(source)),
      ]),
    ),
  );

  const recordsByID = new Map();
  for (const mapping of mappings) {
    const compiled = compiledBySource.get(mapping.source);
    const styleMap = getStyleMap(compiled, mapping);
    const classNames = unique(collectClasses(styleMap, compiled.rules));
    if (classNames.length === 0) {
      throw new Error(`${mapping.id} compiled to no static StyleX classes`);
    }
    recordsByID.set(mapping.id, {mapping, compiled, styleMap, classNames});
  }

  const fixtureCases = cases.map(testCase => ({
    ...testCase,
    id: `${testCase.component}:${testCase.variant}`,
    atomicClasses: Object.fromEntries(
      Object.entries(testCase.parts).map(([part, ids]) => {
        const records = ids.map(id => {
          const record = recordsByID.get(id);
          if (!record) throw new Error(`Unknown mapping ${id}`);
          return record;
        });
        return [part, mergeStyleMaps(records)];
      }),
    ),
  }));
  const fixtures = {
    schemaVersion: 1,
    generatedFrom: sources,
    cases: fixtureCases,
  };

  // Emit the classes that survive StyleX's last-property-wins merge for each
  // readable BEM composition. This is the critical difference from merely
  // renaming every atomic rule: conditional classes removed by stylex.props()
  // must not leak back in through a broad block selector.
  const ruleByClass = new Map(
    [...compiledBySource.values()].flatMap(compiled => [...compiled.rules]),
  );
  const readableRules = [];
  const readableSeen = new Set();
  for (const testCase of fixtureCases) {
    const rootSelector = `.${testCase.readableClasses.join('.')}`;
    for (const [part, classNames] of Object.entries(testCase.atomicClasses)) {
      const selector =
        part === 'root' ? rootSelector : `${rootSelector} > input`;
      for (const className of classNames) {
        const rule = ruleByClass.get(className);
        if (!rule) throw new Error(`No StyleX rule for ${className}`);
        for (const body of ruleBodies(rule, selector)) {
          const key = `${selector}\u0000${className}\u0000${body.direction}`;
          if (readableSeen.has(key)) continue;
          readableSeen.add(key);
          readableRules.push(body);
        }
      }
    }
  }

  const referenceRules = [];
  const referenceSeen = new Set();
  for (const {compiled, classNames} of recordsByID.values()) {
    for (const className of classNames) {
      if (referenceSeen.has(className)) continue;
      referenceSeen.add(className);
      referenceRules.push(...ruleBodies(compiled.rules.get(className)));
    }
  }

  await Promise.all([
    writeOrCheck(
      'generated/readable.css',
      renderCSS(
        'Readable ax- selectors projected from canonical Core StyleX output.',
        readableRules,
      ),
    ),
    writeOrCheck(
      'generated/reference.css',
      renderCSS(
        'Atomic reference selectors emitted by the canonical StyleX compiler.',
        referenceRules,
      ),
    ),
    writeOrCheck(
      'generated/fixtures.json',
      `${JSON.stringify(fixtures, null, 2)}\n`,
    ),
  ]);

  console.log(
    `${checkMode ? 'Verified' : 'Generated'} ${recordsByID.size} style mappings, ${readableRules.length} readable rules, and ${fixtures.cases.length} parity cases.`,
  );
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
