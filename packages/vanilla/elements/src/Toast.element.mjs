// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global clearTimeout, setTimeout */

const types = ['info', 'error'];
const timers = new WeakMap();

function clearTimer(host) {
  clearTimeout(timers.get(host));
  timers.delete(host);
}

function dismiss(host, api, reason = 'manual') {
  clearTimer(host);
  host.hidden = true;
  api.dispatch('astryx:dismiss', {reason});
}

function scheduleAutoHide(host, api) {
  clearTimer(host);
  if (!api.read('is-auto-hide') || host.hidden) return;
  const duration = Math.max(0, Number(api.read('auto-hide-duration')) || 0);
  if (duration > 0) {
    timers.set(
      host,
      setTimeout(() => dismiss(host, api, 'auto'), duration),
    );
  }
}

export default {
  name: 'Toast',
  tag: 'ax-toast',
  attributes: {
    body: {
      type: 'string',
      description: 'Visible notification message.',
    },
    type: {
      type: 'enum',
      values: types,
      default: 'info',
      description: 'Semantic notification type.',
    },
    'is-auto-hide': {
      type: 'boolean',
      default: false,
      description: 'Enables timed dismissal.',
    },
    'auto-hide-duration': {
      type: 'string',
      default: '5000',
      description: 'Auto-hide delay milliseconds.',
    },
  },
  slots: {
    body: {description: 'Rich notification message content.', required: true},
  },
  content: [{attribute: 'body', slot: 'body', required: true}],
  control: '[data-ax-toast-dismiss]',
  methods: {
    show: {
      description: 'Show and restart auto-hide.',
      call(api) {
        this.hidden = false;
        scheduleAutoHide(this, api);
      },
    },
    dismiss: {
      description: 'Dismiss programmatically.',
      call(api) {
        dismiss(this, api, 'programmatic');
      },
    },
  },
  events: {
    'astryx:dismiss':
      'Emitted with {reason} when the notification is dismissed manually, automatically, or programmatically.',
  },
  hooks: {
    connected(host, api) {
      scheduleAutoHide(host, api);
    },
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (!['is-auto-hide', 'auto-hide-duration'].includes(name)) return false;
      scheduleAutoHide(host, api);
      return true;
    },
    afterRender(host, api) {
      api.listen(api.control, 'click', () => dismiss(host, api, 'manual'));
    },
    disconnected(host) {
      clearTimer(host);
    },
  },
  docs: 'Display a declarative status or error notification with optional timed dismissal.',
  examples: [
    {name: 'info', html: `<ax-toast body="Saved"></ax-toast>`},
    {
      name: 'error',
      html: `<ax-toast type="error"><span slot="body">Save failed. Try again.</span></ax-toast>`,
    },
  ],
  render(_host, h) {
    const body = h.content('body', 'body', 'Done');
    const type = h.attr('type');
    return `<div class="ax-toast ax-toast--${type}" data-ax-toast-item data-ax-owned="ax-toast" role="${type === 'error' ? 'alert' : 'status'}">
  <span class="ax-toast__body"${body.slotted ? ` ${h.slot('body')}` : ''}>${body.html}</span>
  <button class="ax-toast__close" type="button" data-ax-toast-dismiss aria-label="Dismiss notification">×</button>
</div>`;
  },
};
