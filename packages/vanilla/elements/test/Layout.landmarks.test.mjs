// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Layout web-component definition and light-DOM runtime.
 * @output Regression evidence for explicit, non-nested main landmarks.
 * @position Component-owned semantic contract tests for ax-layout.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://example.test/',
});
for (const name of [
  'CustomEvent',
  'Element',
  'Event',
  'HTMLElement',
  'MutationObserver',
  'Node',
  'customElements',
  'document',
]) {
  globalThis[name] = dom.window[name];
}

const [{registerElements}, {default: layoutDefinition}] = await Promise.all([
  import('../src/runtime.mjs'),
  import('../src/Layout.element.mjs'),
]);
registerElements([layoutDefinition]);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function renderLayout(attributes = {}, html = '<p>Content</p>') {
  const layout = document.createElement('ax-layout');
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) layout.setAttribute(name, '');
    else if (value !== false && value !== null)
      layout.setAttribute(name, value);
  }
  layout.innerHTML = html;
  document.body.append(layout);
  await settle();
  return layout;
}

async function captureWarnings(task) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = message => warnings.push(String(message));
  try {
    const value = await task();
    return {value, warnings};
  } finally {
    console.warn = originalWarn;
  }
}

test.afterEach(() => {
  document.body.replaceChildren();
});

test('content has no implicit main landmark', async () => {
  const layout = await renderLayout();
  const content = layout.querySelector('.ax-layout__content');

  assert.equal(content.localName, 'div');
  assert.equal(layout.querySelectorAll('main').length, 0);
});

test('is-main-region explicitly renders the page main landmark', async () => {
  const layout = await renderLayout({'is-main-region': true});
  const content = layout.querySelector('.ax-layout__content');

  assert.equal(content.localName, 'main');
  assert.equal(layout.querySelectorAll('main').length, 1);
});

test('an authored main is never nested inside a generated main', async () => {
  const {value: layout, warnings} = await captureWarnings(() =>
    renderLayout(
      {'is-main-region': true},
      '<main id="authored-main"><p>Authored content</p></main>',
    ),
  );
  const content = layout.querySelector('.ax-layout__content');

  assert.equal(content.localName, 'div');
  assert.equal(layout.querySelectorAll('main').length, 1);
  assert.equal(layout.querySelector('main main'), null);
  assert.equal(layout.querySelector('main').id, 'authored-main');
  assert.equal(
    warnings.filter(message => message.includes('authored <main>')).length,
    1,
  );
});

test('nested is-main-region layouts keep exactly one top-level main', async () => {
  const {value: outer, warnings} = await captureWarnings(() =>
    renderLayout(
      {'is-main-region': true},
      '<ax-layout id="inner" is-main-region><p>Nested content</p></ax-layout>',
    ),
  );
  await settle();

  const inner = outer.querySelector('#inner');
  const innerContent = inner.querySelector('.ax-layout__content');
  assert.equal(outer.querySelectorAll('main').length, 1);
  assert.equal(outer.querySelector('main main'), null);
  assert.equal(innerContent.localName, 'div');
  assert.equal(
    warnings.filter(message =>
      message.includes('nested inside an existing main'),
    ).length,
    1,
  );

  await captureWarnings(async () => {
    inner.setAttribute('height', 'auto');
    await settle();
  });
  assert.equal(outer.querySelectorAll('main').length, 1);
});

test('a role=main ancestor also prevents a nested main', async () => {
  const landmark = document.createElement('div');
  landmark.setAttribute('role', 'main');
  document.body.append(landmark);

  const {value: layout, warnings} = await captureWarnings(async () => {
    const nested = document.createElement('ax-layout');
    nested.setAttribute('is-main-region', '');
    nested.innerHTML = '<p>Nested content</p>';
    landmark.append(nested);
    await settle();
    return nested;
  });

  assert.equal(layout.querySelector('.ax-layout__content').localName, 'div');
  assert.equal(layout.querySelectorAll('main').length, 0);
  assert.equal(
    warnings.filter(message =>
      message.includes('nested inside an existing main'),
    ).length,
    1,
  );
});

test('a separate document main produces one duplicate warning', async () => {
  document.body.append(document.createElement('main'));
  const {value: layout, warnings} = await captureWarnings(() =>
    renderLayout({'is-main-region': true}),
  );

  assert.equal(layout.querySelector('.ax-layout__content').localName, 'main');
  assert.equal(document.querySelectorAll('main').length, 2);
  assert.equal(
    warnings.filter(message => message.includes('another main landmark'))
      .length,
    1,
  );
});
