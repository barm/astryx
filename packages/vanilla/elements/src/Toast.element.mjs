// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global clearTimeout, document, globalThis, setTimeout */

const types = ['info', 'error'];
const timers = new WeakMap();

function ensureViewport() {
  let viewport = document.querySelector('[data-ax-toast-viewport]');
  if (!viewport) {
    viewport = document.createElement('div');
    viewport.className = 'ax-toast-viewport';
    viewport.dataset.axToastViewport = '';
    viewport.setAttribute('aria-live', 'polite');
    viewport.setAttribute('aria-relevant', 'additions');
    document.body.append(viewport);
  }
  return viewport;
}

function showFallback(host, api) {
  const toast = document.createElement('div');
  const type = api.read('type');
  toast.className = `ax-toast ax-toast--${type}`;
  toast.dataset.axToastItem = '';
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const body = document.createElement('span');
  body.className = 'ax-toast__body';
  body.textContent = api.read('body');
  toast.append(body);
  const close = document.createElement('button');
  close.className = 'ax-toast__close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  toast.append(close);
  const dismiss = reason => {
    clearTimeout(timers.get(toast));
    toast.remove();
    api.dispatch('astryx:dismiss', {reason}, host);
  };
  close.addEventListener('click', () => dismiss('manual'));
  ensureViewport().append(toast);
  const duration = Number(api.read('auto-hide-duration')) || 0;
  if (api.read('is-auto-hide') && duration > 0)
    timers.set(
      toast,
      setTimeout(() => dismiss('auto'), duration),
    );
}

export default {
  name: 'Toast',
  tag: 'ax-toast',
  attributes: {
    body: {type: 'string', description: 'Notification message.'},
    'trigger-label': {
      type: 'string',
      default: 'Show toast',
      description: 'Visible trigger.',
    },
    type: {
      type: 'enum',
      values: types,
      default: 'info',
      description: 'Informational error.',
    },
    'is-auto-hide': {
      type: 'boolean',
      default: false,
      description: 'Automatically dismiss.',
    },
    'auto-hide-duration': {
      type: 'string',
      default: '5000',
      description: 'Auto-hide delay.',
    },
  },
  slots: {
    body: {description: 'Notification message.', required: true},
    default: 'Visible trigger label.',
  },
  content: [
    {attribute: 'body', slot: 'body', required: true},
    {attribute: 'trigger-label', slot: 'default'},
  ],
  control: 'button[data-ax-toast]',
  methods: {
    show: {
      description: 'Show configured.',
      call(api) {
        if (globalThis.astryx?.toast)
          globalThis.astryx.toast(api.read('body'), {
            type: api.read('type'),
            duration: api.read('is-auto-hide')
              ? Number(api.read('auto-hide-duration'))
              : 0,
          });
        else showFallback(this, api);
      },
    },
  },
  events: {
    'astryx:dismiss': 'Custom event.',
  },
  hooks: {
    afterRender(host, api) {
      api.listen(api.control, 'click', () => {
        if (globalThis.astryx?.toast) return;
        showFallback(host, api);
      });
    },
  },
  docs: 'Toast custom element using native Astryx markup.',
  examples: [
    {name: 'info', html: `<ax-toast body="Saved">Show</ax-toast>`},
    {name: 'error', html: `<ax-toast body="Failed" type="error"></ax-toast>`},
  ],
  render(_host, h) {
    const label = h.content(
      'trigger-label',
      'default',
      h.attr('trigger-label'),
    );
    return `<button class="ax-button ax-button--${h.attr('type') === 'error' ? 'destructive' : 'primary'}" type="button" data-ax-toast="${h.escape(h.attr('body'))}" data-ax-toast-type="${h.escape(h.attr('type'))}" data-ax-toast-duration="${h.attr('is-auto-hide') ? h.escape(h.attr('auto-hide-duration')) : '0'}"${label.slotted ? ` ${h.slot()}` : ''}>${label.html}</button>
<span hidden ${h.slot('body')}></span>`;
  },
};
