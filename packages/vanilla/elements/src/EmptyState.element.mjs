// Copyright (c) Meta Platforms, Inc. and affiliates.

const levels = ['1', '2', '3', '4', '5', '6'];

function consumeTitle(host, api) {
  if (!host.hasAttribute('title')) return false;
  host.setAttribute('data-ax-title', host.getAttribute('title') ?? '');
  host.removeAttribute('title');
  api.render();
  return true;
}

export default {
  name: 'EmptyState',
  tag: 'ax-empty-state',
  attributes: {
    title: {
      type: 'string',
      aliases: ['data-ax-title'],
      description:
        'Required primary message; consumed so the host never shows a native title tooltip.',
    },
    description: {type: 'string', description: 'Optional explanatory text.'},
    'heading-level': {
      type: 'enum',
      values: levels,
      default: '3',
      description: 'Semantic heading level for the title.',
    },
    'is-compact': {
      type: 'boolean',
      default: false,
      description: 'Uses reduced spacing for constrained surfaces.',
    },
  },
  slots: {
    title: {
      description: 'Primary message; overrides the title attribute.',
      required: true,
    },
    description: 'Supporting explanation.',
    icon: 'Decorative icon or illustration.',
    actions: 'One or two useful next actions.',
    default: 'Optional additional supporting content.',
  },
  content: [
    {attribute: 'title', slot: 'title', required: true},
    {attribute: 'description', slot: 'description'},
  ],
  docs: 'Explain an empty result or first-run state with a specific title and useful next actions.',
  examples: [
    {
      name: 'default',
      html: `<ax-empty-state title="No projects yet">
  <span slot="icon">＋</span>
  <ax-button slot="actions" variant="primary">Create project</ax-button>
</ax-empty-state>`,
    },
    {
      name: 'compact',
      gallery: false,
      html: `<ax-empty-state title="No matching results" description="Try a broader search." is-compact>
  <ax-button slot="actions">Clear filters</ax-button>
</ax-empty-state>`,
    },
  ],
  hooks: {
    connected(host, api) {
      consumeTitle(host, api);
    },
    attributeChanged(host, name, _oldValue, _newValue, api) {
      return name === 'title' && consumeTitle(host, api);
    },
  },
  render(_host, h) {
    const title = h.content('title', 'title', 'Empty state');
    const description = h.content('description', 'description');
    const titleID = h.id('title');
    const level = h.attr('heading-level');
    const classes = ['ax-empty-state'];
    if (h.attr('is-compact')) classes.push('ax-empty-state--compact');
    return `<section class="${classes.join(' ')}" role="status" aria-labelledby="${titleID}">
  ${h.hasSlot('icon') ? `<span class="ax-empty-state__icon" aria-hidden="true" ${h.slot('icon')}></span>` : ''}
  <div class="ax-empty-state__text">
    <h${level} class="ax-empty-state__title" id="${titleID}"${title.slotted ? ` ${h.slot('title')}` : ''}>${title.html}</h${level}>
    ${description.slotted || description.html ? `<p class="ax-empty-state__description"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</p>` : ''}
  </div>
  ${h.hasSlot('actions') ? `<div class="ax-empty-state__actions" ${h.slot('actions')}></div>` : ''}
  ${h.hasSlot() ? `<div class="ax-empty-state__description" ${h.slot()}></div>` : ''}
</section>`;
  },
};
