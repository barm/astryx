// Copyright (c) Meta Platforms, Inc. and affiliates.

const types = ['body', 'large', 'label', 'supporting', 'code', 'inherit'];
const colors = [
  'primary',
  'secondary',
  'disabled',
  'placeholder',
  'accent',
  'inherit',
];
const weights = ['normal', 'medium', 'semibold', 'bold'];
const elements = ['span', 'p', 'div', 'label', 'code'];

export default {
  name: 'Text',
  tag: 'ax-text',
  attributes: {
    type: {
      type: 'enum',
      values: types,
      default: 'body',
      description: 'Semantic text type.',
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
    display: {
      type: 'enum',
      values: ['inline', 'block'],
      default: 'inline',
      description: 'Inline or block display.',
    },
    as: {
      type: 'enum',
      values: elements,
      default: 'span',
      description: 'Allowed native text element.',
    },
    'max-lines': {
      type: 'string',
      default: '0',
      description: 'Maximum visible lines; zero disables truncation.',
    },
    'has-strikethrough': {
      type: 'boolean',
      default: false,
      description: 'Applies a line-through decoration.',
    },
    'has-tabular-numbers': {
      type: 'boolean',
      default: false,
      description: 'Uses tabular number spacing.',
    },
  },
  slots: {default: {description: 'Text content.', required: true}},
  docs: 'Render semantic body, supporting, label, large, or code text.',
  examples: [
    {name: 'body', html: '<ax-text as="p">Readable body copy.</ax-text>'},
    {
      name: 'supporting',
      gallery: false,
      html: '<ax-text as="p" type="supporting" color="secondary">Supporting detail</ax-text>',
    },
    {
      name: 'code',
      html: '<ax-text as="code" type="code">const ready = true;</ax-text>',
    },
  ],
  render(_host, h) {
    const tag = h.attr('as');
    const type = h.attr('type');
    const color = h.attr('color');
    const weight = h.attr('weight');
    const classes = ['ax-text'];
    if (type !== 'body' && type !== 'inherit') classes.push(`ax-text--${type}`);
    if (color !== 'primary' && color !== 'inherit' && color !== 'placeholder')
      classes.push(`ax-text--${color}`);
    if (weight && weight !== 'normal') classes.push(`ax-text--${weight}`);
    const styles = [];
    if (h.attr('display') === 'block') styles.push('display:block');
    if (h.attr('has-strikethrough'))
      styles.push('text-decoration:line-through');
    if (h.attr('has-tabular-numbers'))
      styles.push('font-variant-numeric:tabular-nums');
    const maxLines = Number(h.attr('max-lines'));
    if (Number.isFinite(maxLines) && maxLines > 0)
      styles.push(
        'display:-webkit-box',
        `-webkit-line-clamp:${maxLines}`,
        '-webkit-box-orient:vertical',
        'overflow:hidden',
      );
    return `<${tag} class="${classes.join(' ')}"${styles.length ? ` style="${styles.join(';')}"` : ''} ${h.slot()}></${tag}>`;
  },
};
