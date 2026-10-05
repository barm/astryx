// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input The canonical Vanilla Astryx demos, templates, and CLI CDN pin.
 * @output Deterministic, committed HTML files that open directly from a clone.
 * @position Build helper for the shareable no-build Vanilla Astryx demos.
 */

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {
  ASTRYX_VANILLA_CDN_PLACEHOLDER,
  ASTRYX_VANILLA_CDN_REF,
  astryxVanillaCdnBase,
} from '../../cli/api/template/html/html.mjs';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const templateNames = [
  'dashboard',
  'detail-page',
  'form-two-column',
  'kanban-board',
  'login',
  'product-detail',
  'settings',
  'shell-side-nav',
  'table-filter',
];
const demoSets = [
  {
    name: 'HTML',
    indexPath: 'demo/index.html',
    templateDir: 'templates',
    templateLinkPrefix: '../templates',
    outputDir: 'demo/pinned',
  },
  {
    name: 'web components',
    indexPath: 'demo/elements/index.html',
    templateDir: 'elements-templates',
    templateLinkPrefix: '../../elements-templates',
    outputDir: 'demo/elements/pinned',
  },
];

function renderDocument(
  source,
  {isIndex = false, templateLinkPrefix = ''} = {},
) {
  if (!source.includes(ASTRYX_VANILLA_CDN_PLACEHOLDER)) {
    throw new Error('Vanilla HTML source is missing its CDN placeholder');
  }

  let rendered = source.replaceAll(
    ASTRYX_VANILLA_CDN_PLACEHOLDER,
    astryxVanillaCdnBase(ASTRYX_VANILLA_CDN_REF),
  );
  if (isIndex) {
    for (const name of templateNames) {
      const sourceLink = `${templateLinkPrefix}/${name}.html`;
      if (!rendered.includes(sourceLink)) {
        throw new Error(`Demo index is missing ${sourceLink}`);
      }
      rendered = rendered.replaceAll(sourceLink, `./${name}.html`);
    }
  }
  return rendered;
}

async function expectedDocuments(set) {
  const indexSource = await readFile(
    path.join(packageRoot, set.indexPath),
    'utf8',
  );
  const templates = await Promise.all(
    templateNames.map(async name => ({
      name: `${name}.html`,
      source: await readFile(
        path.join(packageRoot, set.templateDir, `${name}.html`),
        'utf8',
      ),
    })),
  );

  return [
    {
      name: 'index.html',
      content: renderDocument(indexSource, {
        isIndex: true,
        templateLinkPrefix: set.templateLinkPrefix,
      }),
    },
    ...templates.map(({name, source}) => ({
      name,
      content: renderDocument(source),
    })),
  ];
}

async function renderPinnedDemos() {
  const check = process.argv.includes('--check');
  const stale = [];
  let renderedCount = 0;

  for (const set of demoSets) {
    const outputDir = path.join(packageRoot, set.outputDir);
    const documents = await expectedDocuments(set);
    renderedCount += documents.length;
    if (!check) await mkdir(outputDir, {recursive: true});
    for (const {name, content} of documents) {
      const outputPath = path.join(outputDir, name);
      if (check) {
        const current = await readFile(outputPath, 'utf8').catch(() => null);
        if (current !== content) stale.push(`${set.name}: ${name}`);
      } else {
        await writeFile(outputPath, content);
      }
    }
  }

  if (stale.length > 0) {
    throw new Error(
      `Pinned demos are stale (${stale.join(', ')}); run pnpm -F @astryxdesign/vanilla demo`,
    );
  }

  const action = check ? 'Verified' : 'Rendered';
  const webComponentIndex = path.join(
    packageRoot,
    'demo/elements/pinned/index.html',
  );
  console.log(
    `${action} ${renderedCount} pinned demo files at ${ASTRYX_VANILLA_CDN_REF}.`,
  );
  console.log(`Open ${pathToFileURL(webComponentIndex).href}`);
}

renderPinnedDemos().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
