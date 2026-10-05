// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Banner',
  variant: 'informational-card',
  tag: 'ax-banner',
  attributes: {
    status: 'info',
    title: 'Your trial ends in 5 days',
    description: 'Choose a plan to keep your workspace active.',
  },
  html: '<button slot="end-content" class="ax-button ax-button--secondary ax-button--sm" type="button">View plans</button>',
};
