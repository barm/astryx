// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built Vanilla Astryx CSS/JS/element bundles and the elements gallery.
 * @output Real-Chromium evidence for registration, interaction, forms, and a11y.
 * @position Browser acceptance suite for the web-component experiment.
 */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
]);

function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    if (pathname === '/__empty.html') {
      response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
      response.end('<!doctype html><html><body></body></html>');
      return;
    }
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
const checks = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto(
    `${baseURL}/packages/vanilla/examples/elements-gallery.html`,
    {waitUntil: 'load'},
  );
  await page.waitForFunction(() => customElements.get('ax-selector'));
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.gallery__theme ax-button > button').length ===
      42,
  );

  assert.equal(await page.locator('.gallery__theme').count(), 6);
  const matrix = await page.locator('.gallery__theme').evaluateAll(sections =>
    sections.map(section => ({
      theme: section.dataset.astryxTheme,
      mode: section.dataset.theme,
      background: getComputedStyle(section).backgroundColor,
      buttonVisible:
        section.querySelector('ax-button > button').getBoundingClientRect()
          .width > 0,
    })),
  );
  assert.deepEqual(
    matrix.map(item => `${item.theme}:${item.mode}`),
    [
      'neutral:light',
      'neutral:dark',
      'butter:light',
      'butter:dark',
      'y2k:light',
      'y2k:dark',
    ],
  );
  assert.ok(matrix.every(item => item.background !== 'rgba(0, 0, 0, 0)'));
  for (const theme of ['neutral', 'butter', 'y2k']) {
    const [light, dark] = matrix.filter(item => item.theme === theme);
    assert.notEqual(
      light.background,
      dark.background,
      `${theme} mode colors differ`,
    );
  }
  assert.ok(matrix.every(item => item.buttonVisible));
  checks.push('gallery renders all reference groups in 3 themes × light/dark');

  const first = page.locator('.gallery__theme').first();
  const input = first.locator('ax-text-input input');
  await input.fill('Elements');
  const selector = first.locator('ax-selector');
  const nativeSelect = selector.locator('select');
  await nativeSelect.click();
  assert.equal(
    await nativeSelect.evaluate(node => node === document.activeElement),
    true,
  );
  await page.keyboard.press('Escape');
  await nativeSelect.selectOption('design');
  assert.equal(
    await first.locator('ax-text-input').getAttribute('value'),
    'Elements',
  );
  assert.equal(await selector.getAttribute('value'), 'design');
  const submitted = await first
    .locator('form')
    .evaluate(form => Object.fromEntries(new FormData(form)));
  assert.deepEqual(submitted, {project: 'Elements', workspace: 'design'});
  await selector.locator('select').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await selector.getAttribute('value'), 'tools');
  checks.push('TextInput and Selector reflect values and submit natively');

  const tabList = first.locator('ax-tab-list');
  const activity = tabList.locator('ax-tab[value="activity"] button');
  await activity.click();
  assert.equal(await tabList.getAttribute('value'), 'activity');
  assert.equal(await activity.getAttribute('aria-selected'), 'true');
  await activity.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await tabList.getAttribute('value'), 'settings');
  assert.equal(
    await tabList
      .locator('ax-tab[value="settings"] button')
      .getAttribute('aria-selected'),
    'true',
  );
  checks.push('TabList and Tab support pointer and keyboard activation');

  const trigger = first.locator('[data-dialog-trigger] button');
  await trigger.click();
  const dialog = first.locator('ax-dialog dialog');
  assert.equal(await dialog.getAttribute('open'), '');
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.classList.contains('ax-dialog__title'),
    ),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(await dialog.getAttribute('open'), null);
  assert.equal(
    await trigger.evaluate(node => node === document.activeElement),
    true,
  );
  const dialogHost = first.locator('ax-dialog');
  await dialogHost.evaluate(host => host.setAttribute('open', ''));
  await dialog.waitFor({state: 'visible'});
  assert.equal(await dialogHost.getAttribute('open'), '');
  await dialogHost.evaluate(host => host.removeAttribute('open'));
  await dialog.waitFor({state: 'hidden'});
  checks.push(
    'Dialog opens, closes with Escape, restores focus, and follows the open attribute',
  );

  const warningStart = consoleWarnings.length;
  await page.evaluate(async () => {
    const button = document.createElement('ax-button');
    button.setAttribute('mystery', 'one');
    button.setAttribute('variant', 'impossible');
    document.body.append(button);
    await Promise.resolve();
    button.setAttribute('mystery', 'two');
    button.setAttribute('variant', 'also-impossible');
    await Promise.resolve();
    button.remove();
  });
  const runtimeWarnings = consoleWarnings.slice(warningStart);
  assert.equal(
    runtimeWarnings.filter(message => message.includes('mystery')).length,
    1,
  );
  assert.equal(
    runtimeWarnings.filter(message => message.includes('variant')).length,
    1,
  );
  checks.push('unknown attributes and invalid enums warn once');

  const axe = await new AxeBuilder({page}).analyze();
  const serious = axe.violations.filter(violation =>
    ['serious', 'critical'].includes(violation.impact),
  );
  assert.deepEqual(
    serious.map(violation => ({
      id: violation.id,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        summary: node.failureSummary,
      })),
    })),
    [],
  );
  checks.push('axe reports zero serious or critical violations');
  assert.deepEqual(consoleErrors, []);
  checks.push('gallery emits zero console errors');

  for (const [kind, script] of [
    ['classic', 'astryx-elements.classic.js'],
    ['ESM', 'astryx-elements.js'],
  ]) {
    const bundlePage = await browser.newPage();
    await bundlePage.goto(`${baseURL}/__empty.html`);
    if (kind === 'classic') {
      await bundlePage.addScriptTag({
        url: `${baseURL}/packages/vanilla/dist/${script}`,
      });
    } else {
      await bundlePage.addScriptTag({
        type: 'module',
        content: `import '${baseURL}/packages/vanilla/dist/${script}';`,
      });
    }
    await bundlePage.setContent(
      '<ax-button variant="primary">Ready</ax-button>',
    );
    await bundlePage.waitForFunction(() => customElements.get('ax-button'));
    await bundlePage.waitForSelector('ax-button > button.ax-button--primary');
    await bundlePage.close();
    checks.push(`${kind} bundle registers self-contained elements`);
  }

  console.log(
    JSON.stringify(
      {
        baseURL,
        browser: await browser.version(),
        checks,
        consoleErrors,
        matrix,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
