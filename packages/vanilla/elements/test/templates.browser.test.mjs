// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Pinned template copies, state-recipe pages, and locally built Vanilla Astryx assets.
 * @output Chromium evidence for template rendering plus landmark audits over both delivery paths and recipe pages.
 * @position Browser acceptance suite for web-component template delivery.
 */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const pinnedRoot = path.join(repoRoot, 'packages/vanilla/demo/elements/pinned');
const staticPinnedRoot = path.join(repoRoot, 'packages/vanilla/demo/pinned');
const distRoot = path.join(repoRoot, 'packages/vanilla/dist');
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
const recipePages = [
  ['recipes/state-recipes.html', 'state-recipes.html'],
  [
    'elements-recipes/elements-state-recipes.html',
    'elements-state-recipes.html',
  ],
];
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
]);

function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    const filePath = path.resolve(repoRoot, `.${pathname}`);
    if (!filePath.startsWith(`${repoRoot}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const details = await stat(filePath);
      if (!details.isFile()) throw new Error('not a file');
      response.writeHead(200, {
        'content-length': details.size,
        'content-type':
          mimeTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({server, baseURL: `http://127.0.0.1:${address.port}`});
    });
  });
}

const {server, baseURL} = await startServer();
const browser = await chromium.launch({headless: true});
const context = await browser.newContext();
const results = [];
const landmarkAudits = [];

async function auditLandmarks(page, templatePath) {
  const axe = await new AxeBuilder({page}).analyze();
  const violations = axe.violations
    .filter(violation => violation.id.startsWith('landmark-'))
    .map(violation => ({
      id: violation.id,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        summary: node.failureSummary,
      })),
    }));
  assert.deepEqual(violations, [], templatePath);
  landmarkAudits.push(templatePath);
}

try {
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.route(
    /https:\/\/cdn\.jsdelivr\.net\/gh\/facebook\/astryx@[^/]+\/packages\/vanilla\/dist\/[^/?]+/,
    async route => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1);
      const filePath = path.join(distRoot, name);
      const content = await readFile(filePath);
      await route.fulfill({
        status: 200,
        contentType: mimeTypes.get(path.extname(name)),
        body: content,
      });
    },
  );
  await page.route('https://cdn.jsdelivr.net/npm/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: '',
    }),
  );
  for (const template of templateNames) {
    for (const theme of ['neutral', 'butter']) {
      for (const mode of ['light', 'dark']) {
        consoleErrors.length = 0;
        await page.goto(
          `${baseURL}/packages/vanilla/demo/elements/pinned/${template}.html?theme=${theme}&mode=${mode}`,
          {waitUntil: 'networkidle'},
        );
        try {
          await page.waitForFunction(
            () => customElements.get('ax-button'),
            null,
            {
              timeout: 10_000,
            },
          );
        } catch (error) {
          throw new Error(
            `${template}:${theme}:${mode} did not register ax-button; console=${JSON.stringify(consoleErrors)}`,
            {cause: error},
          );
        }
        await page.waitForFunction(() => {
          const hosts = [...document.querySelectorAll('*')].filter(element =>
            element.localName.startsWith('ax-'),
          );
          return (
            hosts.length > 0 &&
            hosts.every(
              host =>
                customElements.get(host.localName) &&
                host.querySelector('[data-ax-root]'),
            )
          );
        });
        const state = await page.evaluate(() => ({
          theme: document.documentElement.dataset.astryxTheme,
          mode: document.documentElement.dataset.theme,
          hosts: [...document.querySelectorAll('*')].filter(element =>
            element.localName.startsWith('ax-'),
          ).length,
          bodyWidth: document.body.getBoundingClientRect().width,
        }));
        assert.equal(state.theme, theme);
        assert.equal(state.mode, mode);
        assert.ok(state.hosts > 0);
        assert.ok(state.bodyWidth > 0);
        assert.deepEqual(consoleErrors, [], `${template}:${theme}:${mode}`);
        if (theme === 'neutral' && mode === 'light') {
          await auditLandmarks(page, `elements-templates/${template}.html`);
        }
        results.push({template, theme, mode, hosts: state.hosts});
      }
    }
  }
  assert.equal(results.length, 36);

  for (const template of templateNames) {
    consoleErrors.length = 0;
    await page.goto(
      `${baseURL}/packages/vanilla/demo/pinned/${template}.html?theme=neutral&mode=light`,
      {waitUntil: 'networkidle'},
    );
    assert.deepEqual(consoleErrors, [], `templates/${template}.html`);
    await auditLandmarks(page, `templates/${template}.html`);
  }
  for (const [label, file] of recipePages) {
    consoleErrors.length = 0;
    await page.goto(`${baseURL}/packages/vanilla/examples/${file}`, {
      waitUntil: 'networkidle',
    });
    if (file.startsWith('elements-')) {
      await page.waitForFunction(() => customElements.get('ax-button'));
    }
    assert.deepEqual(consoleErrors, [], label);
    await auditLandmarks(page, label);
  }
  assert.equal(
    landmarkAudits.length,
    templateNames.length * 2 + recipePages.length,
  );

  console.log(
    JSON.stringify(
      {
        browser: await browser.version(),
        pinnedRoot,
        staticPinnedRoot,
        matrices: results.length,
        landmarkAudits,
        templates: templateNames,
        recipePages: recipePages.map(([label]) => label),
        themes: ['neutral', 'butter'],
        modes: ['light', 'dark'],
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
