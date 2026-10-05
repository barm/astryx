// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md'];
const positions = ['start', 'end'];
const spacings = ['hug', 'spread'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

export default {
  name: 'Switch',
  tag: 'ax-switch',
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
    description: {
      type: 'string',
      description: 'Help text.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Switch size.',
    },
    'label-position': {
      type: 'enum',
      values: positions,
      default: 'end',
      description: 'Label switch.',
    },
    'label-spacing': {
      type: 'enum',
      values: spacings,
      default: 'hug',
      description: 'Hug spread.',
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
  control: 'input[role="switch"]',
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
      else if (name === 'is-disabled')
        api.control.disabled = api.read('is-disabled');
      else if (name === 'is-required')
        api.control.required = api.read('is-required');
      else return false;
      return true;
    },
    afterRender(host, api) {
      const checked = api.read('value');
      if (!initialized.has(host)) {
        api.control.defaultChecked = checked;
        initialized.add(host);
      }
      api.control.checked = checked;
    },
  },
  docs: 'Switch custom element using native Astryx markup.',
  examples: [
    {name: 'default', html: `<ax-switch label="Alerts"></ax-switch>`},
    {name: 'checked', html: `<ax-switch label="Dark mode" value></ax-switch>`},
  ],
  render(_host, h) {
    const label = h.content('label', 'label', 'Switch');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const size = h.attr('size');
    const status = h.attr('status');
    const position = h.attr('label-position');
    const spacing = h.attr('label-spacing');
    const classes = ['ax-switch'];
    if (size !== 'md') classes.push(`ax-switch--${size}`);
    if (position === 'start') classes.push('ax-switch--label-start');
    if (spacing === 'spread') classes.push('ax-switch--spread');
    if (status !== 'none') classes.push(`ax-switch--${status}`);
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const input = [
      'class="ax-switch__control"',
      'type="checkbox"',
      'role="switch"',
    ];
    if (h.attr('html-name'))
      input.push(`name="${h.escape(h.attr('html-name'))}"`);
    if (h.attr('html-value') !== 'on')
      input.push(`value="${h.escape(h.attr('html-value'))}"`);
    if (h.attr('value')) input.push('checked');
    if (h.attr('is-disabled')) input.push('disabled');
    if (h.attr('is-required')) input.push('required', 'aria-required="true"');
    if (status === 'error') input.push('aria-invalid="true"');
    if (describedBy) input.push(`aria-describedby="${describedBy}"`);
    return `<label class="${classes.join(' ')}">
  <input ${input.join(' ')} />
  <span class="ax-switch__track" aria-hidden="true"><span class="ax-switch__thumb"></span></span>
  <span class="ax-switch__content">
    <span class="ax-switch__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
    ${description.slotted || description.html ? `<span class="ax-switch__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
    ${message.slotted || message.html ? `<span class="ax-switch__description" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
  </span>
</label>`;
  },
};
