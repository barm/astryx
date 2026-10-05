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
  import('../src/Avatar.element.mjs'),
]);
registerElement(definition);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

test('Avatar fallback state survives unrelated attribute renders', async () => {
  const avatar = document.createElement('ax-avatar');
  avatar.setAttribute('src', '/missing.png');
  avatar.setAttribute('name', 'Ada Lovelace');
  document.body.append(avatar);
  await settle();
  avatar.querySelector('img').dispatchEvent(new Event('error'));
  await settle();
  assert.equal(avatar.querySelector('img'), null);
  assert.equal(avatar.querySelector('.ax-avatar__content').textContent, 'AL');

  avatar.setAttribute('shape', 'rounded');
  await settle();
  assert.equal(avatar.querySelector('img'), null);
  assert.equal(avatar.querySelector('.ax-avatar__content').textContent, 'AL');
  assert.equal(
    avatar.querySelector('.ax-avatar').classList.contains('ax-avatar--rounded'),
    true,
  );
});
