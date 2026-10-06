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
  const layout = await renderLayout(
    {'is-main-region': true},
    '<main id="authored-main"><p>Authored content</p></main>',
  );
  const content = layout.querySelector('.ax-layout__content');

  assert.equal(content.localName, 'div');
  assert.equal(layout.querySelectorAll('main').length, 1);
  assert.equal(layout.querySelector('main main'), null);
  assert.equal(layout.querySelector('main').id, 'authored-main');
});
