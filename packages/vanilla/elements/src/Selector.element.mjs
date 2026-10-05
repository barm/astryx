// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const variants = ['input', 'ghost'];
const statuses = ['none', 'error', 'success'];

export default {
  name: 'Selector',
  tag: 'ax-selector',
  attributes: {
    label: {type: 'string', description: 'Visible and accessible field label.'},
    value: {
      type: 'string',
      default: '',
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
      description: 'Validation state.',
    },
    description: {type: 'string', description: 'Supporting field description.'},
    'is-required': {
      type: 'boolean',
      default: false,
      description: 'Marks the native select required.',
    },
    'is-disabled': {
      type: 'boolean',
      default: false,
      description: 'Disables the native select.',
    },
    'is-read-only': {
      type: 'boolean',
      default: false,
      description:
        'Prevents value changes while preserving focus and submission.',
    },
    'html-name': {type: 'string', description: 'Native form field name.'},
  },
  slots: {
    default: 'Native option and optgroup children.',
  },
  docs: 'Choose one value from a moderate list with a native select control.',
  examples: [
    {
      name: 'default',
      html: '<ax-selector label="Workspace" html-name="workspace"><option value="design">Design systems</option><option value="tools">Developer tools</option></ax-selector>',
    },
    {
      name: 'compact',
      html: '<ax-selector label="Status" size="sm"><option>Active</option><option>Paused</option></ax-selector>',
    },
  ],
  render(_host, h) {
    const selectID = h.id('select');
    const descriptionID = h.id('description');
    const label = h.attr('label') || 'Select an option';
    const size = h.attr('size');
    const variant = h.attr('variant');
    const status = h.attr('status');
    const description = h.attr('description');
    const classes = ['ax-selector'];
    if (size !== 'md') classes.push(`ax-selector--${size}`);
    if (variant !== 'input') classes.push(`ax-selector--${variant}`);
    if (status !== 'none') classes.push(`ax-selector--${status}`);
    const selectAttributes = [
      `id="${selectID}"`,
      'class="ax-selector__select"',
      'data-ax-reflect-value',
    ];
    if (h.attr('html-name')) {
      selectAttributes.push(`name="${h.escape(h.attr('html-name'))}"`);
    }
    if (description)
      selectAttributes.push(`aria-describedby="${descriptionID}"`);
    if (status === 'error') selectAttributes.push('aria-invalid="true"');
    if (h.attr('is-required'))
      selectAttributes.push('required', 'aria-required="true"');
    if (h.attr('is-disabled')) selectAttributes.push('disabled');
    if (h.attr('is-read-only')) selectAttributes.push('aria-readonly="true"');

    return `<label class="${classes.join(' ')}" for="${selectID}">
  <span class="ax-selector__label">${h.escape(label)}</span>
  <span class="ax-selector__control">
    <select ${selectAttributes.join(' ')} ${h.slot()}></select>
    <span class="ax-selector__indicator" aria-hidden="true"></span>
  </span>
  ${description ? `<span class="ax-selector__description" id="${descriptionID}">${h.escape(description)}</span>` : ''}
</label>`;
  },
};
