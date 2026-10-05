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
const parityRoot = path.join(packageRoot, 'elements/test/parity');
const parityFiles = (await readdir(parityRoot))
  .filter(file => file.endsWith('.parity.mjs'))
  .sort((left, right) => left.localeCompare(right));
const parityCases = await Promise.all(
  parityFiles.map(async file => (await import(`./parity/${file}`)).default),
);
const referenceNames = new Set(
  (await readdir(path.join(packageRoot, 'markup')))
    .filter(file => file.endsWith('.html'))
    .map(file => path.basename(file, '.html')),
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
    element.removeAttribute('data-ax-owned');
    element.removeAttribute('data-ax-root');
    element.removeAttribute('data-ax-region');
    element.removeAttribute('hidden');
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

test('definitions and parity cases are auto-discovered from per-component files', () => {
  assert.deepEqual(
    definitions.map(definition => definition.name),
    definitionFiles.map(file => path.basename(file, '.element.mjs')),
  );
  assert.equal(
    new Set(definitions.map(definition => definition.tag)).size,
    definitions.length,
  );

  const parityByName = new Map(
    parityCases.map(parityCase => [parityCase.name, parityCase]),
  );
  assert.equal(parityByName.size, parityCases.length);
  for (const definition of definitions) {
    const expectedTag = `ax-${definition.name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()}`;
    assert.equal(definition.tag, expectedTag);
    assert.ok(definition.docs.length > 10);
    assert.ok(definition.examples.length >= 2);
    assert.equal(typeof definition.render, 'function');
    if (referenceNames.has(definition.name)) {
      assert.ok(
        parityByName.has(definition.name),
        `${definition.name} needs its own auto-discovered parity module`,
      );
    }
  }
  for (const parityCase of parityCases) {
    assert.ok(
      definitions.some(definition => definition.name === parityCase.name),
      `${parityCase.name} parity case needs a matching definition`,
    );
  }
});

test('auto-discovered parity cases match the existing BEM references', async () => {
  for (const parityCase of parityCases) {
    const element = await render(
      parityCase.tag,
      parityCase.attributes,
      parityCase.html,
    );
    const reference = await referenceVariant(
      parityCase.name,
      parityCase.variant,
    );
    const referenceDocument = document.createElement('template');
    referenceDocument.innerHTML = reference;
    const actual = parityCase.actualSelector
      ? element.querySelector(parityCase.actualSelector)?.outerHTML
      : element.innerHTML;
    const expected = parityCase.expectedSelector
      ? referenceDocument.content.querySelector(parityCase.expectedSelector)
          ?.outerHTML
      : reference;
    assert.equal(
      canonicalHTML(actual ?? ''),
      canonicalHTML(expected ?? ''),
      parityCase.name,
    );
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

test('generated docs expose complete API contracts', async () => {
  const files = (
    await readdir(path.join(packageRoot, 'elements-markup'))
  ).filter(file => file.endsWith('.html'));
  assert.equal(files.length, definitions.length);
  let totalBytes = 0;
  for (const file of files) {
    const content = await readFile(
      path.join(packageRoot, 'elements-markup', file),
      'utf8',
    );
    totalBytes += Buffer.byteLength(content);
    assert.match(content, /^<!-- docs: /);
    assert.match(content, /<!-- attributes:\n/);
    assert.match(content, /<!-- slots:\n/);
    assert.match(content, /<!-- events:\n/);
    assert.match(
      content,
      /<!-- properties: attrs\/aliases: camelCase properties/,
    );
    assert.ok((content.match(/<!-- variant:/g) ?? []).length >= 2);
  }
  assert.ok(
    totalBytes <= 9_900,
    `generated element docs must stay compact; received ${totalBytes} bytes`,
  );
  const button = await readFile(
    path.join(packageRoot, 'elements-markup/Button.html'),
    'utf8',
  );
  assert.match(button, /label\*:/);
  assert.match(button, /is-disabled \(disabled\):/);
  assert.doesNotMatch(button, /<!-- methods:/);
  assert.doesNotMatch(button, /focus\(\):|click\(\):/);
  const dialog = await readFile(
    path.join(packageRoot, 'elements-markup/Dialog.html'),
    'utf8',
  );
  assert.match(dialog, /is-open \(open\):/);
  assert.match(dialog, /show\(\):/);
  assert.match(dialog, /data-ax-dialog-open/);
});

test('generated gallery includes every opted-in definition example', async () => {
  const gallery = await readFile(
    path.join(packageRoot, 'examples/elements-gallery.html'),
    'utf8',
  );
  for (const definition of definitions) {
    const examples = definition.examples.filter(
      example => example.gallery !== false,
    );
    if (examples.length === 0) continue;
    assert.match(
      gallery,
      new RegExp(`data-gallery-element="${definition.name}"`),
    );
    for (const example of examples) {
      assert.match(
        gallery,
        new RegExp(`data-gallery-example="${example.name}"`),
      );
    }
  }
});

test('bundles and generated registries are self-contained and complete', async () => {
  const [esm, classic, css, registry, runtime] = await Promise.all([
    readFile(path.join(packageRoot, 'dist/astryx-elements.js'), 'utf8'),
    readFile(path.join(packageRoot, 'dist/astryx-elements.classic.js'), 'utf8'),
    readFile(path.join(packageRoot, 'dist/astryx-vanilla.css'), 'utf8'),
    readFile(
      path.join(packageRoot, 'elements/src/index.generated.mjs'),
      'utf8',
    ),
    readFile(path.join(packageRoot, 'elements/src/runtime.mjs'), 'utf8'),
  ]);
  for (const bundle of [esm, classic]) {
    assert.doesNotMatch(bundle, /from\s+["'][^./]/);
    assert.match(bundle, /customElements\.define/);
  }
  for (const definition of definitions) {
    assert.match(css, new RegExp(definition.tag));
    assert.match(registry, new RegExp(definition.name + '\\.element\\.mjs'));
  }
  assert.match(css, /:not\(:defined\)/);
  assert.match(css, /\[hidden\]/);
  assert.match(css, /display: none !important/);
  assert.match(css, /display: contents/);
  assert.doesNotMatch(runtime, /definition\.tag\s*===/);
});
