// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Theme',
  tag: 'ax-theme',
  attributes: {
    theme: {
      type: 'string',
      default: 'neutral',
      description: 'Loaded Vanilla Astryx theme name.',
    },
    mode: {
      type: 'enum',
      values: ['light', 'dark', 'system'],
      default: 'system',
      description: 'Light, dark, or operating-system color mode.',
    },
  },
  slots: {default: {description: 'The themed subtree.', required: true}},
  docs: 'Scope a Vanilla Astryx subtree to a loaded theme name and color mode.',
  examples: [
    {
      name: 'brand-section',
      html: '<ax-theme theme="brand"><ax-card><ax-heading level="3">Brand workspace</ax-heading><ax-button variant="primary">Continue</ax-button></ax-card></ax-theme>',
    },
    {
      name: 'nested-dark',
      html: '<ax-theme theme="neutral" mode="dark"><ax-card><ax-heading level="3">Dark tools</ax-heading><ax-text>This subtree is dark inside a light page.</ax-text></ax-card></ax-theme>',
    },
  ],
  render(_host, h) {
    const mode = h.attr('mode');
    return `<div class="ax-theme" data-astryx-theme="${h.escape(h.attr('theme'))}"${mode === 'system' ? '' : ` data-theme="${mode}"`} ${h.slot()}></div>`;
  },
};
