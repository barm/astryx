// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file Branch-canary package planning and version stamping.
 *
 * @input  workflow ref, allowed channel, commit SHA, workspace manifests, optional package allowlist, npm registry
 * @output fail-closed package plan, registry-existence checks, plus ephemeral manifest version/dependency updates
 * @position release helper — invoked only by the branch-canary release job
 */

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {expandWorkspaceDirs} from '../lib/workspace-globs.mjs';

export const DEFAULT_ALLOWED_REF = 'refs/heads/poc/vanilla-astryx';
export const ALLOWED_CHANNELS = Object.freeze(['vanilla-poc']);

const CHANNEL_RE = /^[a-z][a-z0-9-]*$/;
const SHA_RE = /^[0-9a-f]{7,40}$/;
const BASE_VERSION_RE = /^\d+\.\d+\.\d+$/;
const INTERNAL_SCOPE = '@astryxdesign/';
const NPM_REGISTRY = 'https://registry.npmjs.org';
const DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
  'devDependencies',
];
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function usage() {
  return `Usage:
  node scripts/npm/branch-canary.mjs validate --ref <ref> --channel <channel> --sha <sha>
  node scripts/npm/branch-canary.mjs stamp --ref <ref> --channel <channel> --sha <sha> --output <file> [options]
  node scripts/npm/branch-canary.mjs exists --name <package> --version <version>

Options:
  --allowed-ref <ref>       Exact branch ref allowed to publish. Default: ${DEFAULT_ALLOWED_REF}
  --include-package <name>  Explicitly include one private/canary-only package. Repeatable.
  --root <path>             Repository root. Defaults to this checkout.
  --output <file>           JSON package plan written by the stamp command.
  --name <package>          Package name checked by the exists command.
  --version <version>       Exact package version checked by the exists command.
  --help                    Show this help.
`;
}

function required(values, key) {
  const value = values[key];
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const values = {
    'allowed-ref': DEFAULT_ALLOWED_REF,
    'include-package': [],
    root: ROOT,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key === '--help' || key === '-h') {
      values.help = true;
      continue;
    }
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${key} must be followed by a value`);
    }
    const name = key.slice(2);
    if (name === 'include-package') values[name].push(value);
    else values[name] = value;
    index += 1;
  }

  return {command, values};
}

export function validateRequest({
  ref,
  allowedRef,
  channel,
  sha,
  allowedChannels = ALLOWED_CHANNELS,
}) {
  if (ref === 'refs/heads/main' || ref.startsWith('refs/heads/release/')) {
    throw new Error(`branch-canary refuses protected release ref ${ref}`);
  }
  if (ref !== allowedRef) {
    throw new Error(
      `branch-canary may run only from ${allowedRef}; got ${ref}`,
    );
  }
  if (!CHANNEL_RE.test(channel ?? '')) {
    throw new Error(
      'channel must start with a lowercase letter and contain only lowercase letters, digits, or hyphens',
    );
  }
  if (!allowedChannels.includes(channel)) {
    throw new Error(
      `channel "${channel}" is not allowed; expected one of: ${allowedChannels.join(', ')}`,
    );
  }
  if (!SHA_RE.test(sha ?? '')) {
    throw new Error(
      'sha must contain 7 to 40 lowercase hexadecimal characters',
    );
  }

  return {ref, allowedRef, channel, sha, shortSha: sha.slice(0, 7)};
}

export function packageVersionExists({name, version, run = execFileSync}) {
  try {
    const publishedVersion = run(
      'npm',
      ['view', `${name}@${version}`, 'version', '--registry', NPM_REGISTRY],
      {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']},
    );
    return String(publishedVersion).trim() === version;
  } catch {
    return false;
  }
}

export function getBaseVersion(version) {
  const base = String(version ?? '').split(/[+-]/, 1)[0];
  if (!BASE_VERSION_RE.test(base)) {
    throw new Error(`core version must have an X.Y.Z base; got "${version}"`);
  }
  return base;
}

function readWorkspaceManifests(root) {
  return expandWorkspaceDirs(root)
    .map(dir => ({dir, file: path.join(dir, 'package.json')}))
    .filter(({file}) => fs.existsSync(file))
    .map(({dir, file}) => ({
      dir,
      file,
      manifest: JSON.parse(fs.readFileSync(file, 'utf8')),
    }));
}

function isDefaultPublishable(manifest) {
  return (
    manifest.name?.startsWith(INTERNAL_SCOPE) &&
    !manifest.private &&
    !manifest.astryx?.canaryOnly
  );
}

function toPosixRelative(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}

export function stampWorkspace({
  root = ROOT,
  ref,
  allowedRef = DEFAULT_ALLOWED_REF,
  channel,
  sha,
  includePackages = [],
}) {
  const request = validateRequest({ref, allowedRef, channel, sha});
  const entries = readWorkspaceManifests(root);
  const byName = new Map(
    entries
      .filter(({manifest}) => manifest.name)
      .map(entry => [entry.manifest.name, entry]),
  );
  const includes = new Set(includePackages);

  for (const name of includes) {
    if (!name.startsWith(INTERNAL_SCOPE)) {
      throw new Error(`explicit package must be in ${INTERNAL_SCOPE}: ${name}`);
    }
    if (!byName.has(name)) {
      throw new Error(`explicit package is not in this workspace: ${name}`);
    }
  }

  const core = byName.get('@astryxdesign/core');
  if (!core) throw new Error('workspace is missing @astryxdesign/core');
  const baseVersion = getBaseVersion(core.manifest.version);
  const version = `${baseVersion}-${channel}.${request.shortSha}`;

  const selected = entries
    .filter(
      ({manifest}) =>
        isDefaultPublishable(manifest) || includes.has(manifest.name),
    )
    .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  const selectedNames = new Set(selected.map(({manifest}) => manifest.name));

  const updates = selected.map(entry => {
    const manifest = structuredClone(entry.manifest);
    if (includes.has(manifest.name)) delete manifest.private;
    manifest.version = version;

    for (const field of DEPENDENCY_FIELDS) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        if (selectedNames.has(name)) manifest[field][name] = version;
      }
    }

    return {...entry, manifest};
  });

  const packages = updates.map(({dir, manifest}) => ({
    name: manifest.name,
    version,
    directory: toPosixRelative(root, dir),
    spec: `${manifest.name}@${version}`,
  }));
  if (packages.length === 0) {
    throw new Error('branch-canary package plan is empty');
  }

  for (const {file, manifest} of updates) {
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return {
    schemaVersion: 1,
    ref,
    channel,
    sha,
    shortSha: request.shortSha,
    baseVersion,
    version,
    packages,
  };
}

function main() {
  const {command, values} = parseArgs(process.argv.slice(2));
  if (values.help || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }

  if (command === 'exists') {
    const exists = packageVersionExists({
      name: required(values, 'name'),
      version: required(values, 'version'),
    });
    process.exitCode = exists ? 0 : 1;
    return;
  }

  const request = {
    ref: required(values, 'ref'),
    allowedRef: required(values, 'allowed-ref'),
    channel: required(values, 'channel'),
    sha: required(values, 'sha'),
  };

  if (command === 'validate') {
    const validated = validateRequest(request);
    console.log(
      `Branch canary request accepted: ${validated.ref} -> @${validated.channel} (${validated.shortSha})`,
    );
    return;
  }
  if (command !== 'stamp') {
    throw new Error('command must be validate or stamp');
  }

  const root = path.resolve(values.root);
  const plan = stampWorkspace({
    root,
    ...request,
    includePackages: values['include-package'],
  });
  const output = path.resolve(root, required(values, 'output'));
  fs.writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`);

  console.log(`Branch canary package plan (${plan.packages.length} packages):`);
  for (const pkg of plan.packages) console.log(pkg.spec);
  console.log(`Plan: ${toPosixRelative(root, output)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`branch-canary failed: ${error.message}`);
    process.exit(1);
  }
}
