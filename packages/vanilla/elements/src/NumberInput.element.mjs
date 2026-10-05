// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'NumberInput',
  tag: 'ax-number-input',
  attributes: {
    label: {type: 'string', description: 'Field label.'},
    value: {
      type: 'string',
      default: '',
      liveProperty: 'value',
      reflect: {events: ['input', 'change'], property: 'value'},
      description: 'Current value.',
    },
    description: {type: 'string', description: 'Help text.'},
    units: {type: 'string', description: 'Visible units.'},
    min: {type: 'string', description: 'Native minimum.'},
    max: {type: 'string', description: 'Native maximum.'},
    step: {type: 'string', default: '1', description: 'Native step.'},
    placeholder: {type: 'string', description: 'Native placeholder.'},
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Input size.',
    },
    status: {
      type: 'enum',
      values: statuses,
      default: 'none',
      description: 'Validation state.',
    },
    'status-message': {type: 'string', description: 'Validation message.'},
    'is-required': {
      type: 'boolean',
      aliases: ['required'],
      aliasProperties: ['required'],
      default: false,
      description: 'Marks input.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables input.',
    },
    'is-read-only': {
      type: 'boolean',
      aliases: ['readonly'],
      aliasProperties: ['readOnly'],
      default: false,
      description: 'Makes input.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Form name.',
    },
    'auto-complete': {
      type: 'string',
      aliases: ['autocomplete'],
      aliasProperties: ['autocomplete'],
      description: 'Native autocomplete.',
    },
  },
  slots: {
    label: {description: 'Label.', required: true},
    description: 'Help text.',
    units: 'Visible units suffix.',
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'units', slot: 'units'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input[type="number"]',
  delegates: {
    properties: [
      'form',
      'validity',
      'validationMessage',
      'valueAsNumber',
      'willValidate',
    ],
    methods: [
      'checkValidity',
      'reportValidity',
      'select',
      'stepDown',
      'stepUp',
    ],
  },
  events: {
    input: 'Native event.',
    change: 'Native event.',
  },
  hooks: {
    attributeChanged(_host, name, _oldValue, _newValue, api) {
      if (!api.control) return false;
      if (name === 'value') api.control.value = api.read('value');
      else if (name === 'is-disabled')
        api.control.disabled = api.read('is-disabled');
      else if (name === 'is-required')
        api.control.required = api.read('is-required');
      else if (name === 'is-read-only')
        api.control.readOnly = api.read('is-read-only');
      else return false;
      return true;
    },
    afterRender(host, api) {
      const value = api.read('value');
      if (!initialized.has(host)) {
        api.control.defaultValue = value;
        initialized.add(host);
      }
      if (api.control.value !== value) api.control.value = value;
    },
  },
  docs: 'NumberInput custom element using native Astryx markup.',
  examples: [
    {
      name: 'default',
      html: `<ax-number-input label="Seats" value="12"></ax-number-input>`,
    },
    {
      name: 'error',
      html: `<ax-number-input label="Days" status="error"></ax-number-input>`,
    },
  ],
  render(_host, h) {
    const id = h.id('input');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Number');
    const description = h.content('description', 'description');
    const units = h.content('units', 'units');
    const message = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const status = h.attr('status');
    const classes = ['ax-number-input'];
    if (size !== 'md') classes.push(`ax-number-input--${size}`);
    if (status !== 'none') classes.push(`ax-number-input--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const attrs = ['class="ax-number-input__input"', `id="${id}"`];
    if (h.attr('html-name'))
      attrs.push(`name="${h.escape(h.attr('html-name'))}"`);
    attrs.push('type="number"');
    for (const name of ['min', 'max', 'step'])
      if (h.attr(name)) attrs.push(`${name}="${h.escape(h.attr(name))}"`);
    if (h.attr('value') !== '')
      attrs.push(`value="${h.escape(h.attr('value'))}"`);
    if (h.attr('placeholder'))
      attrs.push(`placeholder="${h.escape(h.attr('placeholder'))}"`);
    if (h.attr('auto-complete'))
      attrs.push(`autocomplete="${h.escape(h.attr('auto-complete'))}"`);
    if (describedBy) attrs.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') attrs.push('aria-invalid="true"');
    if (h.attr('is-required')) attrs.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) attrs.push('disabled');
    if (h.attr('is-read-only')) attrs.push('readonly');
    return `<label class="${classes.join(' ')}" for="${id}">
  <span class="ax-number-input__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
  ${description.slotted || description.html ? `<span class="ax-number-input__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <span class="ax-number-input__control">
    <input ${attrs.join(' ')} />
    ${units.slotted || units.html ? `<span class="ax-number-input__unit" aria-hidden="true"${units.slotted ? ` ${h.slot('units')}` : ''}>${units.html}</span>` : ''}
  </span>
  ${message.slotted || message.html ? `<span class="ax-number-input__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</label>`;
  },
};
