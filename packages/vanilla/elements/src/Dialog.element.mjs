// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = ['standard', 'fullscreen'];
const purposes = ['info', 'form', 'required'];
const returnFocus = new WeakMap();

function restoreFocus(host) {
  const target = returnFocus.get(host);
  returnFocus.delete(host);
  if (target?.isConnected) target.focus();
}

function showDialog(host, api, opener = document.activeElement) {
  const dialog = api.control;
  if (!dialog) return false;
  if (opener && opener !== dialog && !host.contains(opener))
    returnFocus.set(host, opener);
  if (!dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  api.reflect('is-open', true);
  queueMicrotask(() => api.query('.ax-dialog__title')?.focus());
  return true;
}

function closeDialog(host, api, returnValue = '') {
  const dialog = api.control;
  if (!dialog?.open) {
    api.reflect('is-open', false);
    return false;
  }
  if (typeof dialog.close === 'function') {
    dialog.close(String(returnValue));
    api.reflect('is-open', false);
    restoreFocus(host);
  } else {
    dialog.removeAttribute('open');
    api.reflect('is-open', false);
    restoreFocus(host);
  }
  return true;
}

export default {
  name: 'Dialog',
  tag: 'ax-dialog',
  attributes: {
    title: {
      type: 'string',
      description: 'Visible dialog heading when the title slot is empty.',
    },
    'is-open': {
      type: 'boolean',
      aliases: ['open'],
      aliasProperties: ['open'],
      default: false,
      description: 'Open state reflected from the native dialog.',
    },
    variant: {
      type: 'enum',
      values: variants,
      default: 'standard',
      description: 'Standard or fullscreen presentation.',
    },
    purpose: {
      type: 'enum',
      values: purposes,
      default: 'info',
      description: 'Dismissal policy for info, form, or required tasks.',
    },
    'dialog-id': {
      type: 'string',
      description: 'ID placed on the inner native dialog for trigger wiring.',
    },
  },
  attributeSuggestions: {
    opened: 'is-open',
  },
  slots: {
    title: {description: 'Required dialog heading.', required: true},
    default: 'Dialog body content.',
    footer: 'Optional dialog actions.',
  },
  content: [{attribute: 'title', slot: 'title', required: true}],
  control: 'dialog[data-ax-dialog]',
  preserveAttributes: ['open'],
  delegates: {
    properties: ['returnValue'],
  },
  methods: {
    show: {
      description: 'Open the native modal dialog and move focus to its title.',
      call(api) {
        return showDialog(this, api);
      },
    },
    close: {
      description: 'Close the native dialog and restore focus to its opener.',
      call(api, returnValue = '') {
        return closeDialog(this, api, returnValue);
      },
    },
  },
  events: {
    close: 'Native dialog close event after is-open is reflected false.',
    cancel: 'Native cancel event; prevented for purpose="required".',
  },
  docs: 'Present a focused task in a native modal dialog with managed focus return; call show()/close() or use is-open.',
  examples: [
    {
      name: 'open-and-close',
      html: `<ax-button data-ax-dialog-open="confirm-dialog">Open dialog</ax-button>
<ax-dialog dialog-id="confirm-dialog">
  <span slot="title">Archive project?</span>
  <p>You can restore this project later.</p>
  <ax-button slot="footer" data-ax-dialog-close>Cancel</ax-button>
</ax-dialog>`,
    },
    {
      name: 'required',
      gallery: false,
      html: `<ax-dialog purpose="required" title="Accept terms" is-open>
  <p>Review and accept to continue.</p>
</ax-dialog>`,
    },
  ],
  hooks: {
    connected(host, api) {
      const onClick = event => {
        const opener = event.target.closest?.('[data-ax-dialog-open]');
        if (
          opener &&
          opener.getAttribute('data-ax-dialog-open') === api.control?.id
        ) {
          event.preventDefault();
          showDialog(host, api, opener);
          return;
        }
        const closer = event.target.closest?.('[data-ax-dialog-close]');
        if (closer && host.contains(closer)) {
          event.preventDefault();
          closeDialog(host, api, closer.getAttribute('value') ?? '');
        }
      };
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    },
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (name !== 'is-open' || !api.control) return false;
      if (api.read('is-open')) showDialog(host, api);
      else closeDialog(host, api);
      return true;
    },
    afterRender(host, api) {
      const dialog = api.control;
      api.listen(dialog, 'close', () => {
        if (dialog.open) return;
        api.reflect('is-open', false);
        restoreFocus(host);
      });
      api.listen(dialog, 'cancel', event => {
        event.preventDefault();
        if (api.read('purpose') !== 'required') closeDialog(host, api);
      });
      api.listen(dialog, 'click', event => {
        if (event.target === dialog && api.read('purpose') !== 'required') {
          closeDialog(host, api);
        }
      });
      if (api.read('is-open') && !dialog.open) showDialog(host, api);
      if (!api.read('is-open') && dialog.open) closeDialog(host, api);
    },
  },
  render(_host, h) {
    const dialogID = h.attr('dialog-id') || h.id('dialog');
    const titleID = `${dialogID}-title`;
    const variant = h.attr('variant');
    const purpose = h.attr('purpose');
    const title = h.content('title', 'title', 'Dialog');
    const classes = ['ax-dialog'];
    if (variant !== 'standard') classes.push(`ax-dialog--${variant}`);
    return `<dialog class="${classes.join(' ')}" id="${h.escape(dialogID)}" data-ax-dialog data-ax-owned="ax-dialog" aria-labelledby="${h.escape(titleID)}"${purpose === 'required' ? ' data-ax-dialog-required' : ''}>
  <div class="ax-dialog__surface">
    <header class="ax-dialog__header">
      <h2 class="ax-dialog__title" id="${h.escape(titleID)}" tabindex="-1"${title.slotted ? ` ${h.slot('title')}` : ''}>${title.html}</h2>
      ${purpose === 'required' ? '' : '<button class="ax-button ax-button--ghost" type="button" data-ax-dialog-close aria-label="Close dialog">×</button>'}
    </header>
    <div class="ax-dialog__body" ${h.slot()}></div>
    ${h.hasSlot('footer') ? `<footer class="ax-dialog__footer" ${h.slot('footer')}></footer>` : ''}
  </div>
</dialog>`;
  },
};
