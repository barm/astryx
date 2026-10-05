// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'TextArea',
  tag: 'ax-text-area',
  attributes: {
    label: {type: 'string', description: 'Visible field label.'},
    value: {
      type: 'string',
      default: '',
      liveProperty: 'value',
      reflect: {events: ['input', 'change'], property: 'value'},
      description: 'Current input value.',
    },
    description: {type: 'string', description: 'Supporting help text.'},
    placeholder: {type: 'string', description: 'Native placeholder text.'},
    rows: {type: 'string', default: '3', description: 'Visible text rows.'},
    'max-length': {type: 'string', description: 'Native maximum value.'},
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Visual textarea size.',
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
      description: 'Marks the textarea required.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables the native textarea.',
    },
    'is-read-only': {
      type: 'boolean',
      aliases: ['readonly'],
      aliasProperties: ['readOnly'],
      default: false,
      description: 'Makes the textarea read-only.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Native form name.',
    },
    'auto-complete': {
      type: 'string',
      aliases: ['autocomplete'],
      aliasProperties: ['autocomplete'],
      description: 'Native autocomplete hint.',
    },
    'has-spell-check': {
      type: 'boolean',
      aliases: ['spellcheck'],
      aliasProperties: ['spellcheck'],
      default: true,
      description: 'Enabled by default; set false to disable.',
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
  control: 'textarea',
  delegates: {
    properties: ['form', 'validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity', 'select', 'setSelectionRange'],
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
      else if (name === 'has-spell-check')
        api.control.spellcheck = api.read('has-spell-check');
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
  docs: 'Collect multiline text with native validation, form participation, and reflected value.',
  examples: [
    {name: 'default', html: `<ax-text-area label="Summary"></ax-text-area>`},
    {
      name: 'error',
      html: `<ax-text-area label="Notes" status="error"></ax-text-area>`,
    },
  ],
  render(_host, h) {
    const id = h.id('textarea');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Text area');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const status = h.attr('status');
    const classes = ['ax-text-area'];
    if (size !== 'md') classes.push(`ax-text-area--${size}`);
    if (status !== 'none') classes.push(`ax-text-area--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const attrs = ['class="ax-text-area__control"', `id="${id}"`];
    if (h.attr('html-name'))
      attrs.push(`name="${h.escape(h.attr('html-name'))}"`);
    attrs.push(`rows="${h.escape(h.attr('rows'))}"`);
    if (describedBy) attrs.push(`aria-describedby="${describedBy}"`);
    if (h.attr('placeholder'))
      attrs.push(`placeholder="${h.escape(h.attr('placeholder'))}"`);
    if (h.attr('max-length'))
      attrs.push(`maxlength="${h.escape(h.attr('max-length'))}"`);
    if (h.attr('auto-complete'))
      attrs.push(`autocomplete="${h.escape(h.attr('auto-complete'))}"`);
    if (status === 'error') attrs.push('aria-invalid="true"');
    if (h.attr('is-required')) attrs.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) attrs.push('disabled');
    if (h.attr('is-read-only')) attrs.push('readonly');
    if (!h.attr('has-spell-check')) attrs.push('spellcheck="false"');
    return `<label class="${classes.join(' ')}" for="${id}">
  <span class="ax-text-area__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
  ${description.slotted || description.html ? `<span class="ax-text-area__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <textarea ${attrs.join(' ')}>${h.escape(h.attr('value'))}</textarea>
  ${message.slotted || message.html ? `<span class="ax-text-area__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</label>`;
  },
};
