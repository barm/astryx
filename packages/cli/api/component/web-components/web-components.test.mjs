// Copyright (c) Meta Platforms, Inc. and affiliates.

import {describe, expect, it} from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {componentWebComponents} from './web-components.mjs';

const FIXTURE = path.resolve(
  import.meta.dirname,
  '../../../test/fixtures/vanilla-project',
);

describe('componentWebComponents()', () => {
  it('lists sorted web-component markup files', () => {
    expect(
      componentWebComponents(undefined, {cwd: FIXTURE, list: true}),
    ).toEqual({
      type: 'component.web-components.list',
      data: [{name: 'Button', file: 'Button.html'}],
    });
  });

  it('falls back to bundled web-component markup outside a checkout', () => {
    const outsideCheckout = fs.mkdtempSync(
      path.join(os.tmpdir(), 'astryx-cli-installed-web-components-'),
    );
    try {
      const result = componentWebComponents('Button', {cwd: outsideCheckout});
      expect(result.type).toBe('component.web-components');
      expect(result.data.source).toContain('<!-- attributes:');
      expect(result.data.source).toContain('<ax-button');
    } finally {
      fs.rmSync(outsideCheckout, {recursive: true, force: true});
    }
  });

  it('returns generated docs and ax-* markup verbatim', () => {
    const result = componentWebComponents('Button', {cwd: FIXTURE});
    expect(result.type).toBe('component.web-components');
    expect(result.data.source).toContain('<!-- attributes:');
    expect(result.data.source).toContain('<ax-button');
  });

  it('rejects traversal-shaped names', () => {
    expect(() => componentWebComponents('../Button', {cwd: FIXTURE})).toThrow(
      /Invalid vanilla component name/,
    );
  });
});
