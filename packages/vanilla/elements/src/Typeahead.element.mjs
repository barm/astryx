// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'Typeahead',
  tag: 'ax-typeahead',
  attributes: {
    label: {type: 'string', description: 'Field label.'},
    value: {
      type: 'string',
      default: '',
      liveProperty: 'value',
      reflect: {events: ['input', 'change'], property: 'value'},
      description: 'Search value.',
    },
    description: {type: 'string', description: 'Help text.'},
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
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Form name.',
    },
    'list-id': {
      type: 'string',
      description: 'ID used.',
    },
    'auto-complete': {
      type: 'string',
      aliases: ['autocomplete'],
      aliasProperties: ['autocomplete'],
      default: 'off',
      description: 'Native autocomplete.',
    },
  },
  slots: {
    label: {description: 'Label.', required: true},
    description: 'Help text.',
    default: {
      description: 'Native option.',
      required: true,
    },
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input[list]',
  delegates: {
    properties: ['form', 'validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity', 'select', 'setSelectionRange'],
  },
  events: {
    input: 'Native event.',
    change: 'Native event.',
    'astryx:query': 'Custom event.',
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
        if (host.hasAttribute('value')) api.control.defaultValue = value;
        initialized.add(host);
      }
      if (api.control.value !== value) api.control.value = value;
      api.listen(api.control, 'input', () =>
        api.dispatch('astryx:query', {query: api.control.value}),
      );
    },
  },
  docs: 'Typeahead custom element using native Astryx markup.',
  examples: [
    {
      name: 'default',
      html: `<ax-typeahead label="Assignee"><option value="Alex"></option></ax-typeahead>`,
    },
    {
      name: 'error',
      html: `<ax-typeahead label="Owner" status="error"><option value="Design"></option></ax-typeahead>`,
    },
  ],
  render(_host, h) {
    const id = h.id('input');
    const listID = h.attr('list-id') || h.id('options');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Search');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const status = h.attr('status');
    const classes = ['ax-typeahead'];
    if (size !== 'md') classes.push(`ax-typeahead--${size}`);
    if (status !== 'none') classes.push(`ax-typeahead--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const attrs = ['class="ax-typeahead__input"', `id="${id}"`];
    if (h.attr('html-name'))
      attrs.push(`name="${h.escape(h.attr('html-name'))}"`);
    attrs.push(
      'type="text"',
      `list="${listID}"`,
      `autocomplete="${h.escape(h.attr('auto-complete'))}"`,
    );
    if (h.attr('value')) attrs.push(`value="${h.escape(h.attr('value'))}"`);
    if (h.attr('placeholder'))
      attrs.push(`placeholder="${h.escape(h.attr('placeholder'))}"`);
    if (describedBy) attrs.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') attrs.push('aria-invalid="true"');
    if (h.attr('is-required')) attrs.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) attrs.push('disabled');
    return `<label class="${classes.join(' ')}" for="${id}">
  <span class="ax-typeahead__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
  ${description.slotted || description.html ? `<span class="ax-typeahead__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <span class="ax-typeahead__control"><span class="ax-typeahead__icon" aria-hidden="true">⌕</span><input ${attrs.join(' ')} /></span>
  <datalist id="${listID}" ${h.slot()}></datalist>
  ${message.slotted || message.html ? `<span class="ax-typeahead__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</label>`;
  },
};
