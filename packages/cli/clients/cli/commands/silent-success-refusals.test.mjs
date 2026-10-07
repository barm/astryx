// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Tests for CLI strictness fixes that turn a silent false success into a
 * real error. IFIX-0007: invalid input that used to silently succeed.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {runCli} from '../../../test-utils/run-cli.mjs';

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astryx-strict-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'scratch',
      version: '1.0.0',
      dependencies: {'@astryxdesign/core': '0.6.3'},
    }),
  );
  const core = path.join(dir, 'node_modules', '@astryxdesign', 'core');
  fs.mkdirSync(core, {recursive: true});
  fs.writeFileSync(
    path.join(core, 'package.json'),
    JSON.stringify({name: '@astryxdesign/core', version: '0.6.3'}),
  );
});

afterEach(() => fs.rmSync(dir, {recursive: true, force: true}));

/** @param {string[]} args */
const json = async args => {
  const {status, stdout} = await runCli(['--json', ...args], {cwd: dir});
  return {status, body: JSON.parse(stdout)};
};

describe('refuse invalid input that used to silently succeed (IFIX-0007)', () => {
  it('template --list --type bogus exits 1', async () => {
    const {status, body} = await json(['template', '--list', '--type', 'bogus']);
    expect(status).toBe(1);
    expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    expect(body.error).toContain('bogus');
  });

  it('template --list --package @nope/x exits 1', async () => {
    const {status, body} = await json([
      'template',
      '--list',
      '--package',
      '@nope/x',
    ]);
    expect(status).toBe(1);
    expect(body.code).toBe('ERR_INVALID_ARGUMENT');
  });

  it('build --type doc exits 1', async () => {
    const {status, body} = await json(['build', 'pricing', '--type', 'doc']);
    expect(status).toBe(1);
    expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    expect(body.error).toContain('doc');
  });

  it('build --limit 2.5 exits 1', async () => {
    const {status, body} = await json(['build', 'pricing', '--limit', '2.5']);
    expect(status).toBe(1);
    expect(body.code).toBe('ERR_INVALID_ARGUMENT');
  });

  it('integration add with excess args exits 1', async () => {
    // Create a package that looks like an integration dir
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({name: '@test/pkg', version: '1.0.0'}),
    );
    const {status, body} = await json([
      'integration',
      'add',
      'agent-doc',
      'Run',
      'acme',
      'verify',
    ]);
    expect(status).toBe(1);
    // Commander's excess-arg error
    expect(body.code).toBeDefined();
  });
});
