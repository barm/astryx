// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Tab',
  tag: 'ax-tab',
  attributes: {
    value: {
      type: 'string',
      description: 'Unique value reported by the parent TabList.',
    },
    'panel-id': {
      type: 'string',
      description: 'ID of the tab panel controlled by this tab.',
    },
    selected: {
      type: 'boolean',
      default: false,
      description: 'Selected state reflected from the native tab button.',
    },
    'is-disabled': {
      type: 'boolean',
      default: false,
      description: 'Disables the native tab button.',
    },
  },
  slots: {default: 'Visible tab label and inline content.'},
  docs: 'Represent one selectable view inside an ax-tab-list.',
  examples: [
    {
      name: 'selected',
      html: '<ax-tab value="overview" panel-id="panel-overview" selected>Overview</ax-tab>',
    },
    {
      name: 'default',
      html: '<ax-tab value="activity" panel-id="panel-activity">Activity</ax-tab>',
    },
  ],
  render(_host, h) {
    const selected = h.attr('selected');
    const value = h.attr('value') || h.id('value');
    const panelID = h.attr('panel-id');
    const attributes = [
      'class="ax-tab"',
      `id="${h.id('tab')}"`,
      'type="button"',
      'role="tab"',
      `aria-selected="${selected}"`,
      `tabindex="${selected ? '0' : '-1'}"`,
    ];
    if (panelID) attributes.push(`aria-controls="${h.escape(panelID)}"`);
    if (h.attr('is-disabled')) attributes.push('disabled');
    return `<button ${attributes.join(' ')} ${h.slot()}></button>`;
  },
};
