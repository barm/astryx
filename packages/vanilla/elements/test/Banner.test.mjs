// Copyright (c) Meta Platforms, Inc. and affiliates.

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

const [{registerElement}, {default: definition}] = await Promise.all([
  import('../src/runtime.mjs'),
  import('../src/Banner.element.mjs'),
]);
registerElement(definition);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

test('Banner keeps disclosure state across unrelated attribute renders', async () => {
  const banner = document.createElement('ax-banner');
  banner.setAttribute('title', 'Details');
  banner.setAttribute('collapsible', '');
  banner.setAttribute('is-open', '');
  banner.innerHTML = '<p>Supporting content</p>';
  document.body.append(banner);
  await settle();

  const initialContent = banner.querySelector('.ax-banner__content');
  assert.equal(initialContent.hidden, false);
  banner.setAttribute('status', 'warning');
  await settle();
  assert.equal(banner.querySelector('.ax-banner__content'), initialContent);
  assert.equal(initialContent.hidden, false);

  banner.querySelector('[data-ax-banner-toggle]').click();
  await settle();
  assert.equal(banner.isOpen, false);
  assert.equal(initialContent.hidden, true);
  banner.setAttribute('container', 'section');
  await settle();
  assert.equal(banner.querySelector('.ax-banner__content'), initialContent);
  assert.equal(initialContent.hidden, true);
});

test('Banner emits one dismiss event and hides itself', async () => {
  const banner = document.createElement('ax-banner');
  banner.setAttribute('title', 'Dismiss me');
  banner.setAttribute('is-dismissable', '');
  document.body.append(banner);
  await settle();
  let dismissals = 0;
  banner.addEventListener('astryx:dismiss', () => dismissals++);
  banner.querySelector('[data-ax-banner-dismiss]').click();
  assert.equal(dismissals, 1);
  assert.equal(banner.hidden, true);
});
