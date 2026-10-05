// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built WC2a element and progressive-enhancement bundles.
 * @output Chromium regression evidence for review-round behavior in every script order.
 * @position API-review acceptance for element-owned interactions and form state.
 */

import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {chromium} from 'playwright';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const scripts = {
  'elements-only':
    '<script type="module" src="/packages/vanilla/dist/astryx-elements.js"></script>',
  'vanilla-first':
    '<script src="/packages/vanilla/dist/astryx-vanilla.js"></script><script src="/packages/vanilla/dist/astryx-elements.classic.js"></script>',
  'elements-first':
    '<script src="/packages/vanilla/dist/astryx-elements.classic.js"></script><script src="/packages/vanilla/dist/astryx-vanilla.js"></script>',
  'late-vanilla':
    '<script src="/packages/vanilla/dist/astryx-elements.classic.js"></script>',
};
const body = `
  <form id="form">
    <ax-radio-list id="radio" label="Plan" value="a">
      <label><input type="radio" value="a" />Alpha</label>
      <label><input type="radio" value="b" />Beta</label>
    </ax-radio-list>
    <ax-slider id="slider" label="Volume" value="65"></ax-slider>
    <ax-text-area id="spell-default" label="Default spellcheck"></ax-text-area>
    <ax-text-area id="spell-false" label="Disabled spellcheck" spellcheck="false"></ax-text-area>
  </form>
  <ax-collapsible id="collapsible" trigger="Details">Body</ax-collapsible>
  <ax-dropdown-menu id="menu" button-label="Actions">
    <button type="button" value="first">First</button>
    <button type="button" value="second">Second</button>
  </ax-dropdown-menu>
  <ax-tooltip id="tooltip" content="Helpful context" delay="0"><button type="button">Help</button></ax-tooltip>
  <ax-hover-card id="hover" content="Profile details" delay="0" hide-delay="0"><button type="button">Profile</button></ax-hover-card>
  <ax-toast id="toast"><span slot="body">Saved changes</span></ax-toast>
  <ax-lightbox id="lightbox" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Example"></ax-lightbox>
  <ax-breadcrumbs id="breadcrumbs" separator="›">
    <a href="#home">Home</a>
    <a href="#projects">Projects</a>
    <span>Current</span>
  </ax-breadcrumbs>
  <ax-top-nav id="topnav" label="Primary navigation">
    <span slot="heading">Astryx</span>
    <a slot="start-content" href="#overview" aria-current="page">Overview</a>
    <a slot="start-content" href="#projects">Projects</a>
  </ax-top-nav>`;

function startServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/probe.html') {
      const mode = url.searchParams.get('mode');
      response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
      response.end(
        `<!doctype html><html lang="en"><head><link rel="stylesheet" href="/packages/vanilla/dist/astryx-vanilla.css">${scripts[mode]}</head><body>${body}</body></html>`,
      );
      return;
    }
    const filePath = path.resolve(repoRoot, `.${url.pathname}`);
    if (!filePath.startsWith(`${repoRoot}${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const details = await stat(filePath);
      response.writeHead(200, {
        'content-length': details.size,
        'content-type': 'text/javascript; charset=utf-8',
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

async function settle(page, milliseconds = 80) {
  await page.waitForTimeout(milliseconds);
}

test('WC2a review regressions pass in every bundle load order', async t => {
  const {server, baseURL} = await startServer();
  const browser = await chromium.launch({headless: true});
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });

  const modes = process.env.ASTRYX_ELEMENT_TEST_MODE
    ? [process.env.ASTRYX_ELEMENT_TEST_MODE]
    : Object.keys(scripts);
  for (const mode of modes) {
    await t.test(mode, async () => {
      const page = await browser.newPage();
      const warnings = [];
      const errors = [];
      page.on('console', message => {
        if (message.type() === 'warning') warnings.push(message.text());
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseURL}/probe.html?mode=${mode}`, {
        waitUntil: 'load',
      });
      await page.waitForFunction(() => customElements.get('ax-lightbox'));
      await page.waitForSelector('#lightbox dialog', {state: 'attached'});
      if (mode === 'late-vanilla') {
        await page.addScriptTag({
          url: `${baseURL}/packages/vanilla/dist/astryx-vanilla.js`,
        });
        await settle(page);
      }

      assert.deepEqual(
        await page.locator('#breadcrumbs').evaluate(host => {
          const list = host.querySelector('ol');
          return {
            items: list.querySelectorAll(':scope > li').length,
            nonItems: list.querySelectorAll(':scope > :not(li)').length,
            separators: list.querySelectorAll('.ax-breadcrumbs__separator')
              .length,
          };
        }),
        {items: 3, nonItems: 0, separators: 3},
        `${mode}: Breadcrumbs renders one item and separator per author child`,
      );
      await page.locator('#breadcrumbs').evaluate(host => {
        const link = document.createElement('a');
        link.href = '#added';
        link.textContent = 'Added';
        host.append(link);
      });
      await settle(page);
      assert.deepEqual(
        await page.locator('#breadcrumbs').evaluate(host => {
          const list = host.querySelector('ol');
          return {
            items: list.querySelectorAll(':scope > li').length,
            nonItems: list.querySelectorAll(':scope > :not(li)').length,
            separators: list.querySelectorAll('.ax-breadcrumbs__separator')
              .length,
            last: list.lastElementChild?.textContent
              .replace(/\s+/g, ' ')
              .trim(),
          };
        }),
        {items: 4, nonItems: 0, separators: 4, last: '›Added'},
        `${mode}: dynamically appended Breadcrumbs links are wrapped exactly once`,
      );

      assert.deepEqual(
        await page
          .locator('#topnav .ax-top-nav__items > a')
          .evaluateAll(links =>
            links.map(link => ({
              className: link.className,
              current: link.getAttribute('aria-current'),
            })),
          ),
        [
          {className: 'ax-top-nav__item', current: 'page'},
          {className: 'ax-top-nav__item', current: null},
        ],
        `${mode}: TopNav enhances plain links and preserves aria-current`,
      );

      assert.deepEqual(
        await page.locator('#collapsible details').evaluate(details => ({
          attribute: details.closest('ax-collapsible').hasAttribute('is-open'),
          open: details.open,
        })),
        {attribute: false, open: false},
        `${mode}: bare collapsible starts closed`,
      );
      await page.locator('#collapsible summary').click();
      await settle(page);
      assert.equal(
        await page.locator('#collapsible details').evaluate(node => node.open),
        true,
      );
      assert.equal(
        await page.locator('#collapsible').getAttribute('is-open'),
        '',
      );

      await page.locator('#menu').evaluate(host => {
        window.__menuSelections = [];
        host.addEventListener('astryx:select', event => {
          window.__menuSelections.push(event.detail);
        });
      });
      assert.deepEqual(
        await page
          .locator('#menu button[value]')
          .evaluateAll(items => items.map(item => item.getAttribute('role'))),
        ['menuitem', 'menuitem'],
      );
      await page.locator('#menu [data-ax-dropdown-trigger]').click();
      await settle(page);
      const menuState = await page.locator('#menu').evaluate(host => {
        const menu = host.querySelector('[data-ax-dropdown-menu]');
        return {
          attribute: host.hasAttribute('is-menu-open'),
          dataOpen: menu.dataset.axOpen,
          hidden: menu.hidden,
          popover: menu.matches(':popover-open'),
        };
      });
      assert.deepEqual(
        menuState,
        {attribute: true, dataOpen: 'true', hidden: false, popover: true},
        `${mode}: element owns menu opening`,
      );
      await page.locator('#menu button[value="second"]').click({timeout: 2000});
      await settle(page);
      assert.deepEqual(await page.evaluate(() => window.__menuSelections), [
        {label: 'Second', value: 'second'},
      ]);
      assert.equal(
        await page.locator('#menu').getAttribute('is-menu-open'),
        null,
      );

      await page.locator('#tooltip button').hover();
      await settle(page);
      assert.equal(
        await page
          .locator('#tooltip [role="tooltip"]')
          .evaluate(node => node.hidden),
        false,
      );
      await page.mouse.move(0, 0);
      await settle(page);

      await page.locator('#hover button').focus();
      await settle(page);
      assert.equal(
        await page
          .locator('#hover [data-ax-hover-card-content]')
          .evaluate(node => node.hidden),
        false,
      );
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal(
        await page
          .locator('#hover [data-ax-hover-card-content]')
          .evaluate(node => node.hidden),
        true,
      );

      assert.match(await page.locator('#toast').textContent(), /Saved changes/);
      assert.equal(await page.locator('#toast button').count(), 1);
      await page.locator('#toast').evaluate(host => {
        window.__toastDismissals = [];
        host.addEventListener('astryx:dismiss', event => {
          window.__toastDismissals.push(event.detail);
        });
      });
      await page.locator('#toast [data-ax-toast-dismiss]').click();
      await settle(page);
      assert.equal(
        await page.locator('#toast').evaluate(host => host.hidden),
        true,
      );
      assert.deepEqual(await page.evaluate(() => window.__toastDismissals), [
        {reason: 'manual'},
      ]);

      const slider = page.locator('#slider input');
      await slider.evaluate(input => {
        for (const value of ['66', '67', '68']) {
          input.value = value;
          input.dispatchEvent(new Event('input', {bubbles: true}));
        }
      });
      await settle(page);
      assert.deepEqual(
        await page
          .locator('#slider')
          .evaluate(host =>
            [...host.childNodes]
              .filter(
                node =>
                  node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
              )
              .map(node => node.textContent.trim()),
          ),
        [],
      );
      assert.equal(await page.locator('#slider output').textContent(), '68');

      assert.equal(
        await page
          .locator('#spell-default textarea')
          .evaluate(node => node.spellcheck),
        true,
      );
      assert.equal(
        await page
          .locator('#spell-false textarea')
          .evaluate(node => node.spellcheck),
        false,
      );

      await page.locator('#radio input[value="b"]').click();
      await settle(page);
      assert.equal(await page.locator('#radio').getAttribute('value'), 'b');
      await page.locator('#form').evaluate(form => form.reset());
      await settle(page);
      assert.equal(await page.locator('#radio').getAttribute('value'), 'a');
      assert.equal(
        await page.locator('#radio input[value="a"]').isChecked(),
        true,
      );

      await page.locator('#lightbox [data-ax-lightbox-open]').click();
      await settle(page);
      assert.equal(
        await page.locator('#lightbox dialog').evaluate(node => node.open),
        true,
      );
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal(
        await page.locator('#lightbox dialog').evaluate(node => node.open),
        false,
      );

      assert.equal(
        warnings.some(message => message.includes('spellcheck="false"')),
        false,
      );
      assert.equal(
        warnings.some(message => message.includes('unknown slot "default"')),
        false,
        warnings.join('\n'),
      );
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
});
