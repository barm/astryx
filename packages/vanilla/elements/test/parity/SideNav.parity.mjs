// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'SideNav',
  variant: 'default',
  tag: 'ax-side-nav',
  attributes: {label: 'Application navigation'},
  html: `<a slot="header" class="ax-side-nav__brand" href="#"><span class="ax-side-nav__brand-mark" aria-hidden="true">A</span><span class="ax-side-nav__brand-copy"><span class="ax-side-nav__brand-name">Astryx Studio</span><span class="ax-side-nav__brand-context">Design systems</span></span></a>
<div class="ax-side-nav__section" role="group" aria-labelledby="main-nav-heading"><div class="ax-side-nav__section-title" id="main-nav-heading">Main</div><a class="ax-side-nav__item" href="#" aria-current="page"><span class="ax-side-nav__item-icon" aria-hidden="true">●</span><span class="ax-side-nav__item-label">Overview</span></a><a class="ax-side-nav__item" href="#"><span class="ax-side-nav__item-icon" aria-hidden="true">◆</span><span class="ax-side-nav__item-label">Projects</span></a><a class="ax-side-nav__item" href="#"><span class="ax-side-nav__item-icon" aria-hidden="true">▦</span><span class="ax-side-nav__item-label">Reports</span></a></div>
<div class="ax-side-nav__section" role="group" aria-labelledby="admin-nav-heading"><div class="ax-side-nav__section-title" id="admin-nav-heading">Administration</div><a class="ax-side-nav__item" href="#"><span class="ax-side-nav__item-icon" aria-hidden="true">●</span><span class="ax-side-nav__item-label">Team</span></a><span class="ax-side-nav__item" aria-disabled="true"><span class="ax-side-nav__item-icon" aria-hidden="true">◆</span><span class="ax-side-nav__item-label">Billing</span></span></div>
<button slot="footer" class="ax-button ax-button--ghost ax-button--sm">Settings</button>`,
};
