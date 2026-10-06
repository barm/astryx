// Copyright (c) Meta Platforms, Inc. and affiliates.

import * as fs from 'node:fs';
import * as path from 'node:path';

const PLACEHOLDER_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

function required(value, field, type) {
  const valid =
    type === 'array'
      ? Array.isArray(value)
      : type === 'object'
        ? value != null && typeof value === 'object' && !Array.isArray(value)
        : typeof value === type;
  if (!valid || (type === 'string' && value.length === 0)) {
    throw new Error(
      `Runner profile field ${field} must be a non-empty ${type}`,
    );
  }
  return value;
}

function validateRunner(profile, name, {judge = false} = {}) {
  const runner = required(profile.runners?.[name], `runners.${name}`, 'object');
  required(runner.command, `runners.${name}.command`, 'string');
  const agentArgs = required(
    runner.agentArgs,
    `runners.${name}.agentArgs`,
    'array',
  );
  if (agentArgs.length === 0) {
    throw new Error(`Runner profile field runners.${name}.agentArgs is empty`);
  }
  required(runner.input, `runners.${name}.input`, 'string');
  if (!['stdin', 'none'].includes(runner.input)) {
    throw new Error(
      `Runner profile field runners.${name}.input must be stdin or none`,
    );
  }
  const audit = required(runner.audit, `runners.${name}.audit`, 'object');
  if (judge) {
    const judgeArgs = required(
      runner.judgeArgs,
      `runners.${name}.judgeArgs`,
      'array',
    );
    if (judgeArgs.length === 0) {
      throw new Error(
        `Runner profile field runners.${name}.judgeArgs is empty`,
      );
    }
  }
  if (name === 'claude') {
    const contextPolicies = required(
      audit.contextPolicies,
      `runners.${name}.audit.contextPolicies`,
      'object',
    );
    for (const [version, policy] of Object.entries(contextPolicies)) {
      required(
        policy,
        `runners.${name}.audit.contextPolicies.${version}`,
        'object',
      );
      required(
        policy.agents,
        `runners.${name}.audit.contextPolicies.${version}.agents`,
        'array',
      );
      const plugins = required(
        policy.plugins,
        `runners.${name}.audit.contextPolicies.${version}.plugins`,
        'array',
      );
      for (const [index, plugin] of plugins.entries()) {
        required(
          plugin,
          `runners.${name}.audit.contextPolicies.${version}.plugins[${index}]`,
          'object',
        );
        for (const field of ['name', 'path', 'source']) {
          required(
            plugin[field],
            `runners.${name}.audit.contextPolicies.${version}.plugins[${index}].${field}`,
            'string',
          );
        }
      }
    }
    required(
      audit.requiredStderr,
      `runners.${name}.audit.requiredStderr`,
      'array',
    );
    required(
      audit.knownAsymmetry,
      `runners.${name}.audit.knownAsymmetry`,
      'string',
    );
    required(
      audit.projectInstructions,
      `runners.${name}.audit.projectInstructions`,
      'string',
    );
    required(audit.pathPolicy, `runners.${name}.audit.pathPolicy`, 'string');
  } else {
    required(
      audit.pluginGateOffMarker,
      `runners.${name}.audit.pluginGateOffMarker`,
      'string',
    );
    required(
      audit.knownAsymmetry,
      `runners.${name}.audit.knownAsymmetry`,
      'string',
    );
    required(audit.pathPolicy, `runners.${name}.audit.pathPolicy`, 'string');
  }
  for (const [index, argument] of runner.agentArgs.entries()) {
    required(argument, `runners.${name}.agentArgs[${index}]`, 'string');
  }
  for (const [index, argument] of (runner.judgeArgs ?? []).entries()) {
    required(argument, `runners.${name}.judgeArgs[${index}]`, 'string');
  }
}

export function validateRunnerProfile(profile) {
  required(profile, 'profile', 'object');
  if (profile.schema !== 1) {
    throw new Error(
      `Runner profile schema must be 1; received ${profile.schema}`,
    );
  }
  required(profile.runners, 'runners', 'object');
  validateRunner(profile, 'claude', {judge: true});
  validateRunner(profile, 'muse');
  required(profile.sandbox, 'sandbox', 'object');
  required(profile.sandbox.mountScript, 'sandbox.mountScript', 'string');
  required(profile.sandbox.probeScript, 'sandbox.probeScript', 'string');
  required(profile.sandbox.hostUserRoot, 'sandbox.hostUserRoot', 'string');
  const transcriptAuditPaths = required(
    profile.sandbox.transcriptAuditPaths,
    'sandbox.transcriptAuditPaths',
    'array',
  );
  for (const [index, pathname] of transcriptAuditPaths.entries()) {
    required(pathname, `sandbox.transcriptAuditPaths[${index}]`, 'string');
  }
  const manifest = required(
    profile.sandbox.manifest,
    'sandbox.manifest',
    'object',
  );
  required(manifest.runnerContext, 'sandbox.manifest.runnerContext', 'object');
  required(manifest.isolation, 'sandbox.manifest.isolation', 'object');
  required(profile.sandbox.probeReceipt, 'sandbox.probeReceipt', 'object');
  required(profile.versionCommands, 'versionCommands', 'object');
  for (const [name, entry] of Object.entries(profile.versionCommands)) {
    required(entry, `versionCommands.${name}`, 'object');
    required(entry.command, `versionCommands.${name}.command`, 'string');
    const args = required(entry.args, `versionCommands.${name}.args`, 'array');
    for (const [index, argument] of args.entries()) {
      required(argument, `versionCommands.${name}.args[${index}]`, 'string');
    }
  }
  return profile;
}

export function loadRunnerProfile({env = process.env} = {}) {
  const configuredPath = env.VIBE_RUNNER_PROFILE;
  if (!configuredPath) {
    throw new Error(
      'VIBE_RUNNER_PROFILE is required and must point to a local runner profile JSON file; see internal/vibe-tests/delivery-modes/README.md',
    );
  }
  const profilePath = path.resolve(configuredPath);
  let source;
  try {
    source = fs.readFileSync(profilePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Could not read VIBE_RUNNER_PROFILE at ${profilePath}: ${error.message}`,
    );
  }
  let profile;
  try {
    profile = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `VIBE_RUNNER_PROFILE is not valid JSON at ${profilePath}: ${error.message}`,
    );
  }
  validateRunnerProfile(profile);
  return {...profile, sourcePath: profilePath};
}

export function renderProfileArgs(args, values) {
  return args.map(argument => {
    const rendered = argument.replaceAll(
      PLACEHOLDER_PATTERN,
      (_match, name) => {
        if (!(name in values)) {
          throw new Error(`Runner profile argument requires value ${name}`);
        }
        return String(values[name]);
      },
    );
    const unresolved = rendered.match(PLACEHOLDER_PATTERN)?.[0];
    if (unresolved) {
      throw new Error(
        `Runner profile argument has unresolved token ${unresolved}`,
      );
    }
    return rendered;
  });
}

export function runnerInvocation(profile, name, kind, values = {}) {
  const runner = profile.runners[name];
  if (!runner) {
    throw new Error(`Runner profile does not define ${name}`);
  }
  const template = kind === 'judge' ? runner.judgeArgs : runner.agentArgs;
  if (!template) {
    throw new Error(`Runner profile does not define ${name}.${kind}Args`);
  }
  return {
    command: runner.command,
    args: renderProfileArgs(template, values),
    input: runner.input,
    maxModelSteps: runner.maxModelSteps ?? null,
  };
}
