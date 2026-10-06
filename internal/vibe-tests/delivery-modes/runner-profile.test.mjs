// Copyright (c) Meta Platforms, Inc. and affiliates.

import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, test} from 'node:test';
import {
  loadRunnerProfile,
  renderProfileArgs,
  validateRunnerProfile,
} from './runner-profile.mjs';

const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('missing profile configuration fails with an actionable message', () => {
  assert.throws(
    () => loadRunnerProfile({env: {}}),
    /VIBE_RUNNER_PROFILE is required.*README\.md/,
  );
  assert.throws(
    () =>
      loadRunnerProfile({
        env: {VIBE_RUNNER_PROFILE: '/path/that/does/not/exist.json'},
      }),
    /Could not read VIBE_RUNNER_PROFILE/,
  );
});

test('missing required fields fail with their schema path', () => {
  assert.throws(
    () => validateRunnerProfile({schema: 1, runners: {}}),
    /runners\.claude/,
  );
});

test('the placeholder-only example satisfies the schema', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const example = JSON.parse(
    fs.readFileSync(path.join(here, 'runner-profile.example.json'), 'utf8'),
  );
  assert.equal(validateRunnerProfile(example), example);
});

test('loads a valid local profile and reports unresolved substitutions', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const example = fs.readFileSync(
    path.join(here, 'runner-profile.example.json'),
    'utf8',
  );
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-profile-'));
  temporaryDirectories.push(directory);
  const profilePath = path.join(directory, 'profile.json');
  fs.writeFileSync(profilePath, example);
  const profile = loadRunnerProfile({
    env: {VIBE_RUNNER_PROFILE: profilePath},
  });
  assert.equal(profile.sourcePath, profilePath);
  assert.deepEqual(
    renderProfileArgs(['--tools', '{{TOOLS}}'], {TOOLS: 'Read'}),
    ['--tools', 'Read'],
  );
  assert.throws(
    () => renderProfileArgs(['{{MISSING}}'], {}),
    /requires value MISSING/,
  );
});
