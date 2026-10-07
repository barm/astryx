// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Tests for IFIX-0008: validate/verify commands fail when there is
 * nothing to validate, instead of exiting 0 with "no problems".
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {runCli} from '../../../test-utils/run-cli.mjs';

let dir;

beforeEach(() => {
  // A bare directory with no package.json
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astryx-no-pkg-'));
});

afterEach(() => fs.rmSync(dir, {recursive: true, force: true}));

/** @param {string[]} args */
const json = async args => {
  const {status, stdout} = await runCli(['--json', ...args], {cwd: dir});
  let body;
  try {
    body = JSON.parse(stdout);
  } catch {
    body = {raw: stdout};
  }
  return {status, body};
};

describe('validate commands fail when there is nothing to validate (IFIX-0008)', () => {
  it('doctor integration validate exits 1 with no package.json', async () => {
    const {status} = await json(['doctor', 'integration', 'validate']);
    expect(status).toBe(1);
  });

  it('integration verify exits 1 with no package.json', async () => {
    const {status, body} = await json(['integration', 'verify']);
    expect(status).toBe(1);
    expect(body.code).toBe('ERR_INVALID_ARGUMENT');
  });
});
