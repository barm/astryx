// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'Tooltip',
  variant: 'icon button',
  tag: 'ax-tooltip',
  attributes: {
    content: 'More information about this project',
    'trigger-label': '?',
    'trigger-aria-label': 'Project information',
  },
  html: '',
  actualSelector: 'button',
  expectedSelector: 'button',
};
