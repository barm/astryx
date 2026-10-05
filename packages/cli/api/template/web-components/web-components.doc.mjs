// Copyright (c) Meta Platforms, Inc. and affiliates.

/** @type {import('@astryxdesign/cli/authoring').FunctionDoc} */
export const doc = {
  type: 'function',
  kind: 'api',
  name: 'templateWebComponents',
  namespace: 'cli/api',
  displayName: 'templateWebComponents()',
  summary: 'List or render vanilla web-component templates.',
  description:
    'Reads packages/vanilla/elements-templates in a source checkout and falls back to the bundled CLI copy after installation. Named templates substitute the commit-pinned vanilla jsDelivr base URL for every asset placeholder.',
  importPath: '@astryxdesign/cli/api',
  signature:
    'templateWebComponents(name?: string, options?: TemplateWebComponentsOptions): TemplateWebComponentsListResponse | TemplateWebComponentsResponse',
  keywords: ['template', 'web components', 'vanilla', 'jsdelivr', 'cdn'],
  params: [
    {name: 'name', type: 'string', description: 'Exact vanilla template id.'},
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
      description: 'List available template files instead of rendering one.',
      default: 'false',
    },
    {
      name: 'options.cdnRef',
      type: 'string',
      description: 'Git ref inserted into vanilla jsDelivr URLs.',
      default: 'ASTRYX_VANILLA_CDN_REF',
    },
  ],
  returns: [
    {
      type: 'template.web-components.list',
      description: 'Sorted web-component template files as {id, file}.',
    },
    {
      type: 'template.web-components',
      description:
        'One template as {template, file, cdnRef, cdnBase, source}, with every CDN placeholder substituted.',
    },
  ],
  throws: [
    {
      code: 'ERR_FILE_NOT_FOUND',
      when: 'neither checkout nor bundled vanilla assets are available',
    },
    {code: 'ERR_INVALID_ARGUMENT', when: 'the id or CDN ref is unsafe'},
    {code: 'ERR_UNKNOWN_TEMPLATE', when: 'no matching template file exists'},
  ],
  examples: [
    {
      label: 'Render dashboard',
      code: "templateWebComponents('dashboard', {cwd})",
    },
    {
      label: 'Use another commit',
      code: "templateWebComponents('dashboard', {cwd, cdnRef: sha})",
    },
  ],
  related: ['template', 'componentWebComponents', 'templateHtml'],
};
