// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  name: 'DropdownMenu',
  variant: 'actions',
  tag: 'ax-dropdown-menu',
  attributes: {'button-label': 'Actions', 'menu-id': 'project-actions'},
  html: '<button class="ax-dropdown-menu__item" type="button" role="menuitem">Edit project</button><button class="ax-dropdown-menu__item" type="button" role="menuitem">Duplicate project</button><hr class="ax-dropdown-menu__divider"><button class="ax-dropdown-menu__item ax-dropdown-menu__item--destructive" type="button" role="menuitem">Archive project</button>',
  actualSelector: '.ax-dropdown-menu__item',
  expectedSelector: '.ax-dropdown-menu__item',
};
