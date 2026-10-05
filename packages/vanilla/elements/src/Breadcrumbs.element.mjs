// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Breadcrumbs',
  tag: 'ax-breadcrumbs',
  attributes: {
    separator: {
      type: 'string',
      default: '/',
      description: 'Visible separator between authored breadcrumb items.',
    },
    variant: {
      type: 'enum',
      values: ['default', 'supporting'],
      default: 'default',
      description: 'Default or supporting visual treatment.',
    },
    label: {
      type: 'string',
      default: 'Breadcrumb',
      description: 'Accessible label for the navigation landmark.',
    },
  },
  slots: {
    default: {
      description:
        'Native list-item breadcrumb steps, ending with aria-current="page".',
      required: true,
    },
  },
  docs: 'Show a short navigation trail above the page heading and mark the current location.',
  examples: [
    {
      name: 'default',
      html: `<ax-breadcrumbs>
  <li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><a class="ax-breadcrumbs__link" href="#home" style="color: var(--color-text-primary)">Home</a></li>
  <li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><span class="ax-breadcrumbs__current" aria-current="page">Projects</span></li>
</ax-breadcrumbs>`,
    },
    {
      name: 'supporting',
      gallery: false,
      html: `<ax-breadcrumbs variant="supporting" label="Settings breadcrumb">
  <li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><a class="ax-breadcrumbs__link" href="#settings">Settings</a></li>
  <li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><span class="ax-breadcrumbs__current" aria-current="page">Notifications</span></li>
</ax-breadcrumbs>`,
    },
  ],
  hooks: {
    afterRender(_host, api) {
      for (const separator of api.queryAll('.ax-breadcrumbs__separator'))
        separator.textContent = api.read('separator');
      const items = api.queryAll('.ax-breadcrumbs__item');
      if (items.length && !api.query('[aria-current="page"]')) {
        const candidate = items.at(-1).querySelector('a, span');
        candidate?.setAttribute('aria-current', 'page');
      }
    },
  },
  render(_host, h) {
    const classes = ['ax-breadcrumbs'];
    if (h.attr('variant') === 'supporting')
      classes.push('ax-breadcrumbs--supporting');
    return `<nav class="${classes.join(' ')}" aria-label="${h.escape(h.attr('label'))}">
  <ol class="ax-breadcrumbs__list" ${h.slot()}></ol>
</nav>`;
  },
};
