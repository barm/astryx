// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'TopNav',
  variant: 'default',
  tag: 'ax-top-nav',
  attributes: {label: 'Primary navigation'},
  html: `<span slot="heading" class="ax-top-nav__brand-mark" aria-hidden="true">A</span>
<span slot="heading">Astryx</span>
<a slot="start-content" class="ax-top-nav__item" href="#" aria-current="page">Overview</a>
<a slot="start-content" class="ax-top-nav__item" href="#">Projects</a>
<a slot="start-content" class="ax-top-nav__item" href="#">Reports</a>
<button slot="end-content" class="ax-button ax-button--ghost ax-button--sm">Help</button>
<button slot="end-content" class="ax-button ax-button--primary ax-button--sm">Create</button>`,
};
