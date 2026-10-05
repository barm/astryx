// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, expect, it} from 'vitest';
import {ASSET_DIRS, checkVanillaAssets} from './sync-vanilla-assets.mjs';

describe('bundled vanilla assets', () => {
  it('covers both markup frameworks and their templates', () => {
    expect(ASSET_DIRS).toEqual([
      'markup',
      'templates',
      'elements-markup',
      'elements-templates',
    ]);
  });

  it('matches every available packages/vanilla source directory exactly', () => {
    expect(checkVanillaAssets()).toEqual([]);
  });
});
