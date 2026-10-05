// Copyright (c) Meta Platforms, Inc. and affiliates.

const variants = ['standard', 'fullscreen'];
const purposes = ['info', 'form', 'required'];

export default {
  name: 'Dialog',
  tag: 'ax-dialog',
  attributes: {
    open: {
      type: 'boolean',
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
  slots: {
    title: 'Required dialog heading.',
    default: 'Dialog body content.',
    footer: 'Optional dialog actions.',
  },
  docs: 'Present a focused task in a native modal dialog with managed focus return.',
  examples: [
    {
      name: 'confirmation',
      html: '<ax-dialog dialog-id="confirm-dialog"><span slot="title">Archive project?</span><p>You can restore this project later.</p><ax-button slot="footer">Cancel</ax-button></ax-dialog>',
    },
    {
      name: 'required',
      html: '<ax-dialog purpose="required"><span slot="title">Accept terms</span><p>Review and accept to continue.</p></ax-dialog>',
    },
  ],
  render(_host, h) {
    const dialogID = h.attr('dialog-id') || h.id('dialog');
    const titleID = `${dialogID}-title`;
    const variant = h.attr('variant');
    const purpose = h.attr('purpose');
    const classes = ['ax-dialog'];
    if (variant !== 'standard') classes.push(`ax-dialog--${variant}`);
    return `<dialog class="${classes.join(' ')}" id="${h.escape(dialogID)}" data-ax-dialog aria-labelledby="${h.escape(titleID)}"${purpose === 'required' ? ' data-ax-dialog-required' : ''}>
  <div class="ax-dialog__surface">
    <header class="ax-dialog__header">
      <h2 class="ax-dialog__title" id="${h.escape(titleID)}" tabindex="-1" ${h.slot('title')}></h2>
      <button class="ax-button ax-button--ghost" type="button" data-ax-dialog-close aria-label="Close dialog">×</button>
    </header>
    <div class="ax-dialog__body" ${h.slot()}></div>
    ${h.hasSlot('footer') ? `<footer class="ax-dialog__footer" ${h.slot('footer')}></footer>` : ''}
  </div>
</dialog>`;
  },
};
