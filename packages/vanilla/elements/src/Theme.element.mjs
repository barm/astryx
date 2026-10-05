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
      name: 'neutral-light',
      html: '<ax-theme theme="neutral" mode="light"><p>Neutral theme</p></ax-theme>',
    },
    {
      name: 'butter-dark',
      html: '<ax-theme theme="butter" mode="dark"><p>Butter theme</p></ax-theme>',
    },
  ],
  render(_host, h) {
    const mode = h.attr('mode');
    return `<div style="display:contents" data-astryx-theme="${h.escape(h.attr('theme'))}"${mode === 'system' ? '' : ` data-theme="${mode}"`} ${h.slot()}></div>`;
  },
};
