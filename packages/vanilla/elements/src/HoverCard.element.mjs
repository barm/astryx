// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global clearTimeout, globalThis, setTimeout */

const placements = ['above', 'below', 'start', 'end'];
const alignments = ['start', 'center', 'end'];
const focusTriggers = ['auto', 'always', 'never'];
const touchTriggers = ['auto', 'tap', 'none'];
const timers = new WeakMap();

function setOpen(host, api, open, emit = false) {
  clearTimeout(timers.get(host));
  const surface = api.query('[data-ax-hover-card-content]');
  const trigger = api.control;
  if (!surface) return;
  surface.hidden = !open;
  surface.dataset.axOpen = String(open);
  trigger?.setAttribute('aria-expanded', String(open));
  api.reflect('is-open', open);
  if (emit) api.dispatch('astryx:open-change', {isOpen: open});
}

function schedule(host, api, open, immediate = false) {
  clearTimeout(timers.get(host));
  const delay = immediate
    ? 0
    : Math.max(0, Number(api.read(open ? 'delay' : 'hide-delay')) || 0);
  if (delay === 0) setOpen(host, api, open, true);
  else
    timers.set(
      host,
      setTimeout(() => setOpen(host, api, open, true), delay),
    );
}

export default {
  name: 'HoverCard',
  tag: 'ax-hover-card',
  attributes: {
    content: {
      type: 'string',
      description: 'Card text.',
    },
    label: {
      type: 'string',
      description:
        'Accessible dialog name; without one the surface is a group.',
    },
    placement: {
      type: 'enum',
      values: placements,
      default: 'above',
      description: 'Logical placement.',
    },
    alignment: {
      type: 'enum',
      values: alignments,
      default: 'center',
      description: 'Logical alignment.',
    },
    delay: {
      type: 'string',
      default: '300',
      description: 'Show delay.',
    },
    'hide-delay': {
      type: 'string',
      default: '200',
      description: 'Hide delay.',
    },
    'focus-trigger': {
      type: 'enum',
      values: focusTriggers,
      default: 'auto',
      description: 'Whether focus.',
    },
    'touch-trigger': {
      type: 'enum',
      values: touchTriggers,
      default: 'auto',
      description: 'Touch activation.',
    },
    'is-enabled': {
      type: 'boolean',
      default: false,
      description:
        'Enable hover-card behavior; omitted also remains enabled for HTML ergonomics.',
    },
    'is-open': {
      type: 'boolean',
      aliases: ['open'],
      aliasProperties: ['open'],
      default: false,
      description: 'Controlled open.',
    },
  },
  slots: {
    default: {
      description: 'Hoverable focusable.',
      required: true,
    },
    content: {description: 'Rich supplementary.', required: true},
  },
  content: [{attribute: 'content', slot: 'content', required: true}],
  control: '[data-ax-hover-card-trigger]',
  methods: {
    show: {
      description: 'Show hover.',
      call(api) {
        setOpen(this, api, true, true);
      },
    },
    close: {
      description: 'Hide hover.',
      call(api) {
        setOpen(this, api, false, true);
      },
    },
  },
  events: {
    'astryx:open-change': 'Custom event.',
  },
  hooks: {
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (name !== 'is-open' || !api.query('[data-ax-hover-card-content]'))
        return false;
      setOpen(host, api, api.read('is-open'));
      return true;
    },
    afterRender(host, api) {
      const surface = api.query('[data-ax-hover-card-content]');
      const trigger = [
        ...host.querySelectorAll(
          '[data-ax-hover-card-trigger], button, a, input, [tabindex]',
        ),
      ].find(node => !surface.contains(node));
      if (!trigger) return;
      trigger.setAttribute('data-ax-hover-card-trigger', '');
      trigger.setAttribute('aria-controls', surface.id);
      trigger.setAttribute('aria-expanded', String(api.read('is-open')));
      if (surface.getAttribute('role') === 'dialog')
        trigger.setAttribute('aria-haspopup', 'dialog');
      else trigger.setAttribute('aria-describedby', surface.id);
      host._control = trigger;
      setOpen(host, api, api.read('is-open'));
      if (globalThis.astryx || globalThis.AstryxVanilla) {
        api.listen(surface, 'astryx:hover-card-open', () =>
          api.reflect('is-open', true),
        );
        api.listen(surface, 'astryx:hover-card-close', () =>
          api.reflect('is-open', false),
        );
        return;
      }
      api.listen(host, 'pointerenter', () => schedule(host, api, true));
      api.listen(host, 'pointerleave', () => schedule(host, api, false));
      api.listen(host, 'focusin', () => {
        if (api.read('focus-trigger') !== 'never')
          schedule(host, api, true, true);
      });
      api.listen(host, 'focusout', event => {
        if (!host.contains(event.relatedTarget)) schedule(host, api, false);
      });
      api.listen(host, 'keydown', event => {
        if (event.key === 'Escape' && api.read('is-open')) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(host, api, false, true);
          trigger.focus();
        }
      });
    },
    disconnected(host) {
      clearTimeout(timers.get(host));
    },
  },
  docs: 'HoverCard custom element using native Astryx markup.',
  examples: [
    {
      name: 'profile',
      html: `<ax-hover-card content="Designer"><button type="button">Jordan</button></ax-hover-card>`,
    },
    {
      name: 'link',
      html: `<ax-hover-card content="Roadmap" placement="below"><a href="#roadmap">View</a></ax-hover-card>`,
    },
  ],
  render(_host, h) {
    const content = h.content('content', 'content', 'More information');
    const id = h.id('surface');
    const open = h.attr('is-open');
    const label = h.attr('label');
    return `<span class="ax-hover-card" data-ax-hover-card data-ax-owned="ax-hover-card" data-ax-hover-card-delay="${h.escape(h.attr('delay'))}" data-ax-hover-card-hide-delay="${h.escape(h.attr('hide-delay'))}">
  <span ${h.slot()}></span>
  <span class="ax-hover-card__surface" id="${id}" data-ax-hover-card-content data-ax-owned="ax-hover-card" data-ax-placement="${h.escape(h.attr('placement'))}" data-ax-alignment="${h.escape(h.attr('alignment'))}" data-ax-open="${open}" role="${label ? 'dialog' : 'group'}"${label ? ` aria-label="${h.escape(label)}"` : ''}${open ? '' : ' hidden'}><span class="ax-hover-card__body"${content.slotted ? ` ${h.slot('content')}` : ''}>${content.html}</span></span>
</span>`;
  },
};
