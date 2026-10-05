// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const layouts = ['hug', 'fill'];
const orientations = ['horizontal', 'vertical'];

export default {
  name: 'TabList',
  tag: 'ax-tab-list',
  attributes: {
    value: {
      type: 'string',
      description: 'Selected child tab value, reflected after activation.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Tab size matching TabList size.',
    },
    layout: {
      type: 'enum',
      values: layouts,
      default: 'hug',
      description: 'Tabs hug content or fill the available width.',
    },
    orientation: {
      type: 'enum',
      values: orientations,
      default: 'horizontal',
      description: 'Arrow-key and ARIA orientation.',
    },
    label: {
      type: 'string',
      default: 'Views',
      description: 'Accessible label for the native tablist.',
    },
  },
  slots: {
    default: 'ax-tab children.',
    panels: 'Panel elements whose IDs match child panel-id attributes.',
  },
  docs: 'Switch between related in-page views with arrow-key navigation.',
  examples: [
    {
      name: 'panels',
      html: '<ax-tab-list value="overview" label="Project views"><ax-tab value="overview" panel-id="panel-overview">Overview</ax-tab><ax-tab value="activity" panel-id="panel-activity">Activity</ax-tab><section slot="panels" id="panel-overview">Overview content</section><section slot="panels" id="panel-activity">Activity content</section></ax-tab-list>',
    },
    {
      name: 'fill',
      html: '<ax-tab-list layout="fill"><ax-tab value="one">One</ax-tab><ax-tab value="two">Two</ax-tab></ax-tab-list>',
    },
  ],
  render(_host, h) {
    const classes = ['ax-tab-list'];
    if (h.attr('layout') === 'fill') classes.push('ax-tab-list--fill');
    const orientation = h.attr('orientation');
    return `<div class="${classes.join(' ')}" role="tablist" aria-label="${h.escape(h.attr('label'))}" aria-orientation="${orientation}" data-ax-tab-list ${h.slot()}></div>
<div data-ax-panel-host ${h.slot('panels')}></div>`;
  },
};
