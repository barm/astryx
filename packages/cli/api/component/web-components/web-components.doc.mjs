// Copyright (c) Meta Platforms, Inc. and affiliates.

/** @type {import('@astryxdesign/cli/authoring').FunctionDoc} */
export const doc = {
  type: 'function',
  kind: 'api',
  name: 'componentWebComponents',
  namespace: 'cli/api',
  displayName: 'componentWebComponents()',
  summary: 'List or read vanilla web-component markup.',
  description:
    'Reads packages/vanilla/elements-markup in a source checkout and falls back to the bundled CLI copy after installation. List mode returns the available .html files; named mode returns one file verbatim.',
  importPath: '@astryxdesign/cli/api',
  signature:
    'componentWebComponents(name?: string, options?: ComponentWebComponentsOptions): ComponentWebComponentsListResponse | ComponentWebComponentsResponse',
  keywords: ['component', 'web components', 'vanilla', 'markup'],
  params: [
    {
      name: 'name',
      type: 'string',
      description: 'Exact vanilla component name.',
    },
    {
      name: 'options.cwd',
      type: 'string',
      description:
        'Directory to search upward for packages/vanilla before using the bundled CLI copy.',
      default: 'process.cwd()',
    },
    {
      name: 'options.list',
      type: 'boolean',
      description: 'List available markup files instead of reading one.',
      default: 'false',
    },
  ],
  returns: [
    {
      type: 'component.web-components.list',
      description: 'Sorted web-component markup files as {name, file}.',
    },
    {
      type: 'component.web-components',
      description:
        'One web-component markup file as {component, file, source}.',
    },
  ],
  throws: [
    {
      code: 'ERR_FILE_NOT_FOUND',
      when: 'neither checkout nor bundled vanilla assets are available',
    },
    {
      code: 'ERR_INVALID_ARGUMENT',
      when: 'name is not a safe component identifier',
    },
    {code: 'ERR_UNKNOWN_COMPONENT', when: 'no matching markup file exists'},
  ],
  examples: [
    {
      label: 'Read Button markup',
      code: "componentWebComponents('Button', {cwd})",
    },
    {
      label: 'List markup files',
      code: 'componentWebComponents(undefined, {cwd, list: true})',
    },
  ],
  related: ['component', 'componentHtml', 'templateWebComponents'],
};
