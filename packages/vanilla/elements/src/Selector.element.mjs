// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const variants = ['input', 'ghost'];
const statuses = ['none', 'error', 'success'];
const initializedSelectors = new WeakSet();

export default {
  name: 'Selector',
  tag: 'ax-selector',
  attributes: {
    label: {type: 'string', description: 'Visible and accessible field label.'},
    value: {
      type: 'string',
      default: '',
      liveProperty: 'value',
      reflect: {
        events: ['change'],
        property: 'value',
        get(host, target, _event, api) {
          if (api.read('is-read-only')) {
            target.value = host.getAttribute('value') ?? '';
            return undefined;
          }
          return target.value;
        },
      },
      description:
        'Selected option value, reflected after native change events.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Control size matching Selector size.',
    },
    variant: {
      type: 'enum',
      values: variants,
      default: 'input',
      description: 'Bordered input or ghost toolbar presentation.',
    },
    status: {
      type: 'enum',
      values: statuses,
      default: 'none',
      description: 'Current validation state.',
    },
    description: {type: 'string', description: 'Supporting field description.'},
    'status-message': {
      type: 'string',
      description: 'Validation message associated with the native select.',
    },
    'is-required': {
      type: 'boolean',
      aliases: ['required'],
      aliasProperties: ['required'],
      default: false,
      description: 'Marks the native select required.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables the native select.',
    },
    'is-read-only': {
      type: 'boolean',
      aliases: ['readonly'],
      aliasProperties: ['readOnly'],
      default: false,
      description:
        'Prevents value changes while preserving focus and submission.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Native form field name.',
    },
  },
  slots: {
    label: {description: 'Visible field label.', required: true},
    default: {
      description: 'Native option and optgroup children.',
      required: true,
    },
    description: 'Supporting field description.',
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'select',
  delegates: {
    properties: ['form', 'validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity'],
  },
  events: {
    change: 'Native selection event; value is reflected to the host.',
  },
  docs: 'Choose one value from a moderate list with a native select control.',
  examples: [
    {
      name: 'default',
      html: `<ax-selector label="Workspace" html-name="workspace">
  <option value="design">Design systems</option>
  <option value="tools">Developer tools</option>
</ax-selector>`,
    },
    {
      name: 'compact',
      html: `<ax-selector label="Status" size="sm">
  <option>Active</option>
  <option>Paused</option>
</ax-selector>`,
    },
  ],
  hooks: {
    attributeChanged(_host, name, _oldValue, _newValue, api) {
      if (!api.control) return false;
      if (name === 'value') api.control.value = api.read('value');
      else if (name === 'is-disabled')
        api.control.disabled = api.read('is-disabled');
      else if (name === 'is-required')
        api.control.required = api.read('is-required');
      else if (name === 'is-read-only') {
        api.control.setAttribute(
          'aria-readonly',
          String(api.read('is-read-only')),
        );
      } else return false;
      return true;
    },
    afterRender(host, api) {
      const value = api.read('value');
      if (api.control?.value !== value) api.control.value = value;
      if (!initializedSelectors.has(host)) {
        for (const option of api.control?.options ?? []) {
          option.defaultSelected = option.selected;
        }
        initializedSelectors.add(host);
      }
    },
  },
  render(_host, h) {
    const selectID = h.id('select');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Select an option');
    const description = h.content('description', 'description');
    const statusMessage = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const variant = h.attr('variant');
    const status = h.attr('status');
    const classes = ['ax-selector'];
    if (size !== 'md') classes.push(`ax-selector--${size}`);
    if (variant !== 'input') classes.push(`ax-selector--${variant}`);
    if (status !== 'none') classes.push(`ax-selector--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (statusMessage.slotted || statusMessage.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const selectAttributes = [
      `id="${selectID}"`,
      'class="ax-selector__select"',
    ];
    if (h.attr('html-name')) {
      selectAttributes.push(`name="${h.escape(h.attr('html-name'))}"`);
    }
    if (describedBy) selectAttributes.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') selectAttributes.push('aria-invalid="true"');
    if (h.attr('is-required'))
      selectAttributes.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) selectAttributes.push('disabled');
    if (h.attr('is-read-only')) selectAttributes.push('aria-readonly="true"');

    return `<div class="${classes.join(' ')}">
  <label class="ax-selector__label" for="${selectID}"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</label>
  <span class="ax-selector__control">
    <select ${selectAttributes.join(' ')} ${h.slot()}></select>
    <span class="ax-selector__indicator" aria-hidden="true"></span>
  </span>
  ${description.slotted || description.html ? `<span class="ax-selector__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  ${statusMessage.slotted || statusMessage.html ? `<span class="ax-selector__description" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${statusMessage.slotted ? ` ${h.slot('status-message')}` : ''}>${statusMessage.html}</span>` : ''}
</div>`;
  },
};
