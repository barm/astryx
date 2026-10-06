// Copyright (c) Meta Platforms, Inc. and affiliates.

function enhanceNavigationItems(api) {
  for (const container of api.queryAll('.ax-top-nav__items')) {
    for (const child of container.children) {
      if (child.matches('a, button')) child.classList.add('ax-top-nav__item');
    }
  }
}

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
  <span slot="heading">Astryx</span>
  <a slot="start-content" href="#overview" aria-current="page">Overview</a>
  <a slot="start-content" href="#projects">Projects</a>
  <ax-button slot="end-content" size="sm">Help</ax-button>
</ax-top-nav>`,
    },
    {
      name: 'centered',
      html: `<ax-top-nav label="Workspace navigation">
  <span slot="heading">Workspace</span>
  <a slot="center-content" href="#home" aria-current="page">Home</a>
  <a slot="center-content" href="#activity">Activity</a>
  <ax-button slot="end-content" size="sm">Invite</ax-button>
</ax-top-nav>`,
    },
    {
      name: 'responsive-collapsed',
      gallery: false,
      recipe: true,
      html: `<ax-top-nav label="Primary navigation">
  <span slot="heading">Astryx</span>
  <span id="responsive-nav-items" slot="start-content" hidden>
    <a href="#overview" aria-current="page">Overview</a>
    <a href="#projects">Projects</a>
  </span>
  <button
    id="responsive-nav-toggle"
    slot="end-content"
    type="button"
    aria-controls="responsive-nav-items"
    aria-expanded="false"
  >Open menu</button>
</ax-top-nav>
<script>
  (() => {
    const toggle = document.querySelector('#responsive-nav-toggle');
    const items = document.querySelector('#responsive-nav-items');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.textContent = expanded ? 'Open menu' : 'Close menu';
      items.hidden = expanded;
    });
  })();
</script>`,
    },
    {
      name: 'responsive-expanded',
      gallery: false,
      recipe: true,
      html: `<ax-top-nav label="Primary navigation">
  <span slot="heading">Astryx</span>
  <span id="responsive-nav-items-open" slot="start-content">
    <a href="#overview" aria-current="page">Overview</a>
    <a href="#projects">Projects</a>
  </span>
  <button
    id="responsive-nav-toggle-open"
    slot="end-content"
    type="button"
    aria-controls="responsive-nav-items-open"
    aria-expanded="true"
  >Close menu</button>
</ax-top-nav>
<script>
  (() => {
    const toggle = document.querySelector('#responsive-nav-toggle-open');
    const items = document.querySelector('#responsive-nav-items-open');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.textContent = expanded ? 'Open menu' : 'Close menu';
      items.hidden = expanded;
    });
  })();
</script>`,
    },
  ],
  hooks: {
    afterRender(_host, api) {
      enhanceNavigationItems(api);
    },
  },
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
