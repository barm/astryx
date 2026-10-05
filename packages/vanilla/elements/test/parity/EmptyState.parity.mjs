// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'EmptyState',
  variant: 'default',
  tag: 'ax-empty-state',
  attributes: {
    title: 'No projects yet',
    description: 'Create a project to start organizing your work.',
    'heading-level': '3',
  },
  html: '',
  actualSelector: '.ax-empty-state__text',
  expectedSelector: '.ax-empty-state__text',
};
