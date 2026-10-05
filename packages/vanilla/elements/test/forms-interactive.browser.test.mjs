// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built form/interactive element bundles and the focused gallery.
 * @output Real-Chromium evidence for forms, state preservation, interaction, and a11y.
 * @position Component-owned browser acceptance for the WC2a element set.
 */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
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

async function waitForGallery(page) {
  await page.waitForFunction(() => customElements.get('ax-lightbox'));
  await page.waitForSelector('ax-checkbox-input input');
  await page.waitForSelector('ax-lightbox dialog', {state: 'attached'});
}

test('form and interactive elements work with Vanilla Astryx and elements alone', async t => {
  const {server, baseURL} = await startServer();
  const browser = await chromium.launch({headless: true});
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(
    `${baseURL}/packages/vanilla/examples/elements-gallery-forms.html`,
    {waitUntil: 'load'},
  );
  await waitForGallery(page);

  const initial = await page.evaluate(() =>
    Object.fromEntries(new FormData(document.querySelector('#element-form'))),
  );
  assert.deepEqual(initial, {
    updates: 'on',
    summary: 'Build with light DOM.',
    seats: '12',
    'launch-date': '2026-10-15',
    'start-time': '09:30',
    volume: '65',
    assignee: '',
    'notification-channel': 'email',
  });

  const checkbox = page.locator('ax-checkbox-input').first();
  await checkbox.locator('label').click();
  assert.equal(await checkbox.getAttribute('value'), null);
  await checkbox.evaluate(host => host.setAttribute('status', 'success'));
  assert.equal(await checkbox.locator('input').isChecked(), false);

  const toggle = page.locator('ax-switch').first();
  await toggle.locator('label').click();
  assert.equal(await toggle.getAttribute('value'), '');
  const switchControl = await toggle.locator('input').elementHandle();
  await toggle.evaluate(host => host.setAttribute('status', 'success'));
  assert.equal(
    await toggle
      .locator('input')
      .evaluate((input, original) => input === original, switchControl),
    true,
  );
  assert.equal(await toggle.locator('input').isChecked(), true);

  await page.locator('ax-text-area textarea').fill('Updated summary');
  await page.locator('ax-radio-list label').filter({hasText: 'Chat'}).click();
  await page.locator('ax-slider input').evaluate(input => {
    input.value = '80';
    input.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await page.locator('ax-typeahead input').fill('Taylor Chen');
  const preservedFormState = await page.evaluate(async () => {
    const cases = [
      ['ax-text-area', 'textarea', 'size', 'lg', 'Updated summary'],
      [
        'ax-radio-list',
        'input[value="chat"]',
        'orientation',
        'horizontal',
        true,
      ],
      ['ax-number-input', 'input', 'status', 'success', '12'],
      ['ax-date-input', 'input', 'status', 'success', '2026-10-15'],
      ['ax-time-input', 'input', 'status', 'success', '09:30'],
      ['ax-slider', 'input', 'status', 'success', '80'],
      ['ax-typeahead', 'input', 'size', 'lg', 'Taylor Chen'],
    ];
    const originals = cases.map(([hostSelector, controlSelector]) => {
      const host = document.querySelector(hostSelector);
      return {host, control: host.querySelector(controlSelector)};
    });
    cases.forEach(([hostSelector, , attribute, value]) =>
      document.querySelector(hostSelector).setAttribute(attribute, value),
    );
    await new Promise(resolve => setTimeout(resolve, 30));
    return cases.map(([hostSelector, controlSelector, , , expected], index) => {
      const control = document
        .querySelector(hostSelector)
        .querySelector(controlSelector);
      return {
        same: control === originals[index].control,
        state: typeof expected === 'boolean' ? control.checked : control.value,
        expected,
      };
    });
  });
  assert.ok(
    preservedFormState.every(
      result => result.same && result.state === result.expected,
    ),
  );
  const updated = await page.evaluate(() =>
    Object.fromEntries(new FormData(document.querySelector('#element-form'))),
  );
  assert.deepEqual(updated, {
    'dark-mode': 'on',
    summary: 'Updated summary',
    seats: '12',
    'launch-date': '2026-10-15',
    'start-time': '09:30',
    volume: '80',
    assignee: 'Taylor Chen',
    'notification-channel': 'chat',
  });

  const menu = page.locator('ax-dropdown-menu');
  await menu.locator('[data-ax-dropdown-trigger]').click();
  await page.waitForFunction(() =>
    document.querySelector('ax-dropdown-menu').hasAttribute('is-menu-open'),
  );
  const menuControl = await menu
    .locator('[data-ax-dropdown-menu]')
    .elementHandle();
  await menu.evaluate(host => host.setAttribute('alignment', 'center'));
  assert.equal(
    await menu
      .locator('[data-ax-dropdown-menu]')
      .evaluate((control, original) => control === original, menuControl),
    true,
  );
  assert.equal(await menu.getAttribute('is-menu-open'), '');
  await menu.locator('[role="menuitem"]').first().click();
  await page.waitForFunction(
    () =>
      !document.querySelector('ax-dropdown-menu').hasAttribute('is-menu-open'),
  );

  const details = page.locator('ax-collapsible details');
  const beforeOpen = await details.evaluate(node => node.open);
  await page.locator('ax-collapsible summary').click();
  const openAfterToggle = !beforeOpen;
  assert.equal(await details.evaluate(node => node.open), openAfterToggle);
  await page.waitForFunction(
    expected =>
      document.querySelector('ax-collapsible').hasAttribute('is-open') ===
      expected,
    openAfterToggle,
  );
  const detailsControl = await details.elementHandle();
  await page
    .locator('ax-collapsible')
    .evaluate(host => host.setAttribute('chevron-position', 'start'));
  assert.equal(
    await details.evaluate(
      (node, original) => node === original,
      detailsControl,
    ),
    true,
  );
  assert.equal(await details.evaluate(node => node.open), openAfterToggle);

  const tooltipTrigger = page.locator('ax-tooltip button');
  await tooltipTrigger.focus();
  await page.waitForFunction(
    () =>
      document.querySelector('ax-tooltip [data-ax-tooltip-content]').hidden ===
      false,
  );
  const tooltipSurface = await page
    .locator('ax-tooltip [data-ax-tooltip-content]')
    .elementHandle();
  await page
    .locator('ax-tooltip')
    .evaluate(host => host.setAttribute('alignment', 'start'));
  assert.equal(
    await page
      .locator('ax-tooltip [data-ax-tooltip-content]')
      .evaluate((surface, original) => surface === original, tooltipSurface),
    true,
  );
  assert.equal(
    await page.locator('ax-tooltip [data-ax-tooltip-content]').isHidden(),
    false,
  );
  await page.keyboard.press('Escape');

  const hoverTrigger = page.locator('ax-hover-card button');
  await hoverTrigger.focus();
  await page.waitForFunction(
    () =>
      document.querySelector('ax-hover-card [data-ax-hover-card-content]')
        .hidden === false,
  );
  const hoverSurface = await page
    .locator('ax-hover-card [data-ax-hover-card-content]')
    .elementHandle();
  await page
    .locator('ax-hover-card')
    .evaluate(host => host.setAttribute('alignment', 'start'));
  assert.equal(
    await page
      .locator('ax-hover-card [data-ax-hover-card-content]')
      .evaluate((surface, original) => surface === original, hoverSurface),
    true,
  );
  assert.equal(
    await page.locator('ax-hover-card [data-ax-hover-card-content]').isHidden(),
    false,
  );
  await page.keyboard.press('Escape');

  await page.locator('ax-toast button').click();
  await page.waitForSelector('[data-ax-toast-viewport] [data-ax-toast-item]');

  const lightbox = page.locator('ax-lightbox');
  await lightbox.locator('[data-ax-lightbox-open]').click();
  await page.waitForFunction(
    () => document.querySelector('ax-lightbox dialog').open,
  );
  assert.equal(await lightbox.getAttribute('is-open'), '');
  const dialogControl = await lightbox.locator('dialog').elementHandle();
  await lightbox.evaluate(host => host.setAttribute('label', 'Updated viewer'));
  assert.equal(
    await lightbox
      .locator('dialog')
      .evaluate((dialog, original) => dialog === original, dialogControl),
    true,
  );
  assert.equal(
    await lightbox.locator('dialog').evaluate(dialog => dialog.open),
    true,
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => !document.querySelector('ax-lightbox dialog').open,
  );

  const axe = await new AxeBuilder({page}).analyze();
  assert.deepEqual(
    axe.violations
      .filter(violation => ['serious', 'critical'].includes(violation.impact))
      .map(violation => violation.id),
    [],
  );
  assert.deepEqual(errors, []);

  const standalone = await context.newPage();
  const standaloneErrors = [];
  standalone.on('console', message => {
    if (message.type() === 'error') standaloneErrors.push(message.text());
  });
  standalone.on('pageerror', error => standaloneErrors.push(error.message));
  await standalone.goto(`${baseURL}/__empty.html`);
  await standalone.addScriptTag({
    url: `${baseURL}/packages/vanilla/dist/astryx-elements.classic.js`,
  });
  await standalone.setContent(`
    <ax-dropdown-menu button-label="Actions"><button type="button" role="menuitem" value="edit">Edit</button></ax-dropdown-menu>
    <ax-tooltip content="Hint" delay="0"><button type="button">Help</button></ax-tooltip>
    <ax-collapsible trigger="Details">Body</ax-collapsible>
    <ax-lightbox src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E" alt="Example"></ax-lightbox>
  `);
  await standalone.waitForSelector(
    'ax-dropdown-menu [data-ax-dropdown-trigger]',
  );
  const standaloneMenu = standalone.locator('ax-dropdown-menu');
  await standaloneMenu.locator('[data-ax-dropdown-trigger]').click();
  assert.equal(await standaloneMenu.getAttribute('is-menu-open'), '');
  await standaloneMenu.locator('[role="menuitem"]').click();
  assert.equal(await standaloneMenu.getAttribute('is-menu-open'), null);
  await standalone.locator('ax-tooltip button').focus();
  await standalone.waitForFunction(
    () =>
      document.querySelector('ax-tooltip [role="tooltip"]').hidden === false,
  );
  await standalone.locator('ax-lightbox [data-ax-lightbox-open]').click();
  await standalone.waitForFunction(
    () => document.querySelector('ax-lightbox dialog').open,
  );
  await standalone.keyboard.press('Escape');
  await standalone.waitForFunction(
    () => !document.querySelector('ax-lightbox dialog').open,
  );
  assert.deepEqual(standaloneErrors, []);
});
