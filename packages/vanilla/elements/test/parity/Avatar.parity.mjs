// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Avatar',
  variant: 'initials-with-status',
  tag: 'ax-avatar',
  attributes: {
    name: 'Ada Lovelace',
    alt: 'Ada Lovelace, Online',
    size: 'md',
    shape: 'circle',
  },
  html: '<span slot="status" class="ax-status-dot ax-status-dot--success"></span>',
  actualSelector: '.ax-avatar',
  expectedSelector: '.ax-avatar',
};
