// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = ['primary', 'secondary', 'ghost', 'destructive'];
const sizes = ['sm', 'md', 'lg'];
const types = ['button', 'submit', 'reset'];

export default {
  name: 'Button',
  tag: 'ax-button',
  attributes: {
    label: {
      type: 'string',
      description: 'Visible button label when no child content is authored.',
    },
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
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables native activation.',
    },
    name: {type: 'string', description: 'Native form field name.'},
    value: {type: 'string', description: 'Native form submission value.'},
    form: {type: 'string', description: 'ID of the associated form.'},
    href: {type: 'string', description: 'Optional native link destination.'},
  },
  slots: {
    default: {
      description: 'Visible button label and inline content.',
      required: true,
    },
  },
  content: [{attribute: 'label', slot: 'default', required: true}],
  control: 'button, a',
  delegates: {
    properties: ['validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity'],
  },
  events: {
    click: 'Native activation event from the inner button or link.',
  },
  docs: 'Trigger an action with primary, secondary, ghost, or destructive emphasis.',
  examples: [
    {
      name: 'primary',
      html: `<ax-button variant="primary">
  Continue
</ax-button>`,
    },
    {
      name: 'disabled-label',
      html: `<ax-button label="Continue" variant="primary" is-disabled></ax-button>`,
    },
    {
      name: 'state-loading-success',
      gallery: false,
      html: `<ax-button label="Wait → Done" is-disabled></ax-button>`,
    },
  ],
  hooks: {
    afterRender(host, api) {
      if (api.read('href') && api.read('is-disabled')) {
        api.listen(api.control, 'click', event => event.preventDefault());
      }
      if (
        host.hasAttribute('autofocus') &&
        document.activeElement === document.body
      ) {
        api.control?.focus();
      }
    },
  },
  render(_host, h) {
    const variant = h.attr('variant');
    const size = h.attr('size');
    const href = h.attr('href');
    const content = h.content('label');
    const classes = ['ax-button', `ax-button--${variant}`];
    if (size !== 'md') classes.push(`ax-button--${size}`);
    const attributes = [`class="${classes.join(' ')}"`];
    if (href) {
      attributes.push(`href="${h.escape(href)}"`);
      if (h.attr('is-disabled')) {
        attributes.push('aria-disabled="true"', 'tabindex="-1"');
      }
    } else {
      attributes.push(`type="${h.escape(h.attr('type'))}"`);
      if (h.attr('is-disabled')) attributes.push('disabled');
      for (const name of ['name', 'value', 'form']) {
        const value = h.attr(name);
        if (value) attributes.push(`${name}="${h.escape(value)}"`);
      }
    }
    const contentRegion = content.slotted ? ` ${h.slot()}` : '';
    return `<${href ? 'a' : 'button'} ${attributes.join(' ')}${contentRegion}>${content.html}</${href ? 'a' : 'button'}>`;
  },
};
