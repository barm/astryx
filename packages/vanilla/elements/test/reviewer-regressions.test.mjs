// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Built Vanilla Astryx bundles and adversarial custom-element mutations.
 * @output Regression evidence for identity, source-of-truth, API, and ownership contracts.
 * @position Permanent Chromium port of the external API-review probes.
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
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
]);

function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://x').pathname,
    );
    if (pathname === '/probe.html') {
      response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
      response.end(globalThis.PROBE_PAGE);
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

function probePage({withVanilla}) {
  return `<!doctype html>
<html data-astryx-theme="neutral" data-theme="light">
<head>
  <link rel="stylesheet" href="/packages/vanilla/dist/astryx-vanilla.css">
  ${withVanilla ? '<script src="/packages/vanilla/dist/astryx-vanilla.js"></script>' : ''}
  <script src="/packages/vanilla/dist/astryx-elements.classic.js"></script>
</head>
<body>
  <form id="f">
    <ax-text-input id="ti" label="Email" description="Private help" status-message="Bad" html-name="email"></ax-text-input>
    <ax-selector id="sel" label="Pick" description="Selector help" html-name="pick" value="b">
      <option value="a">A</option>
      <option value="b">B</option>
    </ax-selector>
    <ax-button id="btn" variant="primary">Save</ax-button>
    <ax-button id="lbl" label="Label API" variant="primary"></ax-button>
    <ax-button id="conflict" label="Attribute label">Child label</ax-button>
    <ax-button id="role" role="link" onclick="window.clicked = (window.clicked || 0) + 1">Inline</ax-button>
    <ax-button id="sb" label="Submit" type="submit"></ax-button>
    <ax-button id="false-bool" label="False boolean" disabled="false"></ax-button>
    <ax-text-input id="aliases" label="Alias" name="alias" required readonly value="x"></ax-text-input>
  </form>
  <ax-card id="card"><h2 slot="header">T</h2><p id="p1">one</p><p id="p2">two</p></ax-card>
  <ax-card id="hid" hidden><p>should be hidden</p></ax-card>
  <ax-card id="c4"><span slot="bogus">unknown slot content</span></ax-card>
  <ax-button id="opener" data-ax-dialog-open="dlg-1">Open</ax-button>
  <ax-dialog id="dlg" dialog-id="dlg-1"><span slot="title">Title</span><p>Body</p><ax-button slot="footer" data-ax-dialog-close>OK</ax-button></ax-dialog>
  <ax-button id="op2">Open second</ax-button>
  <ax-dialog id="d2" title="Second"><p>Body</p></ax-dialog>
  <ax-dialog id="d3" purpose="required" title="Required"><p>Body</p></ax-dialog>
  <ax-dialog id="suggest" title="Suggestion" opened></ax-dialog>
  <ax-tab-list id="tl" value="a" label="Views">
    <ax-tab value="a" panel-id="pa">A</ax-tab>
    <ax-tab value="b" panel-id="pb">B</ax-tab>
    <section slot="panels" id="pa">PA</section>
    <section slot="panels" id="pb">PB</section>
  </ax-tab-list>
</body>
</html>`;
}

async function waitForElements(page) {
  await page.waitForFunction(() => customElements.get('ax-text-input'));
  await page.waitForSelector('#ti input');
  await page.waitForSelector('#tl ax-tab[value="a"] button');
}

async function runProbe(browser, baseURL, withVanilla) {
  globalThis.PROBE_PAGE = probePage({withVanilla});
  const page = await browser.newPage();
  const warnings = [];
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'warning') warnings.push(message.text());
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/probe.html`);
  await waitForElements(page);

  const globals = await page.evaluate(() => ({
    AstryxVanilla: typeof globalThis.AstryxVanilla,
    astryx: typeof globalThis.astryx,
  }));
  assert.equal(globals.AstryxVanilla, withVanilla ? 'object' : 'undefined');
  assert.equal(globals.astryx, withVanilla ? 'object' : 'undefined');

  await page.locator('#ti input').focus();
  await page.keyboard.type('abc');
  const oldInput = await page.locator('#ti input').elementHandle();
  const before = await page.locator('#ti input').evaluate(input => ({
    start: input.selectionStart,
    end: input.selectionEnd,
  }));
  await page
    .locator('#ti')
    .evaluate(host => host.setAttribute('status', 'error'));
  const identity = await page.locator('#ti input').evaluate(
    (input, {oldInput, before}) => ({
      same: input === oldInput,
      focused: document.activeElement === input,
      value: input.value,
      start: input.selectionStart,
      end: input.selectionEnd,
    }),
    {oldInput, before},
  );
  assert.deepEqual(identity, {
    same: true,
    focused: true,
    value: 'abc',
    start: before.start,
    end: before.end,
  });
  await page.keyboard.type('d');
  assert.equal(await page.locator('#ti input').inputValue(), 'abcd');

  const properties = await page.evaluate(() => {
    const ti = document.querySelector('#ti');
    const sel = document.querySelector('#sel');
    const dlg = document.querySelector('#dlg');
    const btn = document.querySelector('#btn');
    return {
      tiValue: ti.value,
      tiName: ti.name,
      tiHasForm: ti.form instanceof HTMLFormElement,
      selValue: sel.value,
      selName: sel.name,
      dlgOpen: dlg.open,
      dlgIsOpen: dlg.isOpen,
      btnDisabled: btn.disabled,
      hasValidity: Boolean(ti.validity),
    };
  });
  assert.deepEqual(properties, {
    tiValue: 'abcd',
    tiName: 'email',
    tiHasForm: true,
    selValue: 'b',
    selName: 'pick',
    dlgOpen: false,
    dlgIsOpen: false,
    btnDisabled: false,
    hasValidity: true,
  });
  await page.locator('#ti').evaluate(host => {
    host.value = 'property';
    host.disabled = true;
  });
  assert.equal(await page.locator('#ti input').inputValue(), 'property');
  assert.equal(await page.locator('#ti input').isDisabled(), true);
  await page.locator('#ti').evaluate(host => {
    host.disabled = false;
    host.focus();
  });
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    'INPUT',
  );

  assert.equal(await page.locator('#lbl button').textContent(), 'Label API');
  assert.equal(
    await page.locator('#conflict button').textContent(),
    'Child label',
  );
  await page.locator('#btn').evaluate(host => {
    host.textContent = 'Saved';
  });
  await page.waitForFunction(
    () => document.querySelector('#btn button')?.textContent === 'Saved',
  );

  await page.locator('#p2').evaluate(node => node.remove());
  await page
    .locator('#card')
    .evaluate(host => host.setAttribute('variant', 'muted'));
  assert.equal(await page.locator('#p2').count(), 0);
  await page.locator('#card').evaluate(host => {
    host.innerHTML = '<p id="p3">three</p>';
  });
  await page.waitForSelector('#card #p3');
  assert.equal(await page.locator('#p1').count(), 0);
  assert.equal(
    await page
      .locator('#hid p')
      .evaluate(node => node.getBoundingClientRect().height > 0),
    false,
  );

  await page.locator('#sel select').evaluate(select => {
    const option = document.createElement('option');
    option.value = 'c';
    option.textContent = 'C';
    select.append(option);
  });
  await page.locator('#sel').evaluate(host => host.setAttribute('size', 'sm'));
  assert.deepEqual(
    await page
      .locator('#sel option')
      .evaluateAll(options => options.map(option => option.value)),
    ['a', 'b', 'c'],
  );
  await page.locator('#sel').evaluate(host => {
    const option = document.createElement('option');
    option.value = 'd';
    option.textContent = 'D';
    host.append(option);
  });
  await page.waitForFunction(
    () => document.querySelectorAll('#sel option').length === 4,
  );
  assert.equal(await page.locator('#sel select').inputValue(), 'b');

  await page.locator('#f').evaluate(form => form.reset());
  await page.waitForFunction(
    () => document.querySelector('#ti').getAttribute('value') === '',
  );
  assert.equal(await page.locator('#ti input').inputValue(), '');
  assert.equal(await page.locator('#sel select').inputValue(), 'b');
  assert.equal(await page.locator('#sel').getAttribute('value'), 'b');

  let tabChanges = 0;
  await page.locator('#tl').evaluate(host => {
    window.tabChanges = 0;
    host.addEventListener('astryx:tab-change', () => window.tabChanges++);
    host.setAttribute('value', 'b');
  });
  await page.waitForFunction(
    () => document.querySelector('#pb').hidden === false,
  );
  assert.equal(await page.locator('#pa').getAttribute('hidden'), '');
  assert.equal(
    await page
      .locator('#tl ax-tab[value="b"] button')
      .getAttribute('aria-selected'),
    'true',
  );
  await page.locator('#tl ax-tab[value="a"] button').click();
  tabChanges = await page.evaluate(() => window.tabChanges);
  assert.equal(tabChanges, 1);
  await page.locator('#tl ax-tab[value="a"] button').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tl').getAttribute('value'), 'b');
  assert.equal(await page.locator('#pb').getAttribute('hidden'), null);

  await page
    .locator('#tl ax-tab[value="b"]')
    .evaluate(host => host.setAttribute('label', 'Bee'));
  await page
    .locator('#tl ax-tab[value="a"]')
    .evaluate(host => host.setAttribute('is-disabled', ''));
  assert.deepEqual(
    await page.locator('#tl [role="tab"]').evaluateAll(tabs =>
      tabs.map(tab => ({
        selected: tab.getAttribute('aria-selected'),
        tabIndex: tab.tabIndex,
        disabled: tab.disabled,
      })),
    ),
    [
      {selected: 'false', tabIndex: -1, disabled: true},
      {selected: 'true', tabIndex: 0, disabled: false},
    ],
  );
  assert.equal(await page.locator('#pb').getAttribute('hidden'), null);

  const adoption = await page.evaluate(async () => {
    const wait = () => new Promise(resolve => setTimeout(resolve, 30));
    const card = document.querySelector('#card').cloneNode(true);
    card.id = 'card-clone';
    document.body.append(card);
    const button = document.querySelector('#btn').cloneNode(true);
    button.id = 'button-clone';
    document.body.append(button);
    const input = document.querySelector('#ti').cloneNode(true);
    input.id = 'input-clone';
    document.body.append(input);
    await wait();

    const holder = document.createElement('div');
    holder.innerHTML = '<ax-card id="round-trip"><p>Round trip</p></ax-card>';
    document.body.append(holder);
    await wait();
    holder.innerHTML = holder.innerHTML;
    await wait();

    const list = document.createElement('div');
    list.innerHTML = '<ax-badge variant="success">Existing</ax-badge>';
    document.body.append(list);
    await wait();
    list.innerHTML += '<ax-badge variant="success">New</ax-badge>';
    await wait();

    return {
      cardRoots: card.querySelectorAll(':scope > [data-ax-root]').length,
      cardArticles: card.querySelectorAll('article').length,
      buttonRoots: button.querySelectorAll(':scope > [data-ax-root]').length,
      buttonControls: button.querySelectorAll('button, a').length,
      inputRoots: input.querySelectorAll(':scope > [data-ax-root]').length,
      inputs: input.querySelectorAll('input').length,
      labels: input.querySelectorAll('label').length,
      inputIDs: [...input.querySelectorAll('[id]')].map(element => element.id),
      roundTripArticles: holder.querySelectorAll('article').length,
      appendedBadges: [...list.querySelectorAll('ax-badge')].map(host => ({
        roots: host.querySelectorAll(':scope > [data-ax-root]').length,
        spans: host.querySelectorAll('span').length,
      })),
    };
  });
  assert.deepEqual(adoption, {
    cardRoots: 1,
    cardArticles: 1,
    buttonRoots: 1,
    buttonControls: 1,
    inputRoots: 1,
    inputs: 1,
    labels: 1,
    inputIDs: [
      'input-clone-description',
      'input-clone-input',
      'input-clone-status',
    ],
    roundTripArticles: 1,
    appendedBadges: [
      {roots: 1, spans: 1},
      {roots: 1, spans: 1},
    ],
  });

  await page.locator('#opener button').click();
  await page.waitForFunction(() => document.querySelector('#dlg dialog').open);
  assert.equal(await page.locator('#dlg').getAttribute('is-open'), '');
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    'ax-dialog__title',
  );
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#dlg').getAttribute('is-open'), null);
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    'Open',
  );

  await page.locator('#dlg').evaluate(host => host.setAttribute('is-open', ''));
  const dialogIdentity = await page.locator('#dlg dialog').elementHandle();
  await page
    .locator('#dlg')
    .evaluate(host => host.setAttribute('variant', 'fullscreen'));
  assert.equal(
    await page
      .locator('#dlg dialog')
      .evaluate((dialog, original) => dialog === original, dialogIdentity),
    true,
  );
  assert.equal(
    await page.locator('#dlg dialog').evaluate(dialog => dialog.open),
    true,
  );
  await page.locator('#dlg').evaluate(host => host.removeAttribute('is-open'));
  assert.equal(
    await page.locator('#dlg dialog').evaluate(dialog => dialog.open),
    false,
  );

  await page.locator('#op2 button').click();
  await page.locator('#d2').evaluate(host => host.show());
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    'ax-dialog__title',
  );
  await page.locator('#d2').evaluate(host => host.close());
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    'Open second',
  );
  await page.locator('#d3').evaluate(host => host.show());
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('#d3 dialog').evaluate(dialog => dialog.open),
    true,
  );
  assert.equal(await page.locator('#d3 [data-ax-dialog-close]').count(), 0);
  await page.locator('#d3').evaluate(host => host.close());

  await page.evaluate(() => {
    window.submitted = 0;
    document.querySelector('#f').addEventListener('submit', event => {
      event.preventDefault();
      window.submitted++;
    });
    document.querySelector('#sb').click();
  });
  assert.equal(await page.evaluate(() => window.submitted), 1);
  await page.locator('#role button').click();
  assert.equal(await page.evaluate(() => window.clicked), 1);

  const createFlow = await page.evaluate(async () => {
    const card = document.createElement('ax-card');
    document.body.append(card);
    const heading = document.createElement('h3');
    heading.slot = 'header';
    heading.textContent = 'H';
    card.append(heading);
    const body = document.createElement('p');
    body.textContent = 'B';
    card.append(body);
    await new Promise(resolve => setTimeout(resolve, 30));
    return {
      heading: card.querySelector('header')?.textContent,
      body: card.querySelector('.ax-card__body')?.textContent,
    };
  });
  assert.deepEqual(createFlow, {heading: 'H', body: 'B'});

  const inputSnapshot = await page.locator('#ti').ariaSnapshot();
  const selectSnapshot = await page.locator('#sel').ariaSnapshot();
  assert.match(inputSnapshot, /textbox "Email"/);
  assert.doesNotMatch(inputSnapshot, /textbox "Email Private help/);
  assert.match(selectSnapshot, /combobox "Pick"/);
  assert.doesNotMatch(selectSnapshot, /combobox "Pick Selector help/);
  assert.equal(
    await page
      .locator('#ti')
      .evaluate(
        host =>
          host.querySelector('label').htmlFor ===
          host.querySelector('input').id,
      ),
    true,
  );

  assert.ok(warnings.some(message => message.includes('slotted content wins')));
  assert.ok(warnings.some(message => message.includes('unknown slot "bogus"')));
  assert.ok(
    warnings.some(message => message.includes('Did you mean "is-open"')),
  );
  assert.ok(warnings.some(message => message.includes('disabled="false"')));
  for (const attribute of ['role', 'onclick', 'name', 'required', 'readonly']) {
    assert.equal(
      warnings.some(message =>
        message.includes(`unknown attribute "${attribute}"`),
      ),
      false,
    );
  }
  assert.deepEqual(errors, []);
  await page.close();
}

test('reviewer probes pass with and without the progressive-enhancement bundle', async t => {
  const {server, baseURL} = await startServer();
  const browser = await chromium.launch({headless: true});
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });
  await runProbe(browser, baseURL, true);
  await runProbe(browser, baseURL, false);
});
