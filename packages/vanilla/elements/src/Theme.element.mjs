// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input Theme name, color mode, and a slotted subtree.
 * @output A light-DOM theme boundary with copyable custom-theme examples.
 * @position Web-component projection of Vanilla Astryx theme scoping.
 */

const brandThemeStyle = `<style>@layer astryx-theme{[data-astryx-theme='brand']{--color-accent:light-dark(#6d28d9,#a78bfa);--color-on-accent:light-dark(#fff,#1f1235)}}</style>`;

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
      html: `${brandThemeStyle}<ax-theme theme="brand"><ax-button variant="primary">Brand action</ax-button></ax-theme>`,
    },
    {
      name: 'nested-dark',
      html: '<ax-theme theme="neutral" mode="dark"><ax-card><p>Loose dark text</p></ax-card></ax-theme>',
    },
  ],
  render(_host, h) {
    const mode = h.attr('mode');
    return `<div class="ax-theme" data-astryx-theme="${h.escape(h.attr('theme'))}"${mode === 'system' ? '' : ` data-theme="${mode}"`} ${h.slot()}></div>`;
  },
};
