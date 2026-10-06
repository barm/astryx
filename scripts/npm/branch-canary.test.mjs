// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Unit tests for guarded branch-canary package planning and stamping.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  DEFAULT_ALLOWED_REF,
  getBaseVersion,
  parseArgs,
  stampWorkspace,
  validateRequest,
} from './branch-canary.mjs';

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const roots = [];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readManifest(root, name) {
  return JSON.parse(
    fs.readFileSync(path.join(root, 'packages', name, 'package.json'), 'utf8'),
  );
}

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astryx-branch-canary-'));
  roots.push(root);
  fs.writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/*'\n",
  );
  writeJson(path.join(root, 'packages/core/package.json'), {
    name: '@astryxdesign/core',
    version: '0.6.5-next.2',
  });
  writeJson(path.join(root, 'packages/cli/package.json'), {
    name: '@astryxdesign/cli',
    version: '0.6.5',
    dependencies: {'@astryxdesign/core': '*'},
    devDependencies: {'@astryxdesign/lab': '*'},
  });
  writeJson(path.join(root, 'packages/vanilla/package.json'), {
    name: '@astryxdesign/vanilla',
    version: '0.0.0',
    private: true,
  });
  writeJson(path.join(root, 'packages/lab/package.json'), {
    name: '@astryxdesign/lab',
    version: '0.1.9',
    private: true,
    astryx: {canaryOnly: true},
  });
  writeJson(path.join(root, 'packages/experimental/package.json'), {
    name: '@astryxdesign/experimental',
    version: '0.1.0',
    astryx: {canaryOnly: true},
  });
  writeJson(path.join(root, 'packages/external/package.json'), {
    name: 'example-external-package',
    version: '1.0.0',
  });
  return root;
}

function request(overrides = {}) {
  return {
    ref: DEFAULT_ALLOWED_REF,
    allowedRef: DEFAULT_ALLOWED_REF,
    channel: 'vanilla-poc',
    sha: SHA,
    ...overrides,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

describe('validateRequest', () => {
  it('accepts the dedicated POC ref and a non-reserved channel', () => {
    expect(validateRequest(request())).toMatchObject({
      channel: 'vanilla-poc',
      shortSha: 'abcdef0',
    });
  });

  it.each(['refs/heads/main', 'refs/heads/release/v0.6.6'])(
    'refuses protected ref %s',
    ref => {
      expect(() => validateRequest(request({ref}))).toThrow(
        'refuses protected release ref',
      );
    },
  );

  it('refuses every other branch', () => {
    expect(() =>
      validateRequest(request({ref: 'refs/heads/feature/other'})),
    ).toThrow(`may run only from ${DEFAULT_ALLOWED_REF}`);
  });

  it.each(['latest', 'canary', 'next', 'bootstrap', 'beta', 'rc'])(
    'refuses reserved channel %s',
    channel => {
      expect(() => validateRequest(request({channel}))).toThrow('is reserved');
    },
  );

  it.each(['Vanilla', 'vanilla.poc', '-vanilla', ''])(
    'refuses malformed channel %s',
    channel => {
      expect(() => validateRequest(request({channel}))).toThrow(
        'channel must start with a lowercase letter',
      );
    },
  );

  it('requires a commit-like SHA', () => {
    expect(() => validateRequest(request({sha: 'abc123'}))).toThrow(
      '7 to 40 lowercase hexadecimal',
    );
  });
});

describe('stampWorkspace', () => {
  it('stamps only public non-canary-only packages by default', () => {
    const root = makeWorkspace();
    const plan = stampWorkspace({root, ...request()});
    const version = '0.6.5-vanilla-poc.abcdef0';

    expect(plan.packages.map(pkg => pkg.spec)).toEqual([
      `@astryxdesign/cli@${version}`,
      `@astryxdesign/core@${version}`,
    ]);
    expect(readManifest(root, 'core').version).toBe(version);
    expect(readManifest(root, 'cli')).toMatchObject({
      version,
      dependencies: {'@astryxdesign/core': version},
      devDependencies: {'@astryxdesign/lab': '*'},
    });
    expect(readManifest(root, 'vanilla')).toMatchObject({
      version: '0.0.0',
      private: true,
    });
    expect(readManifest(root, 'lab')).toMatchObject({
      version: '0.1.9',
      private: true,
      astryx: {canaryOnly: true},
    });
    expect(readManifest(root, 'experimental')).toMatchObject({
      version: '0.1.0',
      astryx: {canaryOnly: true},
    });
  });

  it('admits private packages only through the explicit include list', () => {
    const root = makeWorkspace();
    const plan = stampWorkspace({
      root,
      ...request(),
      includePackages: ['@astryxdesign/lab', '@astryxdesign/vanilla'],
    });
    const version = '0.6.5-vanilla-poc.abcdef0';

    expect(plan.packages.map(pkg => pkg.name)).toEqual([
      '@astryxdesign/cli',
      '@astryxdesign/core',
      '@astryxdesign/lab',
      '@astryxdesign/vanilla',
    ]);
    expect(readManifest(root, 'lab')).not.toHaveProperty('private');
    expect(readManifest(root, 'lab').version).toBe(version);
    expect(readManifest(root, 'vanilla')).not.toHaveProperty('private');
  });

  it('fails before writing when the request is invalid', () => {
    const root = makeWorkspace();
    const original = readManifest(root, 'core');

    expect(() =>
      stampWorkspace({root, ...request({ref: 'refs/heads/main'})}),
    ).toThrow('refuses protected release ref');
    expect(readManifest(root, 'core')).toEqual(original);
  });

  it('rejects explicit packages outside the workspace', () => {
    const root = makeWorkspace();
    expect(() =>
      stampWorkspace({
        root,
        ...request(),
        includePackages: ['@astryxdesign/missing'],
      }),
    ).toThrow('is not in this workspace');
  });
});

describe('argument and version parsing', () => {
  it('uses the stable core base for prerelease versions', () => {
    expect(getBaseVersion('0.6.5-next.2')).toBe('0.6.5');
  });

  it('parses repeated explicit package includes', () => {
    expect(
      parseArgs([
        'stamp',
        '--ref',
        DEFAULT_ALLOWED_REF,
        '--channel',
        'vanilla-poc',
        '--sha',
        SHA,
        '--output',
        'plan.json',
        '--include-package',
        '@astryxdesign/vanilla',
        '--include-package',
        '@astryxdesign/lab',
      ]),
    ).toMatchObject({
      command: 'stamp',
      values: {
        'include-package': ['@astryxdesign/vanilla', '@astryxdesign/lab'],
      },
    });
  });
});
