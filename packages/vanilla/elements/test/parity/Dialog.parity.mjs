// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Dialog',
  variant: 'confirmation',
  tag: 'ax-dialog',
  attributes: {'dialog-id': 'confirm-dialog'},
  html: '<span slot="title">Archive project?</span><p class="ax-text">You can restore this project later.</p><button class="ax-button ax-button--ghost" type="button" data-ax-dialog-close slot="footer">Cancel</button><button class="ax-button ax-button--primary" type="button" data-ax-dialog-close slot="footer">Archive</button>',
  actualSelector: 'dialog',
  expectedSelector: 'dialog',
};
