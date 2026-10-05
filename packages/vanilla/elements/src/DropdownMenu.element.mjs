// Copyright (c) Meta Platforms, Inc. and affiliates.

const placements = ['above', 'below', 'start', 'end'];
const alignments = ['start', 'center', 'end'];

function items(api) {
  return api
    .queryAll('[role^="menuitem"], [data-ax-menu-item]')
    .filter(
      item => !item.disabled && item.getAttribute('aria-disabled') !== 'true',
    );
}

function syncMenu(host, api, open, {focus = false, emit = false} = {}) {
  const menu = api.query('[data-ax-dropdown-menu]');
  const trigger = api.control;
  if (!menu || !trigger) return;
  menu.dataset.axOpen = String(open);
  menu.hidden = !open;
  trigger.setAttribute('aria-expanded', String(open));
  if (open && typeof menu.showPopover === 'function') {
    try {
      menu.showPopover();
    } catch {}
  } else if (!open && typeof menu.hidePopover === 'function') {
    try {
      menu.hidePopover();
    } catch {}
  }
  api.reflect('is-menu-open', open);
  if (focus && open) items(api)[0]?.focus();
  if (emit) api.dispatch('astryx:open-change', {isOpen: open});
}

export default {
  name: 'DropdownMenu',
  tag: 'ax-dropdown-menu',
  attributes: {
    'button-label': {
      type: 'string',
      default: 'Menu',
      description: 'Visible trigger label.',
    },
    'is-menu-open': {
      type: 'boolean',
      aliases: ['open'],
      aliasProperties: ['open'],
      default: false,
      description: 'Controlled menu open state.',
    },
    placement: {
      type: 'enum',
      values: placements,
      default: 'below',
      description: 'Logical surface placement.',
    },
    alignment: {
      type: 'enum',
      values: alignments,
      default: 'start',
      description: 'Logical surface alignment.',
    },
    'menu-id': {type: 'string', description: 'Menu element identifier.'},
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables trigger interaction.',
    },
  },
  slots: {
    button: 'Trigger button content; the component supplies the native button.',
    default: {
      description: 'Native menu item controls.',
      required: true,
    },
  },
  exampleItemSelector: 'button, a, [data-ax-menu-item]',
  control: '[data-ax-dropdown-trigger]',
  methods: {
    show: {
      description: 'Open menu.',
      call(api) {
        syncMenu(this, api, true, {focus: true, emit: true});
      },
    },
    close: {
      description: 'Close menu.',
      call(api) {
        syncMenu(this, api, false, {emit: true});
        api.control?.focus();
      },
    },
  },
  events: {
    'astryx:open-change':
      'Emitted with {isOpen} whenever the menu opens or closes.',
    'astryx:select': 'Emitted with {value,label} from the activated menu item.',
  },
  hooks: {
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (name !== 'is-menu-open' || !api.control) return false;
      syncMenu(host, api, api.read('is-menu-open'));
      return true;
    },
    afterRender(host, api) {
      const menu = api.query('[data-ax-dropdown-menu]');
      const trigger = api.control;
      const open = api.read('is-menu-open');
      for (const item of menu.children) {
        if (item.matches('button, a') && !item.hasAttribute('role')) {
          item.setAttribute('role', 'menuitem');
        }
      }
      syncMenu(host, api, open);
      for (const item of items(api)) item.tabIndex = -1;
      api.listen(trigger, 'click', event => {
        event.preventDefault();
        if (!api.read('is-disabled'))
          syncMenu(host, api, !api.read('is-menu-open'), {
            focus: !api.read('is-menu-open'),
            emit: true,
          });
      });
      api.listen(trigger, 'keydown', event => {
        if (
          !['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key) ||
          api.read('is-disabled')
        )
          return;
        event.preventDefault();
        syncMenu(host, api, true, {focus: true, emit: true});
        if (event.key === 'ArrowUp') items(api).at(-1)?.focus();
      });
      api.listen(menu, 'toggle', event => {
        const nextOpen =
          typeof event.newState === 'string'
            ? event.newState === 'open'
            : menu.matches(':popover-open');
        const currentOpen = api.read('is-menu-open');
        if (
          currentOpen === nextOpen &&
          menu.dataset.axOpen === String(nextOpen) &&
          menu.hidden === !nextOpen
        )
          return;
        syncMenu(host, api, nextOpen, {emit: currentOpen !== nextOpen});
      });
      api.listen(menu.ownerDocument, 'focusin', event => {
        if (
          api.read('is-menu-open') &&
          event.target !== trigger &&
          !menu.contains(event.target)
        )
          syncMenu(host, api, false, {emit: true});
      });
      api.listen(menu, 'click', event => {
        const item = event.target.closest?.(
          '[role^="menuitem"], [data-ax-menu-item]',
        );
        if (
          !item ||
          item.disabled ||
          item.getAttribute('aria-disabled') === 'true'
        )
          return;
        api.dispatch('astryx:select', {
          value: item.value || item.dataset.value || '',
          label: item.textContent.trim(),
        });
        if (!item.hasAttribute('data-ax-menu-keep-open'))
          syncMenu(host, api, false, {emit: true});
      });
      api.listen(menu, 'keydown', event => {
        const enabled = items(api);
        const current = enabled.indexOf(event.target);
        if (event.key === 'Escape') {
          event.preventDefault();
          syncMenu(host, api, false, {emit: true});
          trigger.focus();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          enabled[
            (Math.max(0, current) +
              (event.key === 'ArrowDown' ? 1 : -1) +
              enabled.length) %
              enabled.length
          ]?.focus();
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          (event.key === 'Home' ? enabled[0] : enabled.at(-1))?.focus();
        }
      });
    },
  },
  docs: 'Open an accessible action menu with keyboard navigation and selection events.',
  examples: [
    {
      name: 'actions',
      html: `<ax-dropdown-menu button-label="Actions"><button type=button>Edit</button><button type=button>Archive</button></ax-dropdown-menu>`,
    },
    {
      name: 'compact',
      html: `<ax-dropdown-menu button-label="More"><button type=button>Move</button><a href="#share">Share</a></ax-dropdown-menu>`,
    },
  ],
  render(_host, h) {
    const id = h.attr('menu-id') || h.id('menu');
    const open = h.attr('is-menu-open');
    const button = h.content('button-label', 'button', 'Menu');
    const triggerAttrs = [
      'class="ax-button ax-button--secondary"',
      'type="button"',
      `data-ax-dropdown-trigger="${h.escape(id)}"`,
      `aria-controls="${h.escape(id)}"`,
      'aria-haspopup="menu"',
      `aria-expanded="${open}"`,
    ];
    if (h.attr('is-disabled')) triggerAttrs.push('disabled');
    return `<div class="ax-dropdown-menu" data-ax-owned="ax-dropdown-menu">
  <button ${triggerAttrs.join(' ')}${button.slotted ? ` ${h.slot('button')}` : ''}>${button.html}</button>
  <div class="ax-dropdown-menu__popover" id="${h.escape(id)}" role="menu" popover="auto" data-ax-dropdown-menu data-ax-owned="ax-dropdown-menu" data-ax-placement="${h.escape(h.attr('placement'))}" data-ax-alignment="${h.escape(h.attr('alignment'))}" data-ax-open="${open}" ${h.slot()}></div>
</div>`;
  },
};
