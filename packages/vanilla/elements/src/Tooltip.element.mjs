// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global clearTimeout, globalThis, setTimeout */

const placements = ['above', 'below', 'start', 'end'];
const alignments = ['start', 'center', 'end'];
const focusTriggers = ['auto', 'always', 'never'];
const touchTriggers = ['auto', 'tap', 'none'];
const timers = new WeakMap();

function setOpen(host, api, open, emit = false) {
  clearTimeout(timers.get(host));
  const surface = api.query('[data-ax-tooltip-content]');
  if (!surface) return;
  surface.hidden = !open;
  surface.dataset.axOpen = String(open);
  api.reflect('is-open', open);
  if (emit) api.dispatch('astryx:open-change', {isOpen: open});
}

function scheduleOpen(host, api, immediate = false) {
  const delay = immediate ? 0 : Math.max(0, Number(api.read('delay')) || 0);
  clearTimeout(timers.get(host));
  if (delay === 0) setOpen(host, api, true, true);
  else
    timers.set(
      host,
      setTimeout(() => setOpen(host, api, true, true), delay),
    );
}

export default {
  name: 'Tooltip',
  tag: 'ax-tooltip',
  attributes: {
    content: {
      type: 'string',
      description: 'Short tooltip.',
    },
    'trigger-label': {
      type: 'string',
      default: '?',
      description: 'Generated trigger.',
    },
    'trigger-aria-label': {
      type: 'string',
      default: 'More information',
      description: 'Accessible name.',
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
      default: '200',
      description: 'Show delay.',
    },
    'hide-delay': {
      type: 'string',
      default: '0',
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
        'Enable tooltip behavior; omitted also remains enabled for HTML ergonomics.',
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
      description: 'Focusable hoverable.',
      required: true,
    },
    content: {description: 'Short tooltip.', required: true},
  },
  content: [{attribute: 'content', slot: 'content', required: true}],
  control: '[data-ax-tooltip-trigger]',
  methods: {
    show: {
      description: 'Show tooltip.',
      call(api) {
        setOpen(this, api, true, true);
      },
    },
    close: {
      description: 'Hide the tooltip.',
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
      if (name !== 'is-open' || !api.query('[data-ax-tooltip-content]'))
        return false;
      setOpen(host, api, api.read('is-open'));
      return true;
    },
    afterRender(host, api) {
      const surface = api.query('[data-ax-tooltip-content]');
      const trigger = [
        ...host.querySelectorAll(
          '[data-ax-slot-placeholder], [data-ax-tooltip-trigger], button, a, input, select, textarea, [tabindex]',
        ),
      ].find(node => !surface.contains(node));
      if (!trigger) return;
      trigger.setAttribute('data-ax-tooltip-trigger', '');
      trigger.setAttribute('aria-describedby', surface.id);
      host._control = trigger;
      setOpen(host, api, api.read('is-open'));
      if (globalThis.astryx || globalThis.AstryxVanilla) {
        api.listen(surface, 'astryx:tooltip-open', () =>
          api.reflect('is-open', true),
        );
        api.listen(surface, 'astryx:tooltip-close', () =>
          api.reflect('is-open', false),
        );
        return;
      }
      api.listen(host, 'pointerenter', () => scheduleOpen(host, api));
      api.listen(host, 'pointerleave', () => setOpen(host, api, false, true));
      api.listen(host, 'focusin', () => {
        if (api.read('focus-trigger') !== 'never')
          scheduleOpen(host, api, true);
      });
      api.listen(host, 'focusout', event => {
        if (!host.contains(event.relatedTarget))
          setOpen(host, api, false, true);
      });
      api.listen(host, 'keydown', event => {
        if (event.key === 'Escape' && api.read('is-open')) {
          event.preventDefault();
          setOpen(host, api, false, true);
        }
      });
    },
    disconnected(host) {
      clearTimeout(timers.get(host));
    },
  },
  docs: 'Tooltip custom element using native Astryx markup.',
  examples: [
    {
      name: 'icon-button',
      html: `<ax-tooltip content="Info"><button type="button">?</button></ax-tooltip>`,
    },
    {
      name: 'below',
      html: `<ax-tooltip content="Copied" placement="below"><button type="button">Copy</button></ax-tooltip>`,
    },
  ],
  render(_host, h) {
    const content = h.content('content', 'content', 'More information');
    const id = h.id('surface');
    const open = h.attr('is-open');
    const trigger = h.hasSlot()
      ? `<span ${h.slot()}></span>`
      : `<button class="ax-button ax-button--secondary" type="button" data-ax-tooltip-trigger aria-label="${h.escape(h.attr('trigger-aria-label'))}">${h.escape(h.attr('trigger-label'))}</button>`;
    return `<span class="ax-tooltip" data-ax-tooltip data-ax-owned="ax-tooltip" data-ax-tooltip-delay="${h.escape(h.attr('delay'))}" data-ax-tooltip-hide-delay="${h.escape(h.attr('hide-delay'))}">
  ${trigger}
  <span class="ax-tooltip__surface" id="${id}" role="tooltip" data-ax-tooltip-content data-ax-owned="ax-tooltip" data-ax-placement="${h.escape(h.attr('placement'))}" data-ax-alignment="${h.escape(h.attr('alignment'))}" data-ax-open="${open}"${open ? '' : ' hidden'}${content.slotted ? ` ${h.slot('content')}` : ''}>${content.html}</span>
</span>`;
  },
};
