// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file CommandDoc for `astryx component`. The terminal binding of the
 * `component()` function (referenced via `fn`); its args/flags map to that
 * function's params so a converter can build Commander config + --help from one
 * source of truth.
 * @position packages/cli/clients/cli/commands — command documentation
 */

/** @type {import('@astryxdesign/cli/authoring').CommandDoc} */
export const doc = {
  type: 'command',
  name: 'component',
  displayName: 'astryx component',
  namespace: 'cli/commands',
  summary: 'List components or print component docs',
  description:
    'Resolves one or several components by exact selector across core and integration ' +
    'packages and prints each authored doc, lists the catalog grouped by category, or ' +
    'reads vanilla HTML or web-component markup. ' +
    "Use 'Button', 'widgets/Button', '@acme/widgets/Button', or " +
    "'@acme/widgets@1.2.3/Button'. A version applies to the package and must match the " +
    'installed version. Without a local Core installation, details, props, and lists use ' +
    'the version-matched Core docs bundled with the CLI. Boolean flags narrow every ' +
    'resolved component to just its props, source, showcase, or example blocks.',
  fn: 'component',
  args: [
    {
      name: 'names',
      param: 'name',
      description:
        'One or more exact selectors. Use Name, package/Name, @scope/package/Name, or @scope/package@version/Name. Two or more return one ordered batch. At most 100 selectors are accepted.',
      required: false,
      variadic: true,
    },
  ],
  options: [
    {
      flag: '--list',
      param: 'options.list',
      description: 'List every component (the same as giving no name)',
    },
    {
      flag: '--category <category>',
      param: 'options.category',
      description:
        'List one component group, e.g. --category Layout or --category Avatar (an unknown group lists the valid ones)',
    },
    {
      flag: '--props',
      param: 'options.props',
      description: 'Print only the props table',
    },
    {
      flag: '--source',
      param: 'options.source',
      description: 'Print component source code',
    },
    {
      flag: '--showcase',
      param: 'options.showcase',
      description: 'Print showcase source code',
    },
    {
      flag: '--blocks',
      param: 'options.blocks',
      description: 'List example blocks: showcase, examples, and related',
    },
    {
      flag: '--package <name>',
      param: 'options.package',
      description:
        'Scope lookup to an external package (e.g. @acme/xds-widgets)',
    },
    {
      flag: '--framework <framework>',
      param: 'options.framework',
      description:
        'Output framework: react (default), html, or web-components. HTML and web-components print one vanilla markup file or list their files with --list.',
    },
    {
      flag: '--html',
      param: 'options.html',
      description:
        'Deprecated alias for --framework html. Print vanilla HTML markup for exactly one <name>, or list packages/vanilla/markup files with --list.',
    },
  ],
  examples: [
    {label: 'Browse the catalog', cli: 'astryx component --list'},
    {
      label: 'Look up several components',
      cli: 'astryx component Button Badge Text',
    },
    {
      label: 'Props table as JSON',
      cli: 'astryx component Button --props --json',
    },
    {
      label: 'Vanilla HTML markup',
      cli: 'astryx component Button --framework html',
    },
    {
      label: 'Vanilla web-component markup',
      cli: 'astryx component Button --framework web-components',
    },
  ],
  exitCodes: [
    {code: 0, when: 'success'},
    {
      code: 1,
      when: 'unknown component, category, package, or framework; an invalid framework combination; more than 100 selectors; any batch row is unresolved; or a source, showcase, or block view needs @astryxdesign/core but it cannot be resolved',
    },
  ],
  related: ['search', 'hook', 'docs', 'template', 'swizzle'],
};
