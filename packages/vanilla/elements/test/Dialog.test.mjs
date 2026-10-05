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
  'HTMLDialogElement',
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
  import('../src/Dialog.element.mjs'),
]);
registerElement(definition);

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

test('Dialog consumes title without leaving a native host tooltip', async () => {
  const dialog = document.createElement('ax-dialog');
  dialog.setAttribute('title', 'Archive project?');
  dialog.innerHTML = '<p>You can restore this project later.</p>';
  document.body.append(dialog);
  await settle();

  assert.equal(dialog.getAttribute('title'), null);
  assert.equal(dialog.getAttribute('data-ax-title'), 'Archive project?');
  assert.equal(
    dialog.querySelector('.ax-dialog__title').textContent,
    'Archive project?',
  );

  dialog.setAttribute('title', 'Delete project?');
  await settle();
  assert.equal(dialog.getAttribute('title'), null);
  assert.equal(dialog.getAttribute('data-ax-title'), 'Delete project?');
  assert.equal(
    dialog.querySelector('.ax-dialog__title').textContent,
    'Delete project?',
  );
});
