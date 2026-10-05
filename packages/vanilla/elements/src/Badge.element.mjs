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
    variant: {
      type: 'enum',
      values: variants,
      default: 'neutral',
      description: 'Semantic status or category color.',
    },
  },
  slots: {default: 'Short status or category label.'},
  docs: 'Label status or category with compact semantic color.',
  examples: [
    {name: 'neutral', html: '<ax-badge>Draft</ax-badge>'},
    {name: 'success', html: '<ax-badge variant="success">Ready</ax-badge>'},
  ],
  render(_host, h) {
    const variant = h.attr('variant');
    const classes = ['ax-badge'];
    if (variant !== 'neutral') classes.push(`ax-badge--${variant}`);
    return `<span class="${classes.join(' ')}" ${h.slot()}></span>`;
  },
};
