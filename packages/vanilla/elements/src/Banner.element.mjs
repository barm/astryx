// Copyright (c) Meta Platforms, Inc. and affiliates.

const statuses = ['info', 'warning', 'error', 'success'];
const elevations = ['none', 'low', 'med', 'high'];
const icons = {info: 'i', warning: '!', error: '!', success: '✓'};

function consumeTitle(host, api) {
  if (!host.hasAttribute('title')) return false;
  host.setAttribute('data-ax-title', host.getAttribute('title') ?? '');
  host.removeAttribute('title');
  api.render();
  return true;
}

function setOpen(host, api, open, emit = false) {
  api.reflect('is-open', open);
  api.query('.ax-banner__content')?.toggleAttribute('hidden', !open);
  api
    .query('[data-ax-banner-toggle]')
    ?.setAttribute('aria-expanded', String(open));
  if (emit) api.dispatch('astryx:open-change', {isOpen: open});
}

export default {
  name: 'Banner',
  tag: 'ax-banner',
  attributes: {
    status: {
      type: 'enum',
      values: statuses,
      default: 'info',
      description: 'Semantic message status.',
    },
    title: {
      type: 'string',
      aliases: ['data-ax-title'],
      description:
        'Required visible title; consumed so the host never shows a native title tooltip.',
    },
    description: {type: 'string', description: 'Optional supporting message.'},
    'is-dismissable': {
      type: 'boolean',
      default: false,
      description: 'Shows a dismiss control.',
    },
    'dismiss-label': {
      type: 'string',
      default: 'Dismiss banner',
      description: 'Accessible label for the dismiss control.',
    },
    container: {
      type: 'enum',
      values: ['card', 'section'],
      default: 'card',
      description: 'Card or full-width section presentation.',
    },
    elevation: {
      type: 'enum',
      values: elevations,
      default: 'none',
      description: 'Resting shadow depth.',
    },
    collapsible: {
      type: 'boolean',
      default: false,
      description: 'Places supporting content behind a disclosure control.',
    },
    'is-open': {
      type: 'boolean',
      aliases: ['open'],
      aliasProperties: ['open'],
      default: false,
      description: 'Current supporting-content disclosure state.',
    },
  },
  slots: {
    title: {
      description: 'Required title; overrides the title attribute.',
      required: true,
    },
    description: 'Supporting message.',
    icon: 'Status icon override.',
    'end-content': 'End-aligned action.',
    default: 'Optional detailed content below the status surface.',
  },
  content: [
    {attribute: 'title', slot: 'title', required: true},
    {attribute: 'description', slot: 'description'},
  ],
  events: {
    'astryx:dismiss': 'Emitted after the banner is dismissed.',
    'astryx:open-change':
      'Emitted after disclosure state changes with detail.isOpen.',
  },
  docs: 'Present a persistent page or section message with semantic status and optional detail.',
  examples: [
    {
      name: 'information',
      html: `<ax-banner status="info" title="Your trial ends in 5 days">
  <ax-button slot="end-content" variant="primary" size="sm">View plans</ax-button>
</ax-banner>`,
    },
    {
      name: 'error-detail',
      gallery: false,
      html: `<ax-banner status="error" title="3 fields need attention" description="Fix the highlighted fields." collapsible is-open>
  <ul><li>Project owner is required</li></ul>
</ax-banner>`,
    },
  ],
  hooks: {
    connected(host, api) {
      consumeTitle(host, api);
    },
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (name === 'title' && consumeTitle(host, api)) return true;
      if (
        name === 'is-open' &&
        api.read('collapsible') &&
        api.query('.ax-banner__content')
      ) {
        setOpen(host, api, api.read('is-open'));
        return true;
      }
      return false;
    },
    afterRender(host, api) {
      const dismiss = api.query('[data-ax-banner-dismiss]');
      if (dismiss)
        api.listen(dismiss, 'click', () => {
          host.hidden = true;
          api.dispatch('astryx:dismiss');
        });
      const toggle = api.query('[data-ax-banner-toggle]');
      if (toggle)
        api.listen(toggle, 'click', () =>
          setOpen(host, api, !api.read('is-open'), true),
        );
      if (api.read('collapsible')) setOpen(host, api, api.read('is-open'));
      else api.query('.ax-banner__content')?.removeAttribute('hidden');
    },
  },
  render(_host, h) {
    const status = h.attr('status');
    const title = h.content('title', 'title', 'Banner');
    const description = h.content('description', 'description');
    const titleID = h.id('title');
    const contentID = h.id('content');
    const classes = ['ax-banner', `ax-banner--${status}`];
    if (h.attr('container') === 'section') classes.push('ax-banner--section');
    if (h.attr('elevation') !== 'none')
      classes.push(`ax-banner--elevation-${h.attr('elevation')}`);
    const role =
      status === 'warning' || status === 'error' ? 'alert' : 'status';
    const hasContent = h.hasSlot();
    return `<section class="${classes.join(' ')}" role="${role}" aria-labelledby="${titleID}">
  <div class="ax-banner__surface">
    <span class="ax-banner__icon" aria-hidden="true"${h.hasSlot('icon') ? ` ${h.slot('icon')}` : ''}>${h.hasSlot('icon') ? '' : icons[status]}</span>
    <div class="ax-banner__body">
      <h3 class="ax-banner__title" id="${titleID}"${title.slotted ? ` ${h.slot('title')}` : ''}>${title.html}</h3>
      ${description.slotted || description.html ? `<p class="ax-banner__description"${description.slotted ? ` ${h.slot('description')}` : ''}>${description.html}</p>` : ''}
    </div>
    ${h.hasSlot('end-content') ? `<div class="ax-banner__actions" ${h.slot('end-content')}></div>` : ''}
    ${hasContent && h.attr('collapsible') ? `<button class="ax-button ax-button--ghost ax-button--sm" type="button" data-ax-banner-toggle aria-controls="${contentID}" aria-expanded="${h.attr('is-open')}">Details</button>` : ''}
    ${h.attr('is-dismissable') ? `<button class="ax-button ax-button--ghost ax-button--sm" type="button" data-ax-banner-dismiss aria-label="${h.escape(h.attr('dismiss-label'))}">×</button>` : ''}
  </div>
  ${hasContent ? `<div class="ax-banner__content" id="${contentID}"${h.attr('collapsible') && !h.attr('is-open') ? ' hidden' : ''} ${h.slot()}></div>` : ''}
</section>`;
  },
};
