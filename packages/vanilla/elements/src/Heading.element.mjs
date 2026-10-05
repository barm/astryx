// Copyright (c) Meta Platforms, Inc. and affiliates.

const levels = ['1', '2', '3', '4', '5', '6'];
const colors = [
  'primary',
  'secondary',
  'disabled',
  'placeholder',
  'accent',
  'inherit',
];
const weights = ['normal', 'medium', 'semibold', 'bold'];

export default {
  name: 'Heading',
  tag: 'ax-heading',
  attributes: {
    level: {
      type: 'enum',
      values: levels,
      default: '2',
      description: 'Semantic heading level from 1 through 6.',
    },
    'accessibility-level': {
      type: 'enum',
      values: levels,
      description: 'ARIA heading level when it differs from the element level.',
    },
    color: {
      type: 'enum',
      values: colors,
      default: 'primary',
      description: 'Semantic text color.',
    },
    weight: {
      type: 'enum',
      values: weights,
      description: 'Explicit font-weight override.',
    },
  },
  slots: {
    default: {description: 'Heading text and inline content.', required: true},
  },
  docs: 'Render a semantic h1 through h6 with Astryx heading typography.',
  examples: [
    {name: 'page-title', html: '<ax-heading level="1">Page title</ax-heading>'},
    {
      name: 'section-title',
      html: '<ax-heading level="2" color="secondary">Section title</ax-heading>',
    },
  ],
  render(_host, h) {
    const level = h.attr('level');
    const classes = ['ax-heading', `ax-heading--${level}`];
    const color = h.attr('color');
    const weight = h.attr('weight');
    if (color !== 'primary' && color !== 'inherit')
      classes.push(`ax-text--${color}`);
    if (weight && weight !== 'normal') classes.push(`ax-text--${weight}`);
    const ariaLevel = h.attr('accessibility-level');
    return `<h${level} class="${classes.join(' ')}"${ariaLevel && ariaLevel !== level ? ` aria-level="${ariaLevel}"` : ''} ${h.slot()}></h${level}>`;
  },
};
