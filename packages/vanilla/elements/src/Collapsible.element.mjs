// Copyright (c) Meta Platforms, Inc. and affiliates.

const positions = ['start', 'end'];
const initialized = new WeakSet();

export default {
  name: 'Collapsible',
  tag: 'ax-collapsible',
  attributes: {
    trigger: {type: 'string', description: 'Always-visible disclosure.'},
    'is-open': {
      type: 'boolean',
      aliases: ['open'],
      aliasProperties: ['open'],
      default: false,
      description: 'Current open.',
    },
    'default-is-open': {
      type: 'boolean',
      default: false,
      description: 'Initial uncontrolled.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Prevents disclosure.',
    },
    'chevron-position': {
      type: 'enum',
      values: positions,
      default: 'end',
      description: 'Logical chevron.',
    },
    value: {
      type: 'string',
      description: 'Optional group.',
    },
  },
  slots: {
    trigger: {description: 'Always-visible disclosure.', required: true},
    default: 'Collapsible body content.',
  },
  content: [{attribute: 'trigger', slot: 'trigger', required: true}],
  control: 'summary',
  methods: {
    show: {
      description: 'Open disclosure.',
      call(api) {
        api.reflect('is-open', true);
        api.render();
      },
    },
    close: {
      description: 'Close disclosure.',
      call(api) {
        api.reflect('is-open', false);
        api.render();
      },
    },
  },
  events: {
    toggle: 'Native details toggle event.',
    'astryx:open-change': 'Emitted with {isOpen} after the disclosure changes.',
  },
  preserveAttributes: ['open'],
  hooks: {
    attributeChanged(_host, name, _oldValue, _newValue, api) {
      const details = api.query('details');
      if (name !== 'is-open' || !details) return false;
      details.open = api.read('is-open');
      return true;
    },
    afterRender(host, api) {
      const details = api.query('details');
      if (!initialized.has(host)) {
        const initial =
          host.hasAttribute('is-open') ||
          host.hasAttribute('open') ||
          host.hasAttribute('default-is-open') ||
          (!host.hasAttribute('is-open') && !host.hasAttribute('open'));
        details.open = initial;
        api.reflect('is-open', initial);
        initialized.add(host);
      } else {
        details.open = api.read('is-open');
      }
      if (api.read('is-disabled')) {
        api.control.setAttribute('aria-disabled', 'true');
        api.control.tabIndex = -1;
        api.listen(api.control, 'click', event => event.preventDefault());
        api.listen(api.control, 'keydown', event => event.preventDefault());
      }
      api.listen(details, 'toggle', () => {
        if (api.read('is-disabled')) {
          details.open = api.read('is-open');
          return;
        }
        api.reflect('is-open', details.open);
        api.dispatch('astryx:open-change', {isOpen: details.open});
      });
    },
  },
  docs: 'Collapsible custom element using native Astryx markup.',
  examples: [
    {
      name: 'default',
      html: `<ax-collapsible trigger="Details"><span class="ax-text ax-text--primary">Content</span></ax-collapsible>`,
    },
    {
      name: 'open',
      html: `<ax-collapsible trigger="More" is-open><span class="ax-text ax-text--primary">Open</span></ax-collapsible>`,
    },
  ],
  render(_host, h) {
    const trigger = h.content('trigger', 'trigger', 'Details');
    const classes = ['ax-collapsible'];
    if (h.attr('chevron-position') === 'start')
      classes.push('ax-collapsible--chevron-start');
    const open = h.attr('is-open') || h.attr('default-is-open');
    return `<details class="${classes.join(' ')}" data-ax-collapsible data-ax-owned="ax-collapsible"${open ? ' open' : ''}>
  <summary class="ax-collapsible__trigger"${trigger.slotted ? ` ${h.slot('trigger')}` : ''}>${trigger.html}</summary>
  <div class="ax-collapsible__content" ${h.slot()}></div>
</details>`;
  },
};
