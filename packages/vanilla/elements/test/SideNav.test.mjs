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
  import('../src/SideNav.element.mjs'),
]);
registerElement(definition);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

test('SideNav derives collapsed markup from host state after rerenders', async () => {
  const nav = document.createElement('ax-side-nav');
  nav.setAttribute('is-collapsed', '');
  nav.innerHTML = '<a class="ax-side-nav__item" href="#">Overview</a>';
  document.body.append(nav);
  await settle();
  const root = nav.querySelector('.ax-side-nav');
  assert.equal(root.classList.contains('ax-side-nav--collapsed'), true);

  nav.setAttribute('label', 'Workspace navigation');
  await settle();
  assert.equal(nav.querySelector('.ax-side-nav'), root);
  assert.equal(root.classList.contains('ax-side-nav--collapsed'), true);

  let detail;
  nav.addEventListener('astryx:collapsed-change', event => {
    detail = event.detail;
  });
  assert.equal(nav.toggle(), false);
  assert.deepEqual(detail, {isCollapsed: false});
  assert.equal(root.classList.contains('ax-side-nav--collapsed'), false);
});
