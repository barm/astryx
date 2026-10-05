// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'CheckboxInput',
  tag: 'ax-checkbox-input',
  attributes: {
    label: {
      type: 'string',
      description: 'Field label.',
    },
    value: {
      type: 'boolean',
      aliases: ['checked'],
      aliasProperties: ['checked'],
      liveProperty: 'checked',
      reflect: {events: ['change'], property: 'checked'},
      default: false,
      description: 'Checked state.',
    },
    'is-indeterminate': {
      type: 'boolean',
      default: false,
      description: 'Mixed state.',
    },
    description: {
      type: 'string',
      description: 'Help text.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Checkbox size.',
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
      description: 'Disables native.',
    },
    'is-read-only': {
      type: 'boolean',
      aliases: ['readonly'],
      aliasProperties: ['readOnly'],
      default: false,
      description: 'Read-only state.',
    },
    'is-required': {
      type: 'boolean',
      aliases: ['required'],
      aliasProperties: ['required'],
      default: false,
      description: 'Required state.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Form name.',
    },
    'html-value': {
      type: 'string',
      default: 'on',
      description: 'Submit value.',
    },
  },
  slots: {
    label: {description: 'Label.', required: true},
    description: 'Help text.',
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input[type="checkbox"]',
  delegates: {
    properties: ['form', 'validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity'],
  },
  events: {
    change: 'Native event.',
  },
  hooks: {
    attributeChanged(_host, name, _oldValue, _newValue, api) {
      if (!api.control) return false;
      if (name === 'value') api.control.checked = api.read('value');
      else if (name === 'is-indeterminate') {
        api.control.indeterminate = api.read('is-indeterminate');
        if (api.control.indeterminate)
          api.control.setAttribute('aria-checked', 'mixed');
        else api.control.removeAttribute('aria-checked');
      } else if (name === 'is-disabled')
        api.control.disabled = api.read('is-disabled');
      else if (name === 'is-required')
        api.control.required = api.read('is-required');
      else return false;
      return true;
    },
    afterRender(host, api) {
      const control = api.control;
      const checked = api.read('value');
      if (!initialized.has(host)) {
        control.defaultChecked = checked;
        initialized.add(host);
      }
      control.checked = checked;
      control.indeterminate = api.read('is-indeterminate');
      if (control.indeterminate) control.setAttribute('aria-checked', 'mixed');
      else control.removeAttribute('aria-checked');
      if (api.read('is-read-only')) {
        api.listen(control, 'click', event => event.preventDefault());
      }
    },
  },
  docs: 'CheckboxInput custom element using native Astryx markup.',
  examples: [
    {
      name: 'default',
      html: `<ax-checkbox-input label="Updates"></ax-checkbox-input>`,
    },
    {
      name: 'checked',
      html: `<ax-checkbox-input label="Usage" value></ax-checkbox-input>`,
    },
  ],
  render(_host, h) {
    const label = h.content('label', 'label', 'Checkbox');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const status = h.attr('status');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const classes = ['ax-checkbox-input'];
    if (size !== 'md') classes.push(`ax-checkbox-input--${size}`);
    if (status !== 'none') classes.push(`ax-checkbox-input--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const input = ['class="ax-checkbox-input__control"', 'type="checkbox"'];
    if (h.attr('html-name'))
      input.push(`name="${h.escape(h.attr('html-name'))}"`);
    if (h.attr('html-value') !== 'on')
      input.push(`value="${h.escape(h.attr('html-value'))}"`);
    if (h.attr('value')) input.push('checked');
    if (h.attr('is-disabled')) input.push('disabled');
    if (h.attr('is-required')) input.push('required', 'aria-required="true"');
    if (h.attr('is-indeterminate')) input.push('aria-checked="mixed"');
    if (status === 'error') input.push('aria-invalid="true"');
    if (describedBy) input.push(`aria-describedby="${describedBy}"`);
    return `<label class="${classes.join(' ')}">
  <input ${input.join(' ')} />
  <span class="ax-checkbox-input__box" aria-hidden="true"></span>
  <span class="ax-checkbox-input__content">
    <span class="ax-checkbox-input__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
    ${description.slotted || description.html ? `<span class="ax-checkbox-input__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
    ${message.slotted || message.html ? `<span class="ax-checkbox-input__description" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
  </span>
</label>`;
  },
};
