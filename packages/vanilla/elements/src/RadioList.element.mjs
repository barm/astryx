// Copyright (c) Meta Platforms, Inc. and affiliates.

const orientations = ['vertical', 'horizontal'];
const sizes = ['sm', 'md'];
const statuses = ['none', 'error', 'warning', 'success'];

function radios(api) {
  return api.queryAll('input[type="radio"]');
}

function syncRadios(host, api) {
  const value = api.read('value');
  const name = api.read('html-name') || `${host.id || 'ax-radio-list'}-group`;
  for (const radio of radios(api)) {
    radio.name = name;
    radio.checked = radio.value === value;
    radio.defaultChecked = radio.checked;
    radio.disabled =
      api.read('is-disabled') || radio.hasAttribute('data-ax-item-disabled');
    radio.required = api.read('is-required');
  }
}

export default {
  name: 'RadioList',
  tag: 'ax-radio-list',
  attributes: {
    label: {type: 'string', description: 'Field label.'},
    value: {
      type: 'string',
      default: '',
      description: 'Selected child.',
    },
    description: {type: 'string', description: 'Help text.'},
    orientation: {
      type: 'enum',
      values: orientations,
      default: 'vertical',
      description: 'Vertical horizontal.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Radio size.',
    },
    status: {
      type: 'enum',
      values: statuses,
      default: 'none',
      description: 'Validation state.',
    },
    'status-message': {type: 'string', description: 'Validation message.'},
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables all.',
    },
    'is-required': {
      type: 'boolean',
      aliases: ['required'],
      aliasProperties: ['required'],
      default: false,
      description: 'Marks radio.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Shared native.',
    },
  },
  slots: {
    label: {description: 'Group label.', required: true},
    description: 'Help text.',
    default: {
      description: 'Native radio.',
      required: true,
    },
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input[type="radio"]',
  delegates: {
    properties: ['form', 'validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity'],
  },
  events: {
    change: 'Native event.',
  },
  hooks: {
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (!api.control) return false;
      if (['value', 'is-disabled', 'is-required', 'html-name'].includes(name)) {
        syncRadios(host, api);
        return true;
      }
      return false;
    },
    afterRender(host, api) {
      syncRadios(host, api);
      for (const radio of radios(api)) {
        api.listen(radio, 'change', () => {
          if (!radio.checked) return;
          api.reflect('value', radio.value);
          api.dispatch('astryx:change', {value: radio.value});
        });
      }
    },
  },
  docs: 'RadioList custom element using native Astryx markup.',
  examples: [
    {
      name: 'default',
      html: `<ax-radio-list label="Plan"><label><input type="radio" value="a" />A</label></ax-radio-list>`,
    },
    {
      name: 'horizontal',
      html: `<ax-radio-list label="Plan" orientation="horizontal"><label><input type="radio" value="b" />B</label></ax-radio-list>`,
    },
  ],
  render(_host, h) {
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Options');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const orientation = h.attr('orientation');
    const size = h.attr('size');
    const status = h.attr('status');
    const classes = ['ax-radio-list'];
    if (orientation !== 'vertical')
      classes.push(`ax-radio-list--${orientation}`);
    if (size !== 'md') classes.push(`ax-radio-list--${size}`);
    if (status !== 'none') classes.push(`ax-radio-list--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const attrs = [`class="${classes.join(' ')}"`];
    if (describedBy) attrs.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') attrs.push('aria-invalid="true"');
    if (h.attr('is-disabled')) attrs.push('disabled');
    return `<fieldset ${attrs.join(' ')}>
  <legend class="ax-radio-list__legend"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</legend>
  ${description.slotted || description.html ? `<span class="ax-radio-list__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <span class="ax-radio-list__items" ${h.slot()}></span>
  ${message.slotted || message.html ? `<span class="ax-radio-list__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</fieldset>`;
  },
};
