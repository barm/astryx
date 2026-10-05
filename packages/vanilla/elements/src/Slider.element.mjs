// Copyright (c) Meta Platforms, Inc. and affiliates.

const orientations = ['horizontal', 'vertical'];
const statuses = ['none', 'error', 'warning', 'success'];
const initialized = new WeakSet();

function formatValue(value, suffix) {
  return `${value}${suffix}`;
}

export default {
  name: 'Slider',
  tag: 'ax-slider',
  attributes: {
    label: {
      type: 'string',
      description: 'Field label.',
    },
    value: {
      type: 'string',
      default: '0',
      liveProperty: 'value',
      reflect: {events: ['input', 'change'], property: 'value'},
      description: 'Current single-thumb.',
    },
    min: {type: 'string', default: '0', description: 'Native minimum.'},
    max: {type: 'string', default: '100', description: 'Native maximum.'},
    step: {type: 'string', default: '1', description: 'Native step.'},
    orientation: {
      type: 'enum',
      values: orientations,
      default: 'horizontal',
      description: 'Slider orientation.',
    },
    'value-suffix': {
      type: 'string',
      default: '',
      description: 'Visible suffix.',
    },
    description: {type: 'string', description: 'Help text.'},
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
      description: 'Marks range.',
    },
    'html-name': {
      type: 'string',
      aliases: ['name'],
      aliasProperties: ['name'],
      description: 'Form name.',
    },
  },
  slots: {
    label: {description: 'Visible slider.', required: true},
    description: 'Help text.',
    'status-message': 'Validation message.',
  },
  content: [
    {attribute: 'label', slot: 'label', required: true},
    {attribute: 'description', slot: 'description'},
    {attribute: 'status-message', slot: 'status-message'},
  ],
  control: 'input[type="range"]',
  delegates: {
    properties: [
      'form',
      'validity',
      'validationMessage',
      'valueAsNumber',
      'willValidate',
    ],
    methods: ['checkValidity', 'reportValidity', 'stepDown', 'stepUp'],
  },
  events: {
    input: 'Native event.',
    change: 'Native event.',
    'astryx:change-end': 'Custom event.',
  },
  hooks: {
    attributeChanged(_host, name, _oldValue, _newValue, api) {
      if (!api.control) return false;
      if (name === 'value') api.control.value = api.read('value');
      else if (name === 'is-disabled')
        api.control.disabled = api.read('is-disabled');
      else return false;
      const output = api.query('output');
      if (output)
        output.value = formatValue(api.control.value, api.read('value-suffix'));
      return true;
    },
    afterRender(host, api) {
      const value = api.read('value');
      if (!initialized.has(host)) {
        api.control.defaultValue = value;
        initialized.add(host);
      }
      api.control.value = value;
      const output = api.query('output');
      const update = () => {
        if (output)
          output.value = formatValue(
            api.control.value,
            api.read('value-suffix'),
          );
      };
      update();
      api.listen(api.control, 'input', update);
      api.listen(api.control, 'change', () =>
        api.dispatch('astryx:change-end', {value: Number(api.control.value)}),
      );
    },
  },
  docs: 'Slider custom element using native Astryx markup.',
  examples: [
    {
      name: 'default',
      gallery: false,
      html: `<ax-slider label="Volume" value="65"></ax-slider>`,
    },
    {
      name: 'error',
      gallery: false,
      html: `<ax-slider label="Threshold" status="error"></ax-slider>`,
    },
  ],
  render(_host, h) {
    const id = h.id('input');
    const descriptionID = h.id('description');
    const statusID = h.id('status');
    const label = h.content('label', 'label', 'Slider');
    const description = h.content('description', 'description');
    const message = h.content('status-message', 'status-message');
    const status = h.attr('status');
    const orientation = h.attr('orientation');
    const classes = ['ax-slider'];
    if (orientation !== 'horizontal') classes.push(`ax-slider--${orientation}`);
    if (status !== 'none') classes.push(`ax-slider--${status}`);
    const describedBy = [
      (description.slotted || description.html) && descriptionID,
      (message.slotted || message.html) && statusID,
    ]
      .filter(Boolean)
      .join(' ');
    const attrs = [
      'class="ax-slider__control"',
      `id="${id}"`,
      'type="range"',
      `min="${h.escape(h.attr('min'))}"`,
      `max="${h.escape(h.attr('max'))}"`,
      `step="${h.escape(h.attr('step'))}"`,
      `value="${h.escape(h.attr('value'))}"`,
    ];
    if (h.attr('html-name'))
      attrs.push(`name="${h.escape(h.attr('html-name'))}"`);
    if (describedBy) attrs.push(`aria-describedby="${describedBy}"`);
    if (status === 'error') attrs.push('aria-invalid="true"');
    if (h.attr('is-disabled')) attrs.push('disabled');
    if (h.attr('is-required')) attrs.push('required', 'aria-required="true"');
    return `<label class="${classes.join(' ')}" for="${id}">
  <span class="ax-slider__label-row"><span class="ax-slider__label"${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span><output class="ax-slider__value" for="${id}">${formatValue(h.attr('value'), h.attr('value-suffix'))}</output></span>
  ${description.slotted || description.html ? `<span class="ax-slider__description" id="${descriptionID}"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</span>` : ''}
  <input ${attrs.join(' ')} />
  ${message.slotted || message.html ? `<span class="ax-slider__message" id="${statusID}"${status === 'error' ? ' role="alert"' : ''}${message.slotted ? ` ${h.slot('status-message')}` : ''}>${message.html}</span>` : ''}
</label>`;
  },
};
