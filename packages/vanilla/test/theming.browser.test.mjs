// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built Vanilla CSS/JS and element bundles.
 * @output Browser assertions for scoped tokens, nested color modes, and persistence.
 * @position Focused acceptance coverage for the Vanilla Theme recipes.
 */
/* global URL, customElements, document, getComputedStyle, localStorage, window */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const fixture = `<!doctype html>
<html lang="en" data-astryx-theme="neutral" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/dist/astryx-vanilla.css" />
    <style>
      @layer astryx-theme {
        [data-astryx-theme='brand'] {
          --color-accent: light-dark(#7c3aed, #c4b5fd);
          --color-text-primary: light-dark(#20123a, #f5f3ff);
          --color-background-body: light-dark(#f5f3ff, #171126);
        }
      }
      @layer astryx-base {
        .theme-probe {
          background: var(--color-accent);
          color: var(--color-text-primary);
        }
      }
    </style>
    <script defer src="/dist/astryx-vanilla.js"></script>
    <script defer src="/dist/astryx-elements.classic.js"></script>
  </head>
  <body>
    <div class="theme-probe" id="outside">Outside</div>
    <div class="ax-theme" data-astryx-theme="brand">
      <div class="theme-probe" id="inside">Brand light</div>
      <div class="ax-theme" data-theme="dark">
        <div class="theme-probe" id="nested-dark">Brand dark</div>
      </div>
    </div>
    <ax-theme theme="brand" mode="dark">
      <div class="theme-probe" id="element-dark">Element dark</div>
    </ax-theme>
    <label>
      Theme
      <select data-ax-theme-switch>
        <option value="neutral">Neutral</option>
        <option value="butter">Butter</option>
        <option value="brand">Brand</option>
      </select>
    </label>
  </body>
</html>`;

function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    if (pathname === '/theme-test.html') {
      response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
      response.end(fixture);
      return;
    }
    const filePath = path.resolve(packageRoot, `.${pathname}`);
    if (!filePath.startsWith(`${packageRoot}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const details = await stat(filePath);
      if (!details.isFile()) throw new Error('not a file');
      response.writeHead(200, {
        'content-length': details.size,
        'content-type': pathname.endsWith('.css')
          ? 'text/css; charset=utf-8'
          : 'text/javascript; charset=utf-8',
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

test('Theme recipes scope computed tokens and persist custom selections', async () => {
  const {server, baseURL} = await startServer();
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.goto(`${baseURL}/theme-test.html`, {waitUntil: 'load'});
    await page.waitForFunction(
      () => customElements.get('ax-theme') && window.AstryxVanilla,
    );
    await page.waitForSelector('ax-theme > .ax-theme #element-dark');

    const colors = await page.evaluate(() =>
      Object.fromEntries(
        ['outside', 'inside', 'nested-dark', 'element-dark'].map(id => [
          id,
          getComputedStyle(document.getElementById(id)).backgroundColor,
        ]),
      ),
    );
    assert.notEqual(colors.outside, colors.inside);
    assert.notEqual(colors.inside, colors['nested-dark']);
    assert.equal(colors['nested-dark'], colors['element-dark']);
    assert.ok(
      Object.values(colors).every(color => /^rgba?\(/.test(color)),
      JSON.stringify(colors),
    );

    const switcher = page.locator('[data-ax-theme-switch]');
    assert.deepEqual(await switcher.locator('option').allTextContents(), [
      'Neutral',
      'Butter',
      'Brand',
    ]);
    await switcher.selectOption('brand');
    assert.equal(
      await page.locator('html').getAttribute('data-astryx-theme'),
      'brand',
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem('astryx-vanilla-theme')),
      'brand',
    );

    await page.reload({waitUntil: 'load'});
    await page.waitForFunction(() => window.AstryxVanilla);
    assert.equal(
      await page.locator('html').getAttribute('data-astryx-theme'),
      'brand',
    );
    assert.equal(
      await page.locator('[data-ax-theme-switch]').inputValue(),
      'brand',
    );
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
