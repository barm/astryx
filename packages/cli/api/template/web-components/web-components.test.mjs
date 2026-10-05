// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, expect, it} from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  ASTRYX_VANILLA_CDN_PLACEHOLDER,
  ASTRYX_VANILLA_CDN_REF,
} from '../html/html.mjs';
import {templateWebComponents} from './web-components.mjs';

const FIXTURE = path.resolve(
  import.meta.dirname,
  '../../../test/fixtures/vanilla-project',
);

describe('templateWebComponents()', () => {
  it('lists sorted web-component templates', () => {
    expect(
      templateWebComponents(undefined, {cwd: FIXTURE, list: true}),
    ).toEqual({
      type: 'template.web-components.list',
      data: [{id: 'dashboard', file: 'dashboard.html'}],
    });
  });

  it('falls back to the bundled template catalog outside a checkout', () => {
    const outsideCheckout = fs.mkdtempSync(
      path.join(os.tmpdir(), 'astryx-cli-installed-web-templates-'),
    );
    try {
      expect(
        templateWebComponents(undefined, {
          cwd: outsideCheckout,
          list: true,
        }),
      ).toEqual({
        type: 'template.web-components.list',
        data: [
          {id: 'dashboard', file: 'dashboard.html'},
          {id: 'detail-page', file: 'detail-page.html'},
          {id: 'form-two-column', file: 'form-two-column.html'},
          {id: 'kanban-board', file: 'kanban-board.html'},
          {id: 'login', file: 'login.html'},
          {id: 'product-detail', file: 'product-detail.html'},
          {id: 'settings', file: 'settings.html'},
          {id: 'shell-side-nav', file: 'shell-side-nav.html'},
          {id: 'table-filter', file: 'table-filter.html'},
        ],
      });
    } finally {
      fs.rmSync(outsideCheckout, {recursive: true, force: true});
    }
  });

  it('substitutes every CDN placeholder', () => {
    const result = templateWebComponents('dashboard', {cwd: FIXTURE});
    expect(result.type).toBe('template.web-components');
    expect(result.data.cdnRef).toBe(ASTRYX_VANILLA_CDN_REF);
    expect(result.data.source).not.toContain(ASTRYX_VANILLA_CDN_PLACEHOLDER);
    expect(result.data.source).toContain(result.data.cdnBase);
    expect(result.data.source).toContain('<ax-button');
  });

  it('supports an explicit CDN ref', () => {
    const result = templateWebComponents('dashboard', {
      cwd: FIXTURE,
      cdnRef: 'abc1234',
    });
    expect(result.data.cdnBase).toContain('@abc1234/packages/vanilla/dist');
  });
});
