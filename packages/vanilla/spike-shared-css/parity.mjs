// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file parity.mjs
 * @input Generated fixtures/CSS, hand-authored vanilla CSS, and two built themes
 * @output results.json with computed-style parity for all declared variants
 * @position Playwright evidence harness for the shared readable-CSS spike
 */

import {chromium} from 'playwright';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractTokenDefaults} from '../scripts/build.mjs';

const spikeRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(spikeRoot, '../../..');
const generatedRoot = path.join(spikeRoot, 'generated');

const themes = [
  {
    name: 'neutral',
    cssPath: 'packages/themes/neutral/dist/theme.css',
  },
  {
    name: 'butter',
    cssPath: 'packages/themes/butter/dist/theme.css',
  },
];
const modes = ['light', 'dark'];

const properties = {
  Button: {
    root: [
      'display',
      'position',
      'minWidth',
      'maxWidth',
      'height',
      'alignItems',
      'justifyContent',
      'gap',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderTopStyle',
      'borderTopColor',
      'borderRadius',
      'backgroundColor',
      'backgroundImage',
      'color',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'lineHeight',
      'whiteSpace',
      'cursor',
      'boxShadow',
      'opacity',
      'outlineWidth',
      'outlineStyle',
      'outlineColor',
      'outlineOffset',
      'transform',
    ],
  },
  Card: {
    root: [
      'boxSizing',
      'overflowX',
      'overflowY',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderTopStyle',
      'borderRightStyle',
      'borderBottomStyle',
      'borderLeftStyle',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'borderRadius',
      'backgroundColor',
      'boxShadow',
    ],
  },
  TextInput: {
    root: [
      'boxSizing',
      'position',
      'zIndex',
      'display',
      'height',
      'alignItems',
      'gap',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderTopStyle',
      'borderTopColor',
      'borderRadius',
      'backgroundColor',
      'boxShadow',
      'opacity',
      'outlineWidth',
      'outlineStyle',
    ],
    control: [
      'display',
      'flexGrow',
      'flexShrink',
      'flexBasis',
      'minWidth',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderTopStyle',
      'backgroundColor',
      'color',
      'fontFamily',
      'fontSize',
      'lineHeight',
      'outlineWidth',
      'outlineStyle',
    ],
  },
};

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderAttributes(attributes) {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeHTML(value)}"`)
    .join(' ');
}

function renderSpecimen(testCase, kind) {
  const rootClasses =
    kind === 'reference'
      ? testCase.atomicClasses.root
      : testCase.readableClasses;
  const rootClassName = [testCase.hookClass, ...rootClasses].join(' ');
  const attributes = renderAttributes(testCase.attributes);

  if (testCase.component === 'Button') {
    return `<button id="target" type="button" class="${rootClassName}" ${attributes}>Save changes</button>`;
  }
  if (testCase.component === 'Card') {
    return `<div id="target" class="${rootClassName}" ${attributes}>Card content</div>`;
  }
  if (testCase.component === 'TextInput') {
    const controlClasses =
      kind === 'reference' ? testCase.atomicClasses.control.join(' ') : '';
    return `<div id="target" class="${rootClassName}" ${attributes}><input id="control" class="${controlClasses}" value="Example" placeholder="Placeholder"></div>`;
  }
  throw new Error(`Unknown component ${testCase.component}`);
}

function renderTokenCSS(tokens) {
  const declarations = [...tokens]
    .map(([name, value]) => `${name}:${value};`)
    .join('');
  return `@layer reset, astryx-base, astryx-prose, astryx-theme;@layer astryx-base{:root{${declarations}}}`;
}

async function measure(
  page,
  {testCase, kind, css, themeCSS, tokenCSS, theme, mode, state},
) {
  const specimen = renderSpecimen(testCase, kind);
  await page.setContent(`<!doctype html>
<html data-astryx-theme="${theme}" data-theme="${mode}" style="color-scheme:${mode}">
<head>
<style>${tokenCSS}</style>
<style>${themeCSS}</style>
<style>${css}</style>
<style>*{transition-duration:0s!important;animation:none!important}</style>
</head>
<body>${specimen}</body>
</html>`);

  if (state === 'hover') {
    await page.locator('#target').hover();
  } else if (state === 'focus') {
    if (testCase.component === 'Button') {
      await page.keyboard.press('Tab');
    } else {
      await page.locator('#control').focus();
    }
  }

  return page.evaluate(propertyMap => {
    const selectors = {root: '#target', control: '#control'};
    return Object.fromEntries(
      Object.entries(propertyMap).map(([part, names]) => {
        const element = document.querySelector(selectors[part]);
        if (!(element instanceof HTMLElement)) {
          throw new Error(`Missing parity part ${part}`);
        }
        const computed = getComputedStyle(element);
        return [
          part,
          Object.fromEntries(names.map(name => [name, computed[name]])),
        ];
      }),
    );
  }, properties[testCase.component]);
}

function compare(reference, candidate) {
  const differences = [];
  for (const [part, expectedProperties] of Object.entries(reference)) {
    for (const [property, expected] of Object.entries(expectedProperties)) {
      const actual = candidate[part][property];
      if (actual !== expected) {
        differences.push({part, property, expected, actual});
      }
    }
  }
  return {equal: differences.length === 0, differences};
}

function summarize(matrix, key) {
  const failures = matrix.filter(entry => !entry[key].equal);
  return {
    comparisons: matrix.length,
    passed: matrix.length - failures.length,
    failed: failures.length,
    differingProperties: failures.reduce(
      (count, entry) => count + entry[key].differences.length,
      0,
    ),
  };
}

async function main() {
  const [
    fixtureSource,
    referenceCSS,
    readableCSS,
    buttonCSS,
    cardCSS,
    textInputCSS,
    tokenSource,
    ...themeSources
  ] = await Promise.all([
    readFile(path.join(generatedRoot, 'fixtures.json'), 'utf8'),
    readFile(path.join(generatedRoot, 'reference.css'), 'utf8'),
    readFile(path.join(generatedRoot, 'readable.css'), 'utf8'),
    readFile(
      path.join(repoRoot, 'packages/vanilla/src/components/Button.css'),
      'utf8',
    ),
    readFile(
      path.join(repoRoot, 'packages/vanilla/src/components/Card.css'),
      'utf8',
    ),
    readFile(
      path.join(repoRoot, 'packages/vanilla/src/components/TextInput.css'),
      'utf8',
    ),
    readFile(
      path.join(repoRoot, 'packages/core/src/theme/tokens.stylex.ts'),
      'utf8',
    ),
    ...themes.map(theme =>
      readFile(path.join(repoRoot, theme.cssPath), 'utf8'),
    ),
  ]);

  const fixtures = JSON.parse(fixtureSource);
  const tokenCSS = renderTokenCSS(extractTokenDefaults(tokenSource));
  const handCSS = `@layer reset, astryx-base, astryx-prose, astryx-theme;\n@layer astryx-base {\n${buttonCSS}\n${cardCSS}\n${textInputCSS}\n}`;
  const themeCSSByName = new Map(
    themes.map((theme, index) => [theme.name, themeSources[index]]),
  );

  const browser = await chromium.launch({headless: true});
  const pages = {
    reference: await browser.newPage(),
    generated: await browser.newPage(),
    hand: await browser.newPage(),
  };
  const matrix = [];

  try {
    for (const testCase of fixtures.cases) {
      for (const theme of themes.map(value => value.name)) {
        for (const mode of modes) {
          for (const state of testCase.states) {
            const common = {
              testCase,
              themeCSS: themeCSSByName.get(theme),
              tokenCSS,
              theme,
              mode,
              state,
            };
            const [reference, generated, hand] = await Promise.all([
              measure(pages.reference, {
                ...common,
                kind: 'reference',
                css: referenceCSS,
              }),
              measure(pages.generated, {
                ...common,
                kind: 'generated',
                css: readableCSS,
              }),
              measure(pages.hand, {
                ...common,
                kind: 'hand',
                css: handCSS,
              }),
            ]);
            matrix.push({
              component: testCase.component,
              variant: testCase.variant,
              theme,
              mode,
              state,
              generated: compare(reference, generated),
              handFork: compare(reference, hand),
            });
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  const results = {
    schemaVersion: 1,
    dimensions: {
      components: [
        ...new Set(fixtures.cases.map(testCase => testCase.component)),
      ],
      themes: themes.map(theme => theme.name),
      modes,
      states: [...new Set(fixtures.cases.flatMap(testCase => testCase.states))],
      variantCases: fixtures.cases.length,
    },
    summary: {
      generated: summarize(matrix, 'generated'),
      handFork: summarize(matrix, 'handFork'),
    },
    matrix,
  };

  await writeFile(
    path.join(spikeRoot, 'results.json'),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log(JSON.stringify(results.summary, null, 2));
  if (results.summary.generated.failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
