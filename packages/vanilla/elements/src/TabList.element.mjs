// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['sm', 'md', 'lg'];
const layouts = ['hug', 'fill'];
const orientations = ['horizontal', 'vertical'];

function tabValue(tab) {
  return tab.getAttribute('value') || tab.textContent.trim();
}

function applySelection(
  host,
  api,
  requestedValue,
  {emit = false, focus = false} = {},
) {
  const list = api.query('[data-ax-tab-list]');
  const panelHost = api.query('[data-ax-panel-host]');
  if (!list || !panelHost) return false;
  const tabs = [...list.children].filter(child => child.localName === 'ax-tab');
  const enabled = tabs.filter(tab => !tab.disabled);
  if (
    enabled.length === 0 ||
    enabled.some(tab => !tab.querySelector('[role="tab"]'))
  ) {
    return false;
  }
  const selected =
    enabled.find(tab => tabValue(tab) === requestedValue) ?? enabled[0];
  const value = tabValue(selected);
  const selectedPanelID = selected.getAttribute('panel-id');

  for (const tab of tabs) {
    const button = tab.querySelector('[role="tab"]');
    const active = tab === selected;
    tab.toggleAttribute('data-selected', active);
    button?.setAttribute('aria-selected', String(active));
    button?.setAttribute('tabindex', active ? '0' : '-1');
  }
  for (const panel of panelHost.children) {
    panel.hidden = !selectedPanelID || panel.id !== selectedPanelID;
    if (panel.id === selectedPanelID) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute(
        'aria-labelledby',
        selected.querySelector('[role="tab"]').id,
      );
    }
  }
  api.reflect('value', value);
  if (focus) selected.focus();
  if (emit) api.dispatch('astryx:tab-change', {value}, selected);
  return true;
}

function moveSelection(host, api, key) {
  const list = api.query('[data-ax-tab-list]');
  const tabs = [...list.children].filter(
    tab => tab.localName === 'ax-tab' && !tab.disabled,
  );
  const active = tabs.findIndex(tab => tab.contains(document.activeElement));
  if (tabs.length === 0 || active < 0) return;
  const horizontal = api.read('orientation') === 'horizontal';
  let next = active;
  if (key === 'Home') next = 0;
  else if (key === 'End') next = tabs.length - 1;
  else if (
    (horizontal && key === 'ArrowRight') ||
    (!horizontal && key === 'ArrowDown')
  ) {
    next = (active + 1) % tabs.length;
  } else if (
    (horizontal && key === 'ArrowLeft') ||
    (!horizontal && key === 'ArrowUp')
  ) {
    next = (active - 1 + tabs.length) % tabs.length;
  } else return;
  applySelection(host, api, tabValue(tabs[next]), {emit: true, focus: true});
}

export default {
  name: 'TabList',
  tag: 'ax-tab-list',
  attributes: {
    value: {
      type: 'string',
      description: 'Selected child tab value, reflected after activation.',
    },
    size: {
      type: 'enum',
      values: sizes,
      default: 'md',
      description: 'Tab size matching TabList size.',
    },
    layout: {
      type: 'enum',
      values: layouts,
      default: 'hug',
      description: 'Tabs hug content or fill the available width.',
    },
    orientation: {
      type: 'enum',
      values: orientations,
      default: 'horizontal',
      description: 'Arrow-key and ARIA orientation.',
    },
    label: {
      type: 'string',
      default: 'Views',
      description: 'Accessible label for the native tablist.',
    },
  },
  slots: {
    default: {description: 'ax-tab children.', required: true},
    panels: 'Panel elements whose IDs match child panel-id attributes.',
  },
  events: {
    'astryx:tab-change': 'Bubbles from the activated ax-tab with detail.value.',
  },
  methods: {
    select: {
      description: 'Select a tab by value.',
      call(api, value) {
        return applySelection(this, api, String(value), {emit: true});
      },
    },
  },
  docs: 'Switch between related in-page views; non-selected slotted panels are hidden automatically.',
  examples: [
    {
      name: 'panels',
      html: `<ax-tab-list value="overview" label="Project views">
  <ax-tab value="overview" panel-id="panel-overview">Overview</ax-tab>
  <ax-tab value="activity" panel-id="panel-activity">Activity</ax-tab>
  <section slot="panels" id="panel-overview">Overview content</section>
  <section slot="panels" id="panel-activity">Activity content</section>
</ax-tab-list>`,
    },
    {
      name: 'fill',
      html: `<ax-tab-list layout="fill">
  <ax-tab value="one">One</ax-tab>
  <ax-tab value="two">Two</ax-tab>
</ax-tab-list>`,
    },
  ],
  hooks: {
    attributeChanged(host, name, _oldValue, newValue, api) {
      if (name !== 'value' || !api.control) return false;
      return applySelection(host, api, newValue ?? '');
    },
    afterRender(host, api) {
      const list = api.query('[data-ax-tab-list]');
      api.listen(list, 'click', event => {
        const tab = event.target.closest('ax-tab');
        if (!tab || !list.contains(tab) || tab.disabled) return;
        applySelection(host, api, tabValue(tab), {emit: true});
      });
      api.listen(list, 'keydown', event => {
        const handled = [
          'Home',
          'End',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
        ].includes(event.key);
        if (!handled) return;
        event.preventDefault();
        moveSelection(host, api, event.key);
      });
      queueMicrotask(() => applySelection(host, api, api.read('value')));
    },
  },
  render(_host, h) {
    const classes = ['ax-tab-list'];
    if (h.attr('layout') === 'fill') classes.push('ax-tab-list--fill');
    const orientation = h.attr('orientation');
    return `<div class="${classes.join(' ')}" role="tablist" aria-label="${h.escape(h.attr('label'))}" aria-orientation="${orientation}" data-ax-tab-list data-ax-owned="ax-tab-list" ${h.slot()}></div>
<div data-ax-panel-host ${h.slot('panels')}></div>`;
  },
};
