// Copyright (c) Meta Platforms, Inc. and affiliates.

const types = ['text', 'password', 'email'];
const sizes = ['sm', 'md', 'lg'];
const statuses = ['none', 'error', 'warning', 'success'];

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
      default: false,
      description: 'Marks the native input required.',
    },
    'is-disabled': {
      type: 'boolean',
      default: false,
      description: 'Disables the native input.',
    },
    'is-read-only': {
      type: 'boolean',
      default: false,
      description: 'Makes the native input read-only.',
    },
    placeholder: {type: 'string', description: 'Native placeholder text.'},
    'html-name': {type: 'string', description: 'Native form field name.'},
    'auto-complete': {type: 'string', description: 'Native autocomplete hint.'},
  },
  slots: {},
  docs: 'Collect a single line of text with an associated visible label.',
  examples: [
    {
      name: 'default',
      html: '<ax-text-input label="Project name" html-name="project" placeholder="Astryx"></ax-text-input>',
    },
    {
      name: 'error',
      html: '<ax-text-input type="email" label="Email" status="error" status-message="Enter a valid email address."></ax-text-input>',
    },
  ],
  render(_host, h) {
    const inputID = h.id('input');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const status = h.attr('status');
    const size = h.attr('size');
    const label = h.attr('label') || 'Text input';
    const description = h.attr('description');
    const statusMessage = h.attr('status-message');
    const wrapperClasses = ['ax-text-input'];
    if (size !== 'md') wrapperClasses.push(`ax-text-input--${size}`);
    if (status !== 'none') wrapperClasses.push(`ax-text-input--${status}`);
    const describedBy = [
      description && descriptionID,
      statusMessage && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const inputAttributes = [
      `id="${inputID}"`,
      `type="${h.escape(h.attr('type'))}"`,
      'data-ax-reflect-value',
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

    return `<label class="ax-stack ax-stack--gap-1" for="${inputID}">
  <span class="ax-text ax-text--label">${h.escape(label)}</span>
  ${description ? `<span class="ax-text ax-text--supporting" id="${descriptionID}">${h.escape(description)}</span>` : ''}
  <span class="${wrapperClasses.join(' ')}"><input ${inputAttributes.join(' ')} /></span>
  ${statusMessage ? `<span class="ax-text ax-text--supporting" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}>${h.escape(statusMessage)}</span>` : ''}
</label>`;
  },
};
