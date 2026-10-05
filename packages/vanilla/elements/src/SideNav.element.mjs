// Copyright (c) Meta Platforms, Inc. and affiliates.

function setCollapsed(host, api, collapsed, emit = false) {
  api.reflect('is-collapsed', collapsed);
  api
    .query('.ax-side-nav')
    ?.classList.toggle('ax-side-nav--collapsed', collapsed);
  if (emit) api.dispatch('astryx:collapsed-change', {isCollapsed: collapsed});
}

export default {
  name: 'SideNav',
  tag: 'ax-side-nav',
  attributes: {
    label: {
      type: 'string',
      default: 'Application navigation',
      description: 'Accessible label for the navigation landmark.',
    },
    'is-collapsed': {
      type: 'boolean',
      default: false,
      description: 'Collapsed navigation-rail state.',
    },
    'is-resizable': {
      type: 'boolean',
      default: false,
      description: 'Allows the authored navigation width to be resized.',
    },
    width: {type: 'string', description: 'Current CSS width when resizable.'},
  },
  slots: {
    header: 'Sticky product identity or SideNav heading.',
    'top-content': 'Content immediately below the header.',
    default: {description: 'Navigation sections and items.', required: true},
    footer: 'Footer actions.',
    'footer-icons': 'Compact footer icon row.',
  },
  events: {
    'astryx:collapsed-change':
      'Emitted after toggle() with detail.isCollapsed.',
  },
  methods: {
    toggle: {
      description: 'Toggle the collapsed state.',
      call(api) {
        const next = !api.read('is-collapsed');
        setCollapsed(this, api, next, true);
        return next;
      },
    },
  },
  docs: 'Organize application destinations in a persistent navigation rail with optional collapsed state.',
  examples: [
    {
      name: 'default',
      html: `<ax-side-nav label="Application navigation">
  <a slot="header" class="ax-side-nav__brand" href="#">Astryx</a>
  <a class="ax-side-nav__item" href="#" aria-current="page">Overview</a>
</ax-side-nav>`,
    },
    {
      name: 'collapsed',
      html: `<ax-side-nav label="Collapsed navigation" is-collapsed>
  <a slot="header" class="ax-side-nav__brand" href="#" aria-label="Astryx">A</a>
  <a class="ax-side-nav__item" href="#" aria-label="Overview">●</a>
</ax-side-nav>`,
    },
  ],
  hooks: {
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (name !== 'is-collapsed' || !api.query('.ax-side-nav')) return false;
      setCollapsed(host, api, api.read('is-collapsed'));
      return true;
    },
    afterRender(host, api) {
      setCollapsed(host, api, api.read('is-collapsed'));
    },
  },
  render(_host, h) {
    const classes = ['ax-side-nav'];
    if (h.attr('is-collapsed')) classes.push('ax-side-nav--collapsed');
    const style = h.attr('width')
      ? ` style="width:${h.escape(h.attr('width'))}"`
      : '';
    return `<nav class="${classes.join(' ')}" aria-label="${h.escape(h.attr('label'))}"${style}>
  ${h.hasSlot('header') ? `<div class="ax-side-nav__header" ${h.slot('header')}></div>` : ''}
  ${h.hasSlot('top-content') ? `<div class="ax-side-nav__top" ${h.slot('top-content')}></div>` : ''}
  <div class="ax-side-nav__content" ${h.slot()}></div>
  ${h.hasSlot('footer') ? `<div class="ax-side-nav__footer" ${h.slot('footer')}></div>` : ''}
  ${h.hasSlot('footer-icons') ? `<div class="ax-side-nav__footer" ${h.slot('footer-icons')}></div>` : ''}
</nav>`;
  },
};
