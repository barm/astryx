// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = [
  'neutral',
  'info',
  'success',
  'warning',
  'error',
  'blue',
  'cyan',
  'green',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
];

export default {
  name: 'Badge',
  tag: 'ax-badge',
  attributes: {
    label: {
      type: 'string',
      description: 'Visible badge label when no child content is authored.',
    },
    variant: {
      type: 'enum',
      values: variants,
      default: 'neutral',
      description: 'Semantic status or category color.',
    },
  },
  slots: {
    default: {description: 'Short status or category label.', required: true},
  },
  content: [{attribute: 'label', slot: 'default', required: true}],
  docs: 'Label status or category with compact semantic color.',
  examples: [
    {name: 'neutral', html: '<ax-badge>Draft</ax-badge>'},
    {
      name: 'success-label',
      html: '<ax-badge label="Ready" variant="success"></ax-badge>',
    },
  ],
  render(_host, h) {
    const variant = h.attr('variant');
    const content = h.content('label');
    const classes = ['ax-badge'];
    if (variant !== 'neutral') classes.push(`ax-badge--${variant}`);
    return `<span class="${classes.join(' ')}"${content.slotted ? ` ${h.slot()}` : ''}>${content.html}</span>`;
  },
};
