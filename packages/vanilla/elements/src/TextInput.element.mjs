// Copyright (c) Meta Platforms, Inc. and affiliates.

const types = ['text', 'password', 'email'];
const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];
const initializedInputs = new WeakSet();

export default {
  name: 'TextInput',
  tag: 'ax-text-input',
  attributes: {
    type: {
      type: 'enum',
      values: types,
      default: 'text',
      description: 'Native single-line input type.',
    },
    label: {type: 'string', description: 'Visible and accessible field label.'},
    value: {
      type: 'string',
      default: '',
      liveProperty: 'value',
      reflect: {events: ['input', 'change'], property: 'value'},
      description: 'Current value, reflected after native input events.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Field size matching TextInput size.',
    },
    description: {type: 'string', description: 'Supporting field description.'},
    status: {
      type: 'enum',
      values: statuses,
      default: 'none',
      description: 'Validation state; none renders no status treatment.',
    },
    'status-message': {
      type: 'string',
      description: 'Validation message associated with the native input.',
    },
    'is-required': {
      type: 'boolean',
      aliases: ['required'],
      aliasProperties: ['required'],
      default: false,
      description: 'Marks the native input required.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables the native input.',
    },
    'is-read-only': {
      type: 'boolean',
      aliases: ['readonly'],
      aliasProperties: ['readOnly'],
      default: false,
      description: 'Makes the native input read-only.',
    },
    placeholder: {type: 'string', description: 'Native placeholder text.'},
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Native form field name.',
    },
    'auto-complete': {
      type: 'string',
      aliases: ['autocomplete'],
      aliasProperties: ['autocomplete'],
      description: 'Native autocomplete hint.',
    },
  },
  attributeSuggestions: {
    htmlname: 'html-name',
    'is-readonly': 'is-read-only',
    statusmessage: 'status-message',
  },
  slots: {
    label: {description: 'Visible field label.', required: true},
    description: 'Supporting field description.',
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input',
  delegates: {
    properties: ['form', 'validity', 'validationMessage', 'willValidate'],
    methods: ['checkValidity', 'reportValidity', 'select', 'setSelectionRange'],
  },
  events: {
    input: 'Native input event; value is reflected before bubbling completes.',
    change: 'Native change event; value is reflected to the host.',
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
      if (!initializedInputs.has(host)) {
        if (host.hasAttribute('value')) api.control.defaultValue = value;
        initializedInputs.add(host);
      }
      if (api.control.value !== value) api.control.value = value;
    },
  },
  docs: 'Collect a single line of text with an associated visible label.',
  examples: [
    {
      name: 'default',
      html: `<ax-text-input
  label="Project name"
  html-name="project"
  placeholder="Astryx"
></ax-text-input>`,
    },
    {
      name: 'error',
      html: `<ax-text-input
  type="email"
  label="Email"
  status="error"
  status-message="Enter a valid email address."
></ax-text-input>`,
    },
    {
      name: 'password-strength-and-visibility',
      gallery: false,
      recipe: true,
      html: `<div>
  <ax-text-input
    id="password-recipe-field"
    type="password"
    label="Password"
    html-name="password"
    auto-complete="new-password"
    description="Use at least twelve characters."
  ></ax-text-input>
  <button
    id="password-recipe-toggle"
    type="button"
    aria-controls="password-recipe-field"
    aria-pressed="false"
  >Show password</button>
  <ax-progress-bar
    id="password-recipe-strength"
    label="Password strength"
    value="0"
    max="100"
    has-value-label
  ></ax-progress-bar>
  <p id="password-recipe-status" role="status" aria-live="polite">
    Password not entered.
  </p>
</div>
<script>
  (() => {
    const field = document.querySelector('#password-recipe-field');
    const toggle = document.querySelector('#password-recipe-toggle');
    const meter = document.querySelector('#password-recipe-strength');
    const status = document.querySelector('#password-recipe-status');
    const strength = value =>
      value.length >= 12 ? [100, 'Strong'] : value.length >= 8 ? [60, 'Medium'] : value ? [25, 'Weak'] : [0, 'Not entered'];
    const update = () => {
      const [value, label] = strength(field.value ?? '');
      meter.setAttribute('value', String(value));
      meter.setAttribute('variant', value >= 100 ? 'success' : value >= 60 ? 'warning' : value ? 'error' : 'neutral');
      status.textContent = 'Password strength: ' + label + '.';
    };
    field.addEventListener('input', update);
    toggle.addEventListener('click', () => {
      const visible = field.getAttribute('type') === 'text';
      field.setAttribute('type', visible ? 'password' : 'text');
      toggle.setAttribute('aria-pressed', String(!visible));
      toggle.textContent = visible ? 'Show password' : 'Hide password';
    });
    update();
  })();
</script>`,
    },
  ],
  render(_host, h) {
    const inputID = h.id('input');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const status = h.attr('status');
    const size = h.attr('size');
    const label = h.content('label', 'label', 'Text input');
    const description = h.content('description', 'description');
    const statusMessage = h.content('status-message', 'status-message');
    const wrapperClasses = ['ax-text-input'];
    if (size !== 'md') wrapperClasses.push(`ax-text-input--${size}`);
    if (status !== 'none') wrapperClasses.push(`ax-text-input--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (statusMessage.slotted || statusMessage.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const inputAttributes = [
      `id="${inputID}"`,
      `type="${h.escape(h.attr('type'))}"`,
    ];
    if (h.attr('html-name')) {
      inputAttributes.push(`name="${h.escape(h.attr('html-name'))}"`);
    }
    if (h.attr('placeholder')) {
      inputAttributes.push(`placeholder="${h.escape(h.attr('placeholder'))}"`);
    }
    if (h.attr('auto-complete')) {
      inputAttributes.push(
        `autocomplete="${h.escape(h.attr('auto-complete'))}"`,
      );
    }
    if (describedBy) inputAttributes.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') inputAttributes.push('aria-invalid="true"');
    if (h.attr('is-required'))
      inputAttributes.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) inputAttributes.push('disabled');
    if (h.attr('is-read-only')) inputAttributes.push('readonly');

    return `<div class="ax-stack ax-stack--gap-1">
  <label class="ax-text ax-text--label" for="${inputID}"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</label>
  ${description.slotted || description.html ? `<span class="ax-text ax-text--supporting" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <span class="${wrapperClasses.join(' ')}"><input ${inputAttributes.join(' ')} /></span>
  ${statusMessage.slotted || statusMessage.html ? `<span class="ax-text ax-text--supporting" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${statusMessage.slotted ? ` ${h.slot('status-message')}` : ''}>${statusMessage.html}</span>` : ''}
</div>`;
  },
};
