// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = ['primary', 'secondary', 'ghost', 'destructive'];
const sizes = ['sm', 'md', 'lg'];
const types = ['button', 'submit', 'reset'];

export default {
  name: 'Button',
  tag: 'ax-button',
  attributes: {
    variant: {
      type: 'enum',
      values: variants,
      default: 'secondary',
      description: 'Visual emphasis matching Button variant.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Control size matching Button size.',
    },
    type: {
      type: 'enum',
      values: types,
      default: 'button',
      description: 'Native button type.',
    },
    'is-disabled': {
      type: 'boolean',
      default: false,
      description: 'Disables native activation.',
    },
    name: {type: 'string', description: 'Native form field name.'},
    value: {type: 'string', description: 'Native form submission value.'},
    form: {type: 'string', description: 'ID of the associated form.'},
  },
  slots: {
    default: 'Visible button label and inline content.',
  },
  docs: 'Trigger an action with primary, secondary, ghost, or destructive emphasis.',
  examples: [
    {
      name: 'primary',
      html: '<ax-button variant="primary">Continue</ax-button>',
    },
    {
      name: 'disabled',
      html: '<ax-button variant="primary" is-disabled>Continue</ax-button>',
    },
  ],
  render(_host, h) {
    const variant = h.attr('variant');
    const size = h.attr('size');
    const classes = ['ax-button', `ax-button--${variant}`];
    if (size !== 'md') classes.push(`ax-button--${size}`);
    const attributes = [
      `class="${classes.join(' ')}"`,
      `type="${h.escape(h.attr('type'))}"`,
    ];
    if (h.attr('is-disabled')) attributes.push('disabled');
    for (const name of ['name', 'value', 'form']) {
      const value = h.attr(name);
      if (value) attributes.push(`${name}="${h.escape(value)}"`);
    }
    return `<button ${attributes.join(' ')} ${h.slot()}></button>`;
  },
};
