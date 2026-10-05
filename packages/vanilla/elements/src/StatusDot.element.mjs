// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = ['success', 'warning', 'error', 'accent', 'neutral'];

export default {
  name: 'StatusDot',
  tag: 'ax-status-dot',
  attributes: {
    variant: {
      type: 'enum',
      values: variants,
      default: 'neutral',
      description: 'Semantic status color.',
    },
    label: {type: 'string', description: 'Required accessible status label.'},
    'is-pulsing': {
      type: 'boolean',
      default: false,
      description: 'Adds reduced-motion-aware attention animation.',
    },
    tooltip: {type: 'string', description: 'Optional explanatory tooltip.'},
  },
  slots: {
    label: {description: 'Accessible status label.', required: true},
    icon: 'Optional non-color status mark.',
  },
  content: [{attribute: 'label', slot: 'label', required: true}],
  docs: 'Pair a compact semantic status signal with visible or otherwise accessible status text.',
  examples: [
    {
      name: 'online',
      html: '<ax-status-dot variant="success" label="Online"></ax-status-dot>',
    },
    {
      name: 'incident',
      html: '<ax-status-dot variant="error" label="Service incident" is-pulsing></ax-status-dot>',
    },
  ],
  render(_host, h) {
    const classes = ['ax-status-dot', `ax-status-dot--${h.attr('variant')}`];
    if (h.attr('is-pulsing')) classes.push('ax-status-dot--pulsing');
    const label = h.content('label', 'label', 'Status');
    const labelID = h.id('label');
    return `<span class="${classes.join(' ')}" role="img"${label.slotted ? ` aria-labelledby="${labelID}"` : ` aria-label="${h.escape(h.attr('label') || 'Status')}"`}${h.attr('tooltip') ? ` title="${h.escape(h.attr('tooltip'))}"` : ''}>
  ${label.slotted ? `<span id="${labelID}" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)" ${h.slot('label')}></span>` : ''}
  ${h.hasSlot('icon') ? `<span class="ax-status-dot__icon" ${h.slot('icon')}></span>` : ''}
</span>`;
  },
};
