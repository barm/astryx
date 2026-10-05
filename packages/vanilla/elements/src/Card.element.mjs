// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = [
  'default',
  'transparent',
  'muted',
  'blue',
  'cyan',
  'gray',
  'green',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
];
const elevations = ['none', 'low', 'med', 'high'];

export default {
  name: 'Card',
  tag: 'ax-card',
  attributes: {
    variant: {
      type: 'enum',
      values: variants,
      default: 'default',
      description: 'Card surface variant.',
    },
    elevation: {
      type: 'enum',
      values: elevations,
      default: 'none',
      description: 'Resting shadow depth.',
    },
  },
  slots: {
    header: 'Optional heading content.',
    default: 'Card body content.',
    footer: 'Optional actions or supporting content.',
  },
  docs: 'Group related content in a bordered or elevated surface.',
  examples: [
    {
      name: 'default',
      html: `<ax-card>
  <h2 slot="header">Card title</h2>
  <p>Card content</p>
</ax-card>`,
    },
    {
      name: 'elevated',
      html: `<ax-card elevation="low">
  <p>Elevated card</p>
  <ax-button slot="footer" variant="primary">Action</ax-button>
</ax-card>`,
    },
  ],
  render(_host, h) {
    const classes = ['ax-card'];
    const variant = h.attr('variant');
    const elevation = h.attr('elevation');
    if (variant !== 'default') classes.push(`ax-card--${variant}`);
    if (elevation !== 'none') classes.push(`ax-card--elevation-${elevation}`);
    return `<article class="${classes.join(' ')}">
  ${h.hasSlot('header') ? `<header class="ax-card__header" ${h.slot('header')}></header>` : ''}
  <div class="ax-card__body" ${h.slot()}></div>
  ${h.hasSlot('footer') ? `<footer class="ax-card__footer" ${h.slot('footer')}></footer>` : ''}
</article>`;
  },
};
