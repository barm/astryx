// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'HoverCard',
  variant: 'profile-preview',
  tag: 'ax-hover-card',
  attributes: {label: 'Jordan Lee profile preview'},
  html: '<button class="ax-hover-card__trigger ax-hover-card__trigger--text" type="button">Jordan Lee</button><span slot="content"><strong>Jordan Lee</strong><span class="ax-text ax-text--supporting">Product designer · New York</span></span>',
  actualSelector: '.ax-text--supporting',
  expectedSelector: '.ax-text--supporting',
};
