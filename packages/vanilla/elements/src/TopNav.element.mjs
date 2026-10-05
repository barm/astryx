// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'TopNav',
  tag: 'ax-top-nav',
  attributes: {
    label: {
      type: 'string',
      default: 'Top navigation',
      description: 'Accessible label for the navigation landmark.',
    },
  },
  slots: {
    default: 'Primary navigation items when start-content is omitted.',
    heading: {description: 'Product mark and name.', required: true},
    'start-content': {
      description: 'Primary navigation items after the heading.',
    },
    'center-content': 'Centered navigation, search, or tabs.',
    'end-content': 'End-aligned actions and profile controls.',
  },
  docs: 'Arrange product identity, primary navigation, and utility actions in an application header.',
  examples: [
    {
      name: 'default',
      html: `<ax-top-nav label="Primary navigation">
  <span slot="heading"><span class="ax-top-nav__brand-mark" aria-hidden="true">A</span><span>Astryx</span></span>
  <a slot="start-content" class="ax-top-nav__item" href="#" aria-current="page">Overview</a>
  <a slot="start-content" class="ax-top-nav__item" href="#projects">Projects</a>
  <ax-button slot="end-content" size="sm">Help</ax-button>
</ax-top-nav>`,
    },
    {
      name: 'centered',
      html: `<ax-top-nav label="Workspace navigation">
  <span slot="heading"><span class="ax-top-nav__brand-mark" aria-hidden="true">W</span><span>Workspace</span></span>
  <a slot="center-content" class="ax-top-nav__item" href="#" aria-current="page">Home</a>
  <ax-button slot="end-content" size="sm">Invite</ax-button>
</ax-top-nav>`,
    },
  ],
  render(_host, h) {
    const centered = h.hasSlot('center-content');
    return `<nav class="ax-top-nav${centered ? ' ax-top-nav--centered' : ''}" aria-label="${h.escape(h.attr('label'))}">
  <div class="ax-top-nav__start">
    <a class="ax-top-nav__brand" href="#" ${h.slot('heading')}></a>
    ${h.hasSlot('start-content') ? `<div class="ax-top-nav__items" ${h.slot('start-content')}></div>` : ''}
    ${h.hasSlot() ? `<div class="ax-top-nav__items" ${h.slot()}></div>` : ''}
  </div>
  ${centered ? `<div class="ax-top-nav__items" ${h.slot('center-content')}></div>` : ''}
  ${h.hasSlot('end-content') ? `<div class="ax-top-nav__end" ${h.slot('end-content')}></div>` : ''}
</nav>`;
  },
};
