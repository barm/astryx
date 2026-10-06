// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built Vanilla Astryx assets and the two state-recipe galleries.
 * @output Fresh-context screenshots plus browser and accessibility assertions for every documented state.
 * @position Browser acceptance suite for deterministic interaction-state recipes.
 */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {mkdir, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const evidenceDir =
  process.env.ASTRYX_STATE_EVIDENCE_DIR ?? '/tmp/astryx-vanilla-state-evidence';
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
]);
const states = [
  'default',
  'hover-open',
  'loading',
  'success',
  'upload-progress',
  'upload-done',
  'upload-error',
  'password-weak',
  'password-medium',
  'password-strong',
  'password-visible',
  'nav-collapsed',
  'nav-expanded',
];
const stateRecipes = {
  'hover-open': 'hover',
  loading: 'submit',
  success: 'submit',
  'upload-progress': 'upload',
  'upload-done': 'upload',
  'upload-error': 'upload',
  'password-weak': 'password',
  'password-medium': 'password',
  'password-strong': 'password',
  'password-visible': 'password',
  'nav-collapsed': 'navigation',
  'nav-expanded': 'navigation',
};

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
      resolve({server, baseURL: `http://127.0.0.1:${server.address().port}`});
    });
  });
}

async function assertState(page, state) {
  assert.equal(
    await page.locator('html').getAttribute('data-active-state'),
    state,
  );
  const visibleRecipes = page.locator('[data-state-recipe]:visible');
  assert.equal(
    await visibleRecipes.count(),
    state === 'default' ? 5 : 1,
    `${state} shows its intended recipe set`,
  );
  if (state !== 'default') {
    assert.equal(
      await visibleRecipes.getAttribute('data-state-recipe'),
      stateRecipes[state],
    );
  }

  if (state === 'hover-open') {
    const host = page.locator('[data-state-role="hover-host"]');
    assert.equal(
      await host.locator('[data-ax-hover-card-content]').isVisible(),
      true,
    );
    assert.equal(
      await host
        .locator('[data-ax-hover-card-trigger], button, a')
        .first()
        .getAttribute('aria-expanded'),
      'true',
    );
  }

  if (state === 'loading' || state === 'success') {
    const button = page
      .locator('[data-state-role="submit-button"]')
      .locator('button')
      .or(page.locator('button[data-state-role="submit-button"]'));
    assert.equal(
      await button.getAttribute('aria-busy'),
      String(state === 'loading'),
    );
    assert.match(
      await page.locator('[data-state-role="submit-status"]').textContent(),
      state === 'loading' ? /Saving/ : /saved successfully/,
    );
  }

  if (state.startsWith('upload-')) {
    const expected =
      state === 'upload-done'
        ? '100'
        : state === 'upload-progress'
          ? '64'
          : '64';
    assert.equal(
      await page
        .locator('[data-state-role="upload-progress"] [role="progressbar"]')
        .getAttribute('aria-valuenow'),
      expected,
    );
    assert.match(
      await page.locator('[data-state-role="upload-status"]').textContent(),
      state === 'upload-done'
        ? /uploaded/
        : state === 'upload-error'
          ? /stopped/
          : /64% complete/,
    );
  }

  if (state.startsWith('password-')) {
    const input = page
      .locator('[data-state-role="password-field"] input')
      .or(page.locator('input[data-state-role="password-field"]'));
    assert.equal(
      await input.getAttribute('type'),
      state === 'password-visible' ? 'text' : 'password',
    );
    assert.match(
      await page.locator('[data-state-role="password-status"]').textContent(),
      state === 'password-weak'
        ? /Weak/
        : state === 'password-medium'
          ? /Medium/
          : /Strong/,
    );
  }

  if (state.startsWith('nav-')) {
    const firstItem = page.locator('[data-state-nav-item]').first();
    assert.equal(await firstItem.isVisible(), state === 'nav-expanded');
    const toggle = page
      .locator('[data-state-role="nav-toggle"] button')
      .or(page.locator('button[data-state-role="nav-toggle"]'));
    assert.equal(
      await toggle.getAttribute('aria-expanded'),
      String(state === 'nav-expanded'),
    );
  }
}

test('HTML and web-component recipes expose every documented state', async t => {
  const {server, baseURL} = await startServer();
  const browser = await chromium.launch({headless: true});
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });
  await mkdir(evidenceDir, {recursive: true});

  for (const [delivery, file] of [
    ['html', 'state-recipes.html'],
    ['web-components', 'elements-state-recipes.html'],
  ]) {
    for (const state of states) {
      const context = await browser.newContext({
        viewport: {width: 1440, height: 900},
      });
      const page = await context.newPage();
      const errors = [];
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));

      const hash = state === 'default' ? '' : `#state=${state}`;
      await page.goto(`${baseURL}/packages/vanilla/examples/${file}${hash}`, {
        waitUntil: 'load',
      });
      await page.waitForFunction(
        expected => document.documentElement.dataset.activeState === expected,
        state,
      );
      await assertState(page, state);

      const axe = await new AxeBuilder({page}).analyze();
      assert.deepEqual(
        axe.violations
          .filter(violation =>
            ['serious', 'critical'].includes(violation.impact),
          )
          .map(violation => violation.id),
        [],
        `${delivery}/${state} has no serious or critical axe violations`,
      );
      assert.deepEqual(
        errors,
        [],
        `${delivery}/${state} has no console errors`,
      );
      await page.screenshot({
        path: path.join(evidenceDir, `${delivery}-${state}.png`),
        fullPage: true,
      });
      await context.close();
    }
  }
});
