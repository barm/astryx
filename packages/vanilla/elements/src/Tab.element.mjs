// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Tab',
  tag: 'ax-tab',
  attributes: {
    label: {
      type: 'string',
      description: 'Visible tab label when no child content is authored.',
    },
    value: {
      type: 'string',
      description: 'Unique value reported by the parent TabList.',
    },
    'panel-id': {
      type: 'string',
      description: 'ID of the tab panel controlled by this tab.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables the native tab button.',
    },
  },
  slots: {
    default: {
      description: 'Visible tab label and inline content.',
      required: true,
    },
  },
  content: [{attribute: 'label', slot: 'default', required: true}],
  control: 'button[role="tab"]',
  events: {
    'astryx:tab-change': 'Bubbles when this tab is activated by its TabList.',
  },
  docs: 'Represent one selectable view inside an ax-tab-list.',
  examples: [
    {
      name: 'with-panel',
      html: `<ax-tab value="overview" panel-id="panel-overview">
  Overview
</ax-tab>`,
    },
    {
      name: 'label',
      html: `<ax-tab value="activity" label="Activity"></ax-tab>`,
    },
  ],
  render(_host, h) {
    const content = h.content('label');
    const panelID = h.attr('panel-id');
    const attributes = [
      'class="ax-tab"',
      `id="${h.id('tab')}"`,
      'type="button"',
      'role="tab"',
      'aria-selected="false"',
      'tabindex="-1"',
    ];
    if (panelID) attributes.push(`aria-controls="${h.escape(panelID)}"`);
    if (h.attr('is-disabled')) attributes.push('disabled');
    return `<button ${attributes.join(' ')}${content.slotted ? ` ${h.slot()}` : ''}>${content.html}</button>`;
  },
};
