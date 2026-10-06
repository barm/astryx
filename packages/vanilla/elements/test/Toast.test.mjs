// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Toast auto-hide attributes and the component timer hook.
 * @output Deterministic evidence that auto-hide dismisses within its 50ms budget.
 * @position Focused timer regression coverage for the experimental Toast element.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import definition from '../src/Toast.element.mjs';

test('Toast auto-hide fires within 50ms of its duration', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const host = {hidden: false};
  const events = [];
  const values = new Map([
    ['is-auto-hide', true],
    ['auto-hide-duration', '1000'],
  ]);
  const api = {
    dispatch(type, detail) {
      events.push({type, detail});
    },
    read(name) {
      return values.get(name);
    },
  };

  definition.hooks.attributeChanged(host, 'is-auto-hide', null, '', api);
  t.mock.timers.tick(949);
  assert.equal(host.hidden, false);
  assert.deepEqual(events, []);

  t.mock.timers.tick(101);
  assert.equal(host.hidden, true);
  assert.deepEqual(events, [
    {type: 'astryx:dismiss', detail: {reason: 'auto'}},
  ]);
  definition.hooks.disconnected(host);
});
