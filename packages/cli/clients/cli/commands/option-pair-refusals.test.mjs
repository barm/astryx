// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Tests for the option-pair refusals required by AST-042 FR5.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {runCli} from '../../../test-utils/run-cli.mjs';

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astryx-option-pair-'));
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

describe('option-pair refusals (AST-042 FR5)', () => {
  describe('template', () => {
    it('--list + <name> is refused', async () => {
      const {status, body} = await json(['template', 'ai-chat', '--list']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--list + --skeleton is refused', async () => {
      const {status, body} = await json(['template', '--list', '--skeleton']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--cdn + --list is refused', async () => {
      const {status, body} = await json(['template', '--cdn', '--list']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--cdn + <name> is refused', async () => {
      const {status, body} = await json(['template', 'ai-chat', '--cdn']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--skeleton + --overwrite is refused', async () => {
      const {status, body} = await json([
        'template', 'ai-chat', '--skeleton', '--overwrite',
      ]);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });
  });

  describe('upgrade', () => {
    it('--list + --from is refused', async () => {
      const {status, body} = await json(['upgrade', '--list', '--from', '0.5.0']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--list + --force is refused', async () => {
      const {status, body} = await json(['upgrade', '--list', '--force']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });
  });

  describe('init', () => {
    it('--remove-agents + --features is refused', async () => {
      const {status, body} = await json(['init', '--remove-agents', '--features', 'agents']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--remove-agents + --all is refused', async () => {
      const {status, body} = await json(['init', '--remove-agents', '--all']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });

    it('--all + --features is refused', async () => {
      const {status, body} = await json(['init', '--all', '--features', 'agents']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });
  });

  describe('gap-report', () => {
    it('--list-categories + component is refused', async () => {
      const {status, body} = await json(['gap-report', 'Button', '--list-categories']);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });
  });

  describe('layout', () => {
    it('expression + --file is refused', async () => {
      const tmpFile = path.join(dir, 'expr.txt');
      fs.writeFileSync(tmpFile, 'Stack { Button }');
      const {status, body} = await json(['layout', 'expand', 'Stack { Button }', '--file', tmpFile]);
      expect(status).toBe(1);
      expect(body.code).toBe('ERR_INVALID_ARGUMENT');
    });
  });
});
