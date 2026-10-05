// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'Toast',
  variant: 'error trigger',
  tag: 'ax-toast',
  attributes: {
    body: 'Unable to save changes',
    'trigger-label': 'Show error toast',
    type: 'error',
  },
  html: '',
  actualSelector: 'button',
  expectedSelector: 'button',
};
