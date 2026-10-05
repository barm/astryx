// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'TextArea',
  tag: 'ax-text-area',
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
    placeholder: {type: 'string', description: 'Native placeholder.'},
    rows: {type: 'string', default: '3', description: 'Visible text rows.'},
    'max-length': {type: 'string', description: 'Native maximum.'},
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Textarea size.',
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
      description: 'Marks textarea.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables textarea.',
    },
    'is-read-only': {
      type: 'boolean',
      aliases: ['readonly'],
      aliasProperties: ['readOnly'],
      default: false,
      description: 'Makes textarea.',
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
    'has-spell-check': {
      type: 'boolean',
      aliases: ['spellcheck'],
      aliasProperties: ['spellcheck'],
      default: true,
      description: 'Enables browser.',
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
  docs: 'TextArea custom element using native Astryx markup.',
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
    return `<label class="${classes.join(' ')}" for="${id}">
  <span class="ax-text-area__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
  ${description.slotted || description.html ? `<span class="ax-text-area__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <textarea ${attrs.join(' ')}>${h.escape(h.attr('value'))}</textarea>
  ${message.slotted || message.html ? `<span class="ax-text-area__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</label>`;
  },
};
