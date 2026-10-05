// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Divider',
  tag: 'ax-divider',
  attributes: {
    orientation: {
      type: 'enum',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
      description: 'Horizontal or vertical separator orientation.',
    },
    label: {
      type: 'string',
      description: 'Visible divider label when no slotted label is authored.',
    },
    variant: {
      type: 'enum',
      values: ['subtle', 'strong'],
      default: 'subtle',
      description: 'Subtle or strong line treatment.',
    },
    'is-full-bleed': {
      type: 'boolean',
      default: false,
      description: 'Extends the separator to its container edges.',
    },
  },
  slots: {default: {description: 'Optional visible divider label.'}},
  content: [{attribute: 'label', slot: 'default'}],
  docs: 'Separate adjacent regions with a horizontal or vertical themed rule.',
  examples: [
    {name: 'horizontal', html: '<ax-divider></ax-divider>'},
    {name: 'strong', html: '<ax-divider variant="strong"></ax-divider>'},
    {name: 'labeled', html: '<ax-divider label="Or"></ax-divider>'},
  ],
  render(_host, h) {
    const orientation = h.attr('orientation');
    const variant = h.attr('variant');
    const classes = ['ax-divider'];
    if (variant === 'strong') classes.push('ax-divider--strong');
    if (orientation === 'vertical') classes.push('ax-divider--vertical');
    const line = `<hr class="${classes.join(' ')}" />`;
    const label = h.content('label');
    if (!label.slotted && !label.html) return line;
    return `<div class="ax-stack ax-stack--horizontal ax-stack--gap-2" role="separator" aria-orientation="${orientation}"${h.attr('is-full-bleed') ? ' style="margin-inline:calc(-1 * var(--spacing-4))"' : ''}>
  ${line}
  <span class="ax-text ax-text--supporting"${label.slotted ? ` ${h.slot()}` : ''}>${label.html}</span>
  ${line}
</div>`;
  },
};
