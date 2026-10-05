// Copyright (c) Meta Platforms, Inc. and affiliates.

import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://example.test/',
});
for (const name of [
  'CustomEvent',
  'Element',
  'Event',
  'FormData',
  'HTMLDialogElement',
  'HTMLElement',
  'MutationObserver',
  'Node',
  'customElements',
  'document',
]) {
  globalThis[name] = dom.window[name];
}

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

const {registerElements} = await import('../src/runtime.mjs');
const definitionFiles = (await readdir(path.join(packageRoot, 'elements/src')))
  .filter(file => file.endsWith('.element.mjs'))
  .sort((left, right) => left.localeCompare(right));
const definitions = await Promise.all(
  definitionFiles.map(async file => (await import(`../src/${file}`)).default),
);
registerElements(definitions);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

function canonicalHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const element of template.content.querySelectorAll('*')) {
    element.removeAttribute('slot');
    element.removeAttribute('for');
    element.removeAttribute('id');
    element.removeAttribute('aria-controls');
    element.removeAttribute('aria-describedby');
    element.removeAttribute('aria-labelledby');
    element.removeAttribute('aria-orientation');
    element.removeAttribute('tabindex');
    element.removeAttribute('data-ax-selected');
  }
  for (const titleSlot of template.content.querySelectorAll(
    '.ax-dialog__title > span',
  )) {
    titleSlot.replaceWith(...titleSlot.childNodes);
  }
  for (const tab of template.content.querySelectorAll('ax-tab')) {
    tab.replaceWith(...tab.childNodes);
  }
  for (const panels of template.content.querySelectorAll(
    '[data-ax-panel-host]',
  )) {
    panels.replaceWith(...panels.childNodes);
  }
  for (const text of [
    ...(() => {
      const nodes = [];
      const walker = document.createTreeWalker(
        template.content,
        dom.window.NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) nodes.push(walker.currentNode);
      return nodes;
    })(),
  ]) {
    text.textContent = text.textContent.replace(/\s+/g, ' ').trim();
  }
  return template.innerHTML.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

async function referenceVariant(name, variant) {
  const source = await readFile(
    path.join(packageRoot, 'markup', `${name}.html`),
    'utf8',
  );
  const marker = `<!-- variant: ${variant} -->`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} has ${variant} reference variant`);
  const bodyStart = start + marker.length;
  const next = source.indexOf('<!-- variant:', bodyStart);
  return source.slice(bodyStart, next === -1 ? undefined : next).trim();
}

async function render(tag, attributes = {}, html = '') {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) element.setAttribute(name, '');
    else if (value !== false && value !== null)
      element.setAttribute(name, value);
  }
  element.innerHTML = html;
  document.body.append(element);
  await settle();
  return element;
}

test('definitions are complete single sources with two examples each', () => {
  assert.equal(definitions.length, 9);
  assert.deepEqual(
    definitions.map(definition => definition.tag),
    [
      'ax-badge',
      'ax-button',
      'ax-card',
      'ax-dialog',
      'ax-layout',
      'ax-selector',
      'ax-tab',
      'ax-tab-list',
      'ax-text-input',
    ],
  );
  for (const definition of definitions) {
    assert.ok(definition.docs.length > 10);
    assert.ok(definition.examples.length >= 2);
    assert.equal(typeof definition.render, 'function');
  }
});

test('rendered native roots match the existing BEM reference variants', async () => {
  const cases = [
    [
      'Button',
      'primary',
      await render('ax-button', {variant: 'primary'}, 'Continue'),
    ],
    [
      'TextInput',
      'default',
      await render('ax-text-input', {
        label: 'Project name',
        'html-name': 'project',
        placeholder: 'Astryx',
      }),
    ],
    [
      'Card',
      'default',
      await render(
        'ax-card',
        {},
        '<h2 class="ax-heading ax-heading--3" slot="header">Card title</h2><p class="ax-text">Card content</p>',
      ),
    ],
    [
      'Badge',
      'success',
      await render('ax-badge', {variant: 'success'}, 'Ready'),
    ],
    [
      'Layout',
      'page-shell',
      await render(
        'ax-layout',
        {},
        '<h1 class="ax-heading ax-heading--1" slot="header">Page title</h1><p class="ax-text">Page content</p><span class="ax-text ax-text--supporting" slot="footer">Footer</span>',
      ),
    ],
    [
      'Dialog',
      'confirmation',
      await render(
        'ax-dialog',
        {'dialog-id': 'confirm-dialog'},
        '<span slot="title">Archive project?</span><p class="ax-text">You can restore this project later.</p><button class="ax-button ax-button--ghost" type="button" data-ax-dialog-close slot="footer">Cancel</button><button class="ax-button ax-button--primary" type="button" data-ax-dialog-close slot="footer">Archive</button>',
      ),
    ],
    [
      'TabList',
      'panels',
      await render(
        'ax-tab-list',
        {label: 'Project views', value: 'overview'},
        '<ax-tab value="overview" panel-id="panel-overview">Overview</ax-tab><ax-tab value="activity" panel-id="panel-activity">Activity</ax-tab><ax-tab value="settings" panel-id="panel-settings">Settings</ax-tab><div class="ax-tab-panel" slot="panels" id="panel-overview" role="tabpanel">Overview content</div><div class="ax-tab-panel" slot="panels" id="panel-activity" role="tabpanel">Activity content</div><div class="ax-tab-panel" slot="panels" id="panel-settings" role="tabpanel">Settings content</div>',
      ),
    ],
    [
      'Selector',
      'default',
      await render(
        'ax-selector',
        {
          label: 'Workspace',
          'html-name': 'workspace',
          description: 'Choose where this project belongs.',
        },
        '<option>Design systems</option><option>Developer tools</option><option>Business platform</option>',
      ),
    ],
  ];

  for (const [name, variant, element] of cases) {
    const reference = await referenceVariant(name, variant);
    let actual = element.innerHTML;
    if (name === 'Dialog') {
      const dialog = element.querySelector('dialog');
      actual = dialog?.outerHTML ?? actual;
      const referenceDocument = document.createElement('template');
      referenceDocument.innerHTML = reference;
      actual = canonicalHTML(actual);
      const expectedDialog = referenceDocument.content.querySelector('dialog');
      assert.equal(actual, canonicalHTML(expectedDialog.outerHTML), name);
      continue;
    }
    if (name === 'TabList') {
      assert.equal(canonicalHTML(actual), canonicalHTML(reference), name);
      continue;
    }
    assert.equal(canonicalHTML(actual), canonicalHTML(reference), name);
  }
});

test('attribute rerenders preserve authored child nodes', async () => {
  const child = document.createElement('p');
  child.textContent = 'Persistent content';
  const card = document.createElement('ax-card');
  card.append(child);
  document.body.append(card);
  await settle();
  card.setAttribute('elevation', 'low');
  await settle();
  assert.equal(card.querySelector('p'), child);
  assert.match(card.innerHTML, /ax-card--elevation-low/);
});

test('unknown attributes and invalid enums warn once per element and attribute', async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = message => warnings.push(message);
  try {
    const button = await render('ax-button', {
      mystery: 'one',
      variant: 'impossible',
    });
    button.setAttribute('mystery', 'two');
    button.setAttribute('variant', 'also-impossible');
    await settle();
    assert.equal(
      warnings.filter(message => message.includes('mystery')).length,
      1,
    );
    assert.equal(
      warnings.filter(message => message.includes('variant')).length,
      1,
    );
    assert.match(button.innerHTML, /ax-button--secondary/);
  } finally {
    console.warn = originalWarn;
  }
});

test('native value events reflect to hosts and submit through a form', async () => {
  const form = document.createElement('form');
  form.innerHTML = `
    <ax-text-input label="Project" html-name="project" value="Astryx"></ax-text-input>
    <ax-selector label="Workspace" html-name="workspace" value="tools">
      <option value="design">Design systems</option>
      <option value="tools">Developer tools</option>
    </ax-selector>`;
  document.body.append(form);
  await settle();
  const textHost = form.querySelector('ax-text-input');
  const input = textHost.querySelector('input');
  input.value = 'Elements';
  input.dispatchEvent(new Event('input', {bubbles: true}));
  assert.equal(textHost.getAttribute('value'), 'Elements');
  const selector = form.querySelector('ax-selector');
  const select = selector.querySelector('select');
  select.value = 'design';
  select.dispatchEvent(new Event('change', {bubbles: true}));
  assert.equal(selector.getAttribute('value'), 'design');
  const data = new FormData(form);
  assert.equal(data.get('project'), 'Elements');
  assert.equal(data.get('workspace'), 'design');
});

test('generated docs expose attribute and slot contracts', async () => {
  const files = (
    await readdir(path.join(packageRoot, 'elements-markup'))
  ).filter(file => file.endsWith('.html'));
  assert.equal(files.length, definitions.length);
  for (const file of files) {
    const content = await readFile(
      path.join(packageRoot, 'elements-markup', file),
      'utf8',
    );
    assert.match(content, /^<!-- docs: /);
    assert.match(content, /<!-- attributes:\n/);
    assert.ok((content.match(/<!-- variant:/g) ?? []).length >= 2);
  }
});

test('bundles are self-contained and base CSS guards undefined hosts', async () => {
  const [esm, classic, css] = await Promise.all([
    readFile(path.join(packageRoot, 'dist/astryx-elements.js'), 'utf8'),
    readFile(path.join(packageRoot, 'dist/astryx-elements.classic.js'), 'utf8'),
    readFile(path.join(packageRoot, 'dist/astryx-vanilla.css'), 'utf8'),
  ]);
  for (const bundle of [esm, classic]) {
    assert.doesNotMatch(bundle, /from\s+["'][^./]/);
    assert.match(bundle, /customElements\.define/);
  }
  assert.match(css, /ax-button/);
  assert.match(css, /:not\(:defined\)/);
  assert.match(css, /display: contents/);
});
