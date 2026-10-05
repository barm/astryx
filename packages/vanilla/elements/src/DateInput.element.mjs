// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'DateInput',
  tag: 'ax-date-input',
  attributes: {
    label: {type: 'string', description: 'Visible field label.'},
    value: {
      type: 'string',
      default: '',
      liveProperty: 'value',
      reflect: {events: ['input', 'change'], property: 'value'},
      description: 'Selected ISO date.',
    },
    description: {type: 'string', description: 'Supporting help text.'},
    min: {type: 'string', description: 'Minimum ISO date.'},
    max: {type: 'string', description: 'Maximum ISO date.'},
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Visual input size.',
    },
    status: {
      type: 'enum',
      values: statuses,
      default: 'none',
      description: 'Current validation state.',
    },
    'status-message': {
      type: 'string',
      description: 'Displayed validation message.',
    },
    'is-required': {
      type: 'boolean',
      aliases: ['required'],
      aliasProperties: ['required'],
      default: false,
      description: 'Marks the input required.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables the native input.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Native form name.',
    },
  },
  slots: {
    label: {description: 'Visible field label.', required: true},
    description: 'Supporting help text.',
    'status-message': 'Displayed validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input[type="date"]',
  delegates: {
    properties: [
      'form',
      'validity',
      'validationMessage',
      'valueAsDate',
      'willValidate',
    ],
    methods: ['checkValidity', 'reportValidity', 'showPicker'],
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
  docs: 'Collect an ISO date with native picker, constraints, and form validation.',
  examples: [
    {
      name: 'default',
      html: `<ax-date-input label="Launch date"></ax-date-input>`,
    },
    {
      name: 'error',
      html: `<ax-date-input label="Renewal" status="error"></ax-date-input>`,
    },
  ],
  render(_host, h) {
    const id = h.id('input');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Date');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const status = h.attr('status');
    const classes = ['ax-date-input'];
    if (size !== 'md') classes.push(`ax-date-input--${size}`);
    if (status !== 'none') classes.push(`ax-date-input--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const attrs = ['class="ax-date-input__control"', `id="${id}"`];
    if (h.attr('html-name'))
      attrs.push(`name="${h.escape(h.attr('html-name'))}"`);
    attrs.push('type="date"');
    for (const name of ['min', 'max', 'value'])
      if (h.attr(name)) attrs.push(`${name}="${h.escape(h.attr(name))}"`);
    if (describedBy) attrs.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') attrs.push('aria-invalid="true"');
    if (h.attr('is-required')) attrs.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) attrs.push('disabled');
    return `<label class="${classes.join(' ')}" for="${id}">
  <span class="ax-date-input__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
  ${description.slotted || description.html ? `<span class="ax-date-input__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <input ${attrs.join(' ')} />
  ${message.slotted || message.html ? `<span class="ax-date-input__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</label>`;
  },
};
