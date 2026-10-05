// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'Toast',
  variant: 'error notification',
  tag: 'ax-toast',
  attributes: {
    body: 'Unable to save changes',
    type: 'error',
  },
  html: '',
  actualSelector: '.ax-toast',
  expectedSelector: '.ax-toast',
};
