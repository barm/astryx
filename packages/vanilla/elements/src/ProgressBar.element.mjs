// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = ['accent', 'success', 'warning', 'error', 'neutral'];

export default {
  name: 'ProgressBar',
  tag: 'ax-progress-bar',
  attributes: {
    label: {
      type: 'string',
      description: 'Required accessible operation label.',
    },
    value: {
      type: 'string',
      default: '0',
      description: 'Current determinate value.',
    },
    max: {
      type: 'string',
      default: '100',
      description: 'Maximum determinate value.',
    },
    'is-label-hidden': {
      type: 'boolean',
      default: false,
      description:
        'Visually hides the label while preserving its accessible name.',
    },
    'has-value-label': {
      type: 'boolean',
      default: false,
      description: 'Shows a percentage value next to the label.',
    },
    variant: {
      type: 'enum',
      values: variants,
      default: 'accent',
      description: 'Semantic progress color.',
    },
    'is-indeterminate': {
      type: 'boolean',
      default: false,
      description: 'Shows progress when completion cannot be measured.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Uses disabled visual treatment.',
    },
  },
  slots: {label: 'Visible operation label; overrides the label attribute.'},
  content: [{attribute: 'label', slot: 'label', required: true}],
  docs: 'Communicate determinate or indeterminate task progress with native progressbar semantics.',
  examples: [
    {
      name: 'determinate',
      gallery: false,
      html: '<ax-progress-bar label="Uploading files" value="72" variant="success" has-value-label></ax-progress-bar>',
    },
    {
      name: 'indeterminate',
      html: '<ax-progress-bar label="Processing report" is-indeterminate></ax-progress-bar>',
    },
  ],
  render(_host, h) {
    const indeterminate = h.attr('is-indeterminate');
    const value = Number(h.attr('value'));
    const max = Math.max(Number(h.attr('max')) || 100, 1);
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    const label = h.content('label', 'label', 'Progress');
    const labelID = h.id('label');
    const classes = ['ax-progress-bar'];
    if (h.attr('variant') !== 'accent')
      classes.push(`ax-progress-bar--${h.attr('variant')}`);
    if (indeterminate) classes.push('ax-progress-bar--indeterminate');
    if (h.attr('is-disabled')) classes.push('ax-progress-bar--disabled');
    const labelStyle = h.attr('is-label-hidden')
      ? ' style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"'
      : '';
    const valueText = `${Math.round(percent)}%`;
    return `<div class="${classes.join(' ')}"${indeterminate ? '' : ` style="--ax-progress-value: ${percent}%"`}>
  <div class="ax-progress-bar__header">
    <span class="ax-progress-bar__label" id="${labelID}"${labelStyle}${label.slotted ? ` ${h.slot('label')}` : ''}>${label.html}</span>
    ${!indeterminate && h.attr('has-value-label') ? `<span class="ax-progress-bar__value">${valueText}</span>` : ''}
  </div>
  <div class="ax-progress-bar__track" role="progressbar" aria-labelledby="${labelID}"${indeterminate ? '' : ` aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${valueText}"`}>
    <div class="ax-progress-bar__fill"></div>
  </div>
</div>`;
  },
};
