// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Selector',
  variant: 'default',
  tag: 'ax-selector',
  attributes: {
    label: 'Workspace',
    'html-name': 'workspace',
    description: 'Choose where this project belongs.',
  },
  html: '<option>Design systems</option><option>Developer tools</option><option>Business platform</option>',
};
