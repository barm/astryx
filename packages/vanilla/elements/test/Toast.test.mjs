// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input A real Toast element with auto-hide enabled and fake browser timers.
 * @output Deterministic evidence for the deadline and duration-change restart rules.
 * @position Focused timer regression coverage for the experimental Toast element.
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
  import('../src/Toast.element.mjs'),
]);
registerElement(definition);

async function flushRender() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test('Toast auto-hide keeps its deadline across body and type rerenders', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const toast = document.createElement('ax-toast');
  toast.setAttribute('body', 'Saving');
  toast.setAttribute('is-auto-hide', '');
  toast.setAttribute('auto-hide-duration', '1000');
  const events = [];
  toast.addEventListener('astryx:dismiss', event => events.push(event.detail));
  document.body.append(toast);
  await flushRender();

  t.mock.timers.tick(400);
  toast.setAttribute('body', 'Saved');
  await flushRender();
  t.mock.timers.tick(200);
  toast.setAttribute('type', 'error');
  await flushRender();
  t.mock.timers.tick(349);
  assert.equal(toast.hidden, false);
  assert.deepEqual(events, []);

  t.mock.timers.tick(51);
  assert.equal(toast.hidden, true);
  assert.deepEqual(events, [{reason: 'auto'}]);

  toast.show();
  t.mock.timers.tick(400);
  toast.setAttribute('auto-hide-duration', '1200');
  t.mock.timers.tick(1199);
  assert.equal(toast.hidden, false);
  t.mock.timers.tick(1);
  assert.equal(toast.hidden, true);
  assert.deepEqual(events, [{reason: 'auto'}, {reason: 'auto'}]);

  toast.remove();
});
