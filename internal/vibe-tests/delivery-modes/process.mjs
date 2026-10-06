// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global clearTimeout, process, setTimeout */

import {spawn} from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const DEFAULT_CAPTURE_LIMIT = 20 * 1024 * 1024;
export const SANDBOX_ROOT = '/mnt/run';
export const SANDBOX_PROJECT = `${SANDBOX_ROOT}/project`;
const SCREENSHOT_HELPER = `#!/bin/sh
set -eu
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "usage: screenshot <file-or-url> [output.png]" >&2
  exit 2
fi
target="$1"
output="\${2:-screenshot.png}"
case "$target" in
  http://*|https://*|file://*) ;;
  *) target="file://$(realpath "$target")" ;;
esac
chrome="$(find /mnt/run/browser-cache -type f -path '*/chrome-linux*/chrome' | sort | tail -n 1)"
if [ -z "$chrome" ]; then
  echo "screenshot: no Chromium executable found" >&2
  exit 1
fi
"$chrome" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --window-size=1440,900 --screenshot="$output" "$target" >/dev/null 2>&1
printf '%s\n' "$output"
`;

export async function runCommand(command, args, options = {}) {
  const {
    cwd,
    env,
    input,
    timeoutMs = 15 * 60 * 1000,
    transcriptPath,
    captureLimit = DEFAULT_CAPTURE_LIMIT,
  } = options;
  await fs.promises.mkdir(path.dirname(transcriptPath ?? path.join(cwd, 'x')), {
    recursive: true,
  });

  return await new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command, args, {
      cwd,
      env: {...process.env, ...env},
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const append = (current, chunk) => {
      if (current.length >= captureLimit) {
        return current;
      }
      return (current + chunk.toString()).slice(0, captureLimit);
    };
    child.stdout.on('data', chunk => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', chunk => {
      stderr = append(stderr, chunk);
    });
    child.on('error', reject);

    const timer = setTimeout(() => {
      timedOut = true;
      terminate(child);
    }, timeoutMs);

    child.on('close', async (code, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      if (transcriptPath) {
        await fs.promises.writeFile(transcriptPath, stdout);
        await fs.promises.writeFile(`${transcriptPath}.stderr.log`, stderr);
      }
      resolve({
        command,
        args,
        code,
        signal,
        stdout,
        stderr,
        timedOut,
        durationMs,
      });
    });

    if (input != null) {
      child.stdin.end(input);
    } else {
      child.stdin.end();
    }
  });
}

export async function createPrivateRunRoot(prefix = 'run-', profile = null) {
  const base = path.join(os.homedir(), '.astryx-vibe-private');
  await fs.promises.mkdir(base, {recursive: true, mode: 0o700});
  await fs.promises.chmod(base, 0o700);
  const root = await fs.promises.mkdtemp(path.join(base, prefix));
  await fs.promises.chmod(root, 0o700);
  const judgeRunner = Object.entries(profile?.runners ?? {}).find(
    ([, runner]) => Array.isArray(runner.judgeArgs),
  )?.[0];
  const privateDirectories =
    profile?.sandbox?.privateDirectories ??
    (judgeRunner ? [`home/.${judgeRunner}`] : []);
  for (const directory of [
    'project',
    'home/.config',
    'tmp',
    'bin',
    'browser-cache',
    ...privateDirectories,
  ]) {
    await fs.promises.mkdir(path.join(root, directory), {
      recursive: true,
      mode: 0o700,
    });
  }
  await symlinkExecutable(process.execPath, path.join(root, 'bin', 'node'));
  const gitPath = fs.existsSync('/usr/bin/git')
    ? '/usr/bin/git'
    : '/usr/local/bin/git';
  await symlinkExecutable(gitPath, path.join(root, 'bin', 'git'));
  const screenshotPath = path.join(root, 'bin', 'screenshot');
  await fs.promises.writeFile(screenshotPath, SCREENSHOT_HELPER, {mode: 0o700});
  await fs.promises.chmod(screenshotPath, 0o700);
  await fs.promises.writeFile(
    path.join(root, 'empty-mcp.json'),
    '{"mcpServers":{}}\n',
  );
  return {
    root,
    projectDir: path.join(root, 'project'),
    sandboxProjectDir: SANDBOX_PROJECT,
    transcriptPath: path.join(root, 'transcript.jsonl'),
  };
}

export async function runIsolatedCommand(
  privateRoot,
  command,
  args,
  profile,
  options = {},
) {
  if (process.platform !== 'linux') {
    throw new Error('Private mount-namespace runs require Linux');
  }
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  if (!Number.isInteger(uid) || !Number.isInteger(gid)) {
    throw new Error('Could not determine the current uid/gid');
  }
  const browserCache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(browserCache)) {
    throw new Error(`Playwright browser cache is missing: ${browserCache}`);
  }
  return await runCommand(
    '/usr/bin/sudo',
    [
      '-n',
      'unshare',
      '--mount',
      '/bin/sh',
      '-c',
      profile.sandbox.mountScript,
      'sandbox',
      String(uid),
      String(gid),
      privateRoot,
      browserCache,
      os.userInfo().username,
      command,
      ...args,
    ],
    {
      ...options,
      cwd: privateRoot,
    },
  );
}

async function symlinkExecutable(target, linkPath) {
  try {
    await fs.promises.symlink(target, linkPath);
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      throw error;
    }
  }
}

function terminate(child) {
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, 'SIGTERM');
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    // Best-effort process-group termination.
  }
  setTimeout(() => {
    try {
      if (process.platform !== 'win32' && child.pid) {
        process.kill(-child.pid, 'SIGKILL');
      } else {
        child.kill('SIGKILL');
      }
    } catch {
      // The process may already have exited.
    }
  }, 3000).unref();
}

export function parseTranscript(text, adapter) {
  if (adapter?.format !== 'jsonl') {
    throw new Error('Transcript adapter format must be jsonl');
  }
  const records = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    try {
      const record = JSON.parse(line);
      if (record && typeof record === 'object' && !Array.isArray(record)) {
        records.push(record);
      }
    } catch {
      // Transcripts can contain non-JSON diagnostics beside JSONL records.
    }
  }
  return records;
}

export function parseUsage(text, adapter) {
  if (!adapter?.usage) {
    return {inputTokens: null, outputTokens: null};
  }
  const records = parseTranscript(text, adapter);
  const candidates = adapter.usage.recursive
    ? records.flatMap(collectObjects)
    : records;
  const values = candidates
    .filter(record => matchesRecord(record, adapter.usage.matches))
    .map(record => ({
      inputTokens: readNumber(record, adapter.usage.inputTokensPath),
      outputTokens: readNumber(record, adapter.usage.outputTokensPath),
    }))
    .filter(value => value.inputTokens != null || value.outputTokens != null)
    .map(value => ({
      inputTokens: value.inputTokens ?? 0,
      outputTokens: value.outputTokens ?? 0,
    }));
  if (values.length === 0) {
    return {inputTokens: null, outputTokens: null};
  }
  return values.reduce((best, current) =>
    current.inputTokens + current.outputTokens >
    best.inputTokens + best.outputTokens
      ? current
      : best,
  );
}

export function countToolCalls(text, adapter) {
  const records = parseTranscript(text, adapter);
  return records.reduce(
    (total, record) =>
      total +
      (adapter.toolCalls ?? []).reduce(
        (ruleTotal, rule) =>
          ruleTotal +
          expandRuleRecords(record, rule).filter(candidate =>
            matchesRecord(candidate, rule.matches),
          ).length,
        0,
      ),
    0,
  );
}

export function countCliLookups(text, adapter) {
  return extractToolCommands(text, adapter).reduce(
    (total, command) => total + countAstryxInvocations(command),
    0,
  );
}

export function countAstryxInvocations(command) {
  const pattern =
    /(?:\bnpx\s+(?:--yes\s+)?(?:astryx|@astryxdesign\/cli(?:@[^\s;&|()]+)?)(?=\s|$)|\b(?:npm|pnpm)\s+exec\s+(?:--\s+)?astryx(?=\s|$)|(?:^|[\s(;$])(?:[^\s;&|()]*\/)?node_modules\/\.bin\/astryx(?=\s|$)|\bnode\s+[^\s;&|()]*astryx\.mjs(?=\s|$)|(?:^|[\s(;$])astryx(?=\s|$))/gi;
  return (command.match(pattern) ?? []).length;
}

function sameStringSet(actual, expected) {
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return (
    sortedActual.length === sortedExpected.length &&
    sortedActual.every((value, index) => value === sortedExpected[index])
  );
}

function samePluginSet(actual, expected) {
  const key = plugin => `${plugin.name}\0${plugin.path}\0${plugin.source}`;
  return sameStringSet(actual.map(key), expected.map(key));
}

export function auditAgentContext(agent, stdout, stderr, profile) {
  const runner = profile.runners[agent];
  if (!runner) {
    throw new Error(`Runner profile does not define ${agent}`);
  }
  const records = parseTranscript(stdout, runner.transcript);

  if (runner.audit.contextPolicies != null) {
    const audit = runner.audit;
    const init = records.find(
      value => value.type === 'system' && value.subtype === 'init',
    );
    const hooks = records.filter(
      value => value.type === 'system' && value.subtype?.startsWith('hook_'),
    );
    const version =
      readPath(init, audit.versionPath ?? `${agent}_code_version`) ?? null;
    const policy = version ? audit.contextPolicies?.[version] : null;
    const plugins = init?.plugins ?? [];
    const pluginPolicyPassed =
      policy != null && samePluginSet(plugins, policy.plugins);
    const agents = init?.agents ?? [];
    const skills = init?.skills ?? [];
    const slashCommands = init?.slash_commands ?? [];
    const mcpServers = init?.mcp_servers ?? [];
    const launcherPolicyConfirmed = (audit.requiredStderr ?? []).every(marker =>
      stderr.includes(marker),
    );
    const violations = [];
    if (!launcherPolicyConfirmed) {
      violations.push(
        `${agent} did not confirm the configured launcher policy`,
      );
    }
    if (!init) {
      violations.push(`missing ${agent} init event`);
    }
    if (!policy) {
      violations.push(
        `unsupported ${agent} context policy version: ${version}`,
      );
    }
    if (!pluginPolicyPassed) {
      violations.push(
        `${agent} plugin set did not match the configured allowlist`,
      );
    }
    if (
      !Array.isArray(init?.agents) ||
      !policy ||
      !sameStringSet(agents, policy.agents)
    ) {
      violations.push(
        `${agent} agent set did not match the configured allowlist`,
      );
    }
    if (!Array.isArray(init?.skills) || skills.length > 0) {
      violations.push(`${agent} skills were missing or non-empty`);
    }
    if (!Array.isArray(init?.slash_commands) || slashCommands.length > 0) {
      violations.push(`${agent} slash commands were missing or non-empty`);
    }
    if (!Array.isArray(init?.mcp_servers) || mcpServers.length > 0) {
      violations.push(`${agent} MCP servers were missing or non-empty`);
    }
    if (hooks.length > 0) {
      violations.push(`${agent} ran hooks`);
    }
    const installMarker = audit.pluginInstallMarker ?? 'Installing ';
    const installAttempts = stderr.split(installMarker).length - 1;
    return {
      passed: violations.length === 0,
      violations,
      plugins,
      agents,
      skills,
      slashCommands,
      mcpServers,
      hookEvents: hooks.length,
      launcherPolicyConfirmed,
      tools: init?.tools ?? [],
      cwd: init?.cwd ?? null,
      runnerVersion: version,
      launcherPluginInstallAttempts: installAttempts,
      launcherPluginInstallBlocked: installAttempts > 0 && pluginPolicyPassed,
      knownAsymmetry: audit.knownAsymmetry,
      projectInstructions: audit.projectInstructions,
      pathPolicy: audit.pathPolicy,
    };
  }

  const audit = runner.audit;
  const reminderKinds = selectTranscriptValues(
    records,
    audit.transcriptEvents.reminders,
  ).filter(value => typeof value === 'string');
  const externalContextEvents = selectTranscriptValues(
    records,
    audit.transcriptEvents.externalContext,
  ).length;
  const pluginGateOff = stderr.includes(audit.pluginGateOffMarker);
  const pluginInstallAttempt = stderr.includes(
    audit.pluginInstallMarker ?? 'Installing ',
  );
  const violations = [];
  if (!pluginGateOff) {
    violations.push(`${agent} plugin gate was not off`);
  }
  if (pluginInstallAttempt) {
    violations.push(`${agent} attempted to install external plugins`);
  }
  if (externalContextEvents > 0) {
    violations.push(`${agent} emitted external context events`);
  }
  return {
    passed: violations.length === 0,
    violations,
    plugins: [],
    mcpServers: [],
    hookEvents: 0,
    builtInReminderEvents: reminderKinds.length,
    builtInReminderKinds: [...new Set(reminderKinds)].sort(),
    externalSkillContentLoaded: false,
    knownAsymmetry: audit.knownAsymmetry,
    pathPolicy: audit.pathPolicy,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function auditTranscriptCommands(text, profile, runnerName) {
  const runner = profile.runners[runnerName];
  if (!runner) {
    throw new Error(`Runner profile does not define ${runnerName}`);
  }
  const sensitivePaths = profile.sandbox.transcriptAuditPaths.map(pathname => [
    pathname,
    new RegExp(`${escapeRegExp(pathname)}(?=\\/|$|[\\s"'\`;&|),\\]}])`),
  ]);
  const flaggedCommands = [];
  for (const command of extractToolCommands(text, runner.transcript)) {
    const touchedPaths = sensitivePaths
      .filter(([, pattern]) => pattern.test(command))
      .map(([label]) => label);
    if (touchedPaths.length > 0) {
      flaggedCommands.push({
        command: command.slice(0, 1000),
        touchedPaths,
      });
    }
  }
  return {
    passed: flaggedCommands.length === 0,
    flaggedCommandCount: flaggedCommands.length,
    touchedPaths: [
      ...new Set(flaggedCommands.flatMap(entry => entry.touchedPaths)),
    ].sort(),
    flaggedCommands,
  };
}

export function extractToolCommands(text, adapter) {
  const commands = [];
  for (const record of parseTranscript(text, adapter)) {
    for (const rule of adapter.commands ?? adapter.toolCalls ?? []) {
      for (const candidate of expandRuleRecords(record, rule)) {
        if (!matchesRecord(candidate, rule.matches)) {
          continue;
        }
        let command = readPath(candidate, rule.commandPath);
        if (rule.commandFormat === 'json') {
          try {
            command = readPath(JSON.parse(command), rule.commandJsonPath);
          } catch {
            continue;
          }
        }
        if (typeof command === 'string') {
          commands.push(command);
        }
      }
    }
  }
  return commands;
}

function selectTranscriptValues(records, selector) {
  const values = [];
  for (const record of records) {
    for (const candidate of expandRuleRecords(record, selector)) {
      if (!matchesRecord(candidate, selector.matches)) {
        continue;
      }
      values.push(
        selector.valuePath
          ? readPath(candidate, selector.valuePath)
          : candidate,
      );
    }
  }
  return values;
}

function expandRuleRecords(record, rule) {
  if (!rule.recordsPath) {
    return [record];
  }
  const candidates = readPath(record, rule.recordsPath);
  return Array.isArray(candidates) ? candidates : [];
}

function matchesRecord(record, matches = []) {
  return matches.every(match => {
    const value = readPath(record, match.path);
    if ('equals' in match) {
      return value === match.equals;
    }
    if ('startsWith' in match) {
      return typeof value === 'string' && value.startsWith(match.startsWith);
    }
    if ('includes' in match) {
      if (typeof value !== 'string') {
        return false;
      }
      const candidate = match.caseInsensitive ? value.toLowerCase() : value;
      const expected = match.caseInsensitive
        ? match.includes.toLowerCase()
        : match.includes;
      return candidate.includes(expected);
    }
    return match.exists ? value !== undefined : value === undefined;
  });
}

function collectObjects(value) {
  if (!value || typeof value !== 'object') {
    return [];
  }
  return [
    value,
    ...Object.values(value).flatMap(child => collectObjects(child)),
  ];
}

function readPath(value, dottedPath) {
  if (!dottedPath) {
    return undefined;
  }
  return dottedPath
    .split('.')
    .reduce(
      (current, part) =>
        current && typeof current === 'object' ? current[part] : undefined,
      value,
    );
}

function readNumber(value, dottedPath) {
  const candidate = readPath(value, dottedPath);
  return typeof candidate === 'number' && Number.isFinite(candidate)
    ? candidate
    : null;
}
