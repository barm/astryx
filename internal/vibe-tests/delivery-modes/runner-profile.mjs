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
  validateTranscript(runner.transcript, `runners.${name}.transcript`);
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
    const transcriptEvents = required(
      audit.transcriptEvents,
      `runners.${name}.audit.transcriptEvents`,
      'object',
    );
    validateSelector(
      transcriptEvents.reminders,
      `runners.${name}.audit.transcriptEvents.reminders`,
      {valuePath: true},
    );
    validateSelector(
      transcriptEvents.externalContext,
      `runners.${name}.audit.transcriptEvents.externalContext`,
    );
  }
  for (const [index, argument] of runner.agentArgs.entries()) {
    required(argument, `runners.${name}.agentArgs[${index}]`, 'string');
  }
  for (const [index, argument] of (runner.judgeArgs ?? []).entries()) {
    required(argument, `runners.${name}.judgeArgs[${index}]`, 'string');
  }
}

function validateTranscript(transcript, label) {
  required(transcript, label, 'object');
  if (transcript.format !== 'jsonl') {
    throw new Error(`Runner profile field ${label}.format must be jsonl`);
  }
  const toolCalls = required(
    transcript.toolCalls,
    `${label}.toolCalls`,
    'array',
  );
  for (const [index, rule] of toolCalls.entries()) {
    validateSelector(rule, `${label}.toolCalls[${index}]`);
    validateCommandExtraction(rule, `${label}.toolCalls[${index}]`, {
      optional: true,
    });
  }
  if (transcript.commands != null) {
    const commands = required(
      transcript.commands,
      `${label}.commands`,
      'array',
    );
    for (const [index, rule] of commands.entries()) {
      validateSelector(rule, `${label}.commands[${index}]`);
      validateCommandExtraction(rule, `${label}.commands[${index}]`);
    }
  }
  if (transcript.usage != null) {
    const usage = required(transcript.usage, `${label}.usage`, 'object');
    validateMatches(usage.matches, `${label}.usage.matches`);
    if (usage.recursive != null && typeof usage.recursive !== 'boolean') {
      throw new Error(
        `Runner profile field ${label}.usage.recursive must be a boolean`,
      );
    }
    validatePath(usage.inputTokensPath, `${label}.usage.inputTokensPath`);
    validatePath(usage.outputTokensPath, `${label}.usage.outputTokensPath`);
  }
}

function validateCommandExtraction(rule, label, {optional = false} = {}) {
  if (optional && rule.commandPath == null) {
    if (rule.commandFormat != null || rule.commandJsonPath != null) {
      throw new Error(
        `Runner profile field ${label}.commandPath is required for command decoding`,
      );
    }
    return;
  }
  validatePath(rule.commandPath, `${label}.commandPath`);
  if (rule.commandFormat != null && rule.commandFormat !== 'json') {
    throw new Error(
      `Runner profile field ${label}.commandFormat must be json when set`,
    );
  }
  if (rule.commandFormat === 'json') {
    validatePath(rule.commandJsonPath, `${label}.commandJsonPath`);
  } else if (rule.commandJsonPath != null) {
    throw new Error(
      `Runner profile field ${label}.commandJsonPath requires commandFormat json`,
    );
  }
}

function validateSelector(selector, label, {valuePath = false} = {}) {
  required(selector, label, 'object');
  if (selector.recordsPath != null) {
    validatePath(selector.recordsPath, `${label}.recordsPath`);
  }
  validateMatches(selector.matches, `${label}.matches`);
  if (valuePath) {
    validatePath(selector.valuePath, `${label}.valuePath`);
  } else if (selector.valuePath != null) {
    validatePath(selector.valuePath, `${label}.valuePath`);
  }
}

function validateMatches(matches, label) {
  required(matches, label, 'array');
  for (const [index, match] of matches.entries()) {
    required(match, `${label}[${index}]`, 'object');
    validatePath(match.path, `${label}[${index}].path`);
    const operators = ['equals', 'startsWith', 'includes', 'exists'].filter(
      operator => operator in match,
    );
    if (operators.length !== 1) {
      throw new Error(
        `Runner profile field ${label}[${index}] requires exactly one matcher`,
      );
    }
    if ('startsWith' in match && typeof match.startsWith !== 'string') {
      throw new Error(
        `Runner profile field ${label}[${index}].startsWith must be a string`,
      );
    }
    if ('includes' in match && typeof match.includes !== 'string') {
      throw new Error(
        `Runner profile field ${label}[${index}].includes must be a string`,
      );
    }
    if ('exists' in match && typeof match.exists !== 'boolean') {
      throw new Error(
        `Runner profile field ${label}[${index}].exists must be a boolean`,
      );
    }
    if (
      'equals' in match &&
      match.equals !== null &&
      !['string', 'number', 'boolean'].includes(typeof match.equals)
    ) {
      throw new Error(
        `Runner profile field ${label}[${index}].equals must be a scalar`,
      );
    }
    if (
      match.caseInsensitive != null &&
      (typeof match.caseInsensitive !== 'boolean' || !('includes' in match))
    ) {
      throw new Error(
        `Runner profile field ${label}[${index}].caseInsensitive requires an includes matcher`,
      );
    }
  }
}

function validatePath(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !value.split('.').every(part => /^[A-Za-z0-9_-]+$/.test(part))
  ) {
    throw new Error(
      `Runner profile field ${label} must be a dotted JSON field path`,
    );
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
