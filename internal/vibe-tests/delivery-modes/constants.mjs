// Copyright (c) Meta Platforms, Inc. and affiliates.

import {createHash} from 'node:crypto';

export const DEFAULT_REACT_VERSION = '0.6.5';
export const DEFAULT_REACT_RUNTIME_VERSION = '19.2.7';
export const DEFAULT_VANILLA_CDN_REF =
  'eb7a056250cf98d7d86342d24f1e0c744852bebb';
export const DEFAULT_VANILLA_TARBALL_URL =
  'https://cdn.jsdelivr.net/gh/facebook/astryx@9f2b5b75b2b638b2759f28749a9036c314d6febd/packages/vanilla/dist/cli/astryx-cli-vanilla.tgz';

export const CONFIG_NAMES = [
  'react-build',
  'react-nobuild',
  'vanilla',
  'web-components',
];
export const AGENT_NAMES = ['claude', 'muse'];

export function getDeliverySpecs(options = {}) {
  const reactVersion = options.reactVersion ?? DEFAULT_REACT_VERSION;
  const vanillaCdnRef = options.vanillaCdnRef ?? DEFAULT_VANILLA_CDN_REF;
  const vanillaTarballUrl =
    options.vanillaTarballUrl ?? DEFAULT_VANILLA_TARBALL_URL;

  return {
    'react-build': {
      name: 'react-build',
      outputFile: 'src/App.tsx',
      description: `a Vite + React 19 project with @astryxdesign/core, a theme, and @astryxdesign/cli ${reactVersion} installed from npm; the project includes Astryx-generated agent documentation`,
      reactVersion,
    },
    'react-nobuild': {
      name: 'react-nobuild',
      outputFile: 'index.html',
      description: `a single-page, no-build React 19 + htm project that loads @astryxdesign/core and its theme at ${reactVersion} from public CDNs; the published Astryx CLI provides agent documentation`,
      reactVersion,
    },
    vanilla: {
      name: 'vanilla',
      outputFile: 'index.html',
      description:
        'a build-less static HTML project with the Vanilla Astryx preview CLI and its agent documentation installed from a pinned public tarball',
      vanillaCdnRef,
      vanillaTarballUrl,
    },
    'web-components': {
      name: 'web-components',
      outputFile: 'index.html',
      description:
        'a build-less static HTML project using light-DOM Astryx web components with the Vanilla Astryx preview CLI and its agent documentation installed from a pinned public tarball',
      vanillaCdnRef,
      vanillaTarballUrl,
    },
  };
}

export function buildTaskPrompt(
  prompt,
  spec,
  projectDir = '<project-dir>',
  {timeoutMinutes = 15} = {},
) {
  return `You are implementing a UI in an isolated consumer project.

Delivery environment:
${spec.description}

Project directory:
${projectDir}

Time and browser:
You have up to ${timeoutMinutes} minutes. A headless Chromium helper is available as \`screenshot <file-or-url> [output.png]\`.

First inspect the project and use only the documentation and tools installed there. Do not read files outside this project.

Task:
${prompt.prompt}

Output:
Implement the complete runnable solution in ${spec.outputFile}. Preserve the project's delivery mechanism. Work directly in the project files; do not merely describe the solution. Ensure the result can be opened or built using the scripts and dependencies already provided.`;
}

export function selectPrompts(testSet, {sample, promptIds, seed} = {}) {
  const prompts = testSet.prompts ?? [];
  if (promptIds?.length) {
    const byId = new Map(prompts.map(prompt => [prompt.id, prompt]));
    return promptIds.map(id => {
      const prompt = byId.get(id);
      if (!prompt) {
        throw new Error(`Unknown prompt id: ${id}`);
      }
      return prompt;
    });
  }
  const orderedPrompts =
    seed == null
      ? prompts
      : [...prompts].sort((left, right) =>
          stableId(String(seed), left.category, left.id).localeCompare(
            stableId(String(seed), right.category, right.id),
          ),
        );
  if (!sample || sample >= orderedPrompts.length) {
    return orderedPrompts;
  }

  const selected = [];
  const seenCategories = new Set();
  for (const prompt of orderedPrompts) {
    if (!seenCategories.has(prompt.category)) {
      selected.push(prompt);
      seenCategories.add(prompt.category);
      if (selected.length === sample) {
        return selected;
      }
    }
  }
  for (const prompt of orderedPrompts) {
    if (!selected.includes(prompt)) {
      selected.push(prompt);
      if (selected.length === sample) {
        break;
      }
    }
  }
  return selected;
}

export function stableId(...parts) {
  return createHash('sha256')
    .update(parts.join('\0'))
    .digest('hex')
    .slice(0, 12);
}
