// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Breadcrumbs',
  variant: 'default',
  tag: 'ax-breadcrumbs',
  attributes: {label: 'Breadcrumb'},
  html: `<li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><a class="ax-breadcrumbs__link" href="#home">Home</a></li>
<li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><a class="ax-breadcrumbs__link" href="#projects">Projects</a></li>
<li class="ax-breadcrumbs__item"><span class="ax-breadcrumbs__separator" aria-hidden="true">/</span><span class="ax-breadcrumbs__current" aria-current="page">Vanilla Astryx</span></li>`,
};
