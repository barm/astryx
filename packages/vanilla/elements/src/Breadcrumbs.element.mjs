// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global MutationObserver */

const contentSelector =
  ':scope > a, :scope > span:not(.ax-breadcrumbs__separator), :scope > strong';
const observers = new WeakMap();

function isBreadcrumbContent(node) {
  return node.matches?.('a, span:not(.ax-breadcrumbs__separator), strong');
}

function preserveWrappedItems(host, list) {
  const authorNodes = [...list.childNodes];
  host._authorNodes = authorNodes;
  host._slotByNode = new WeakMap(authorNodes.map(node => [node, 'default']));

  // The runtime must preserve the wrappers on reconnect. Recreating them leaves
  // detached mutation targets that can make an observing ancestor rerender.
  const unmarkGenerated = node => {
    host._generatedNodes.delete(node);
    for (const child of node.childNodes) unmarkGenerated(child);
  };
  for (const node of authorNodes) unmarkGenerated(node);
}

function normalizeItems(host, api) {
  const list = api.query('.ax-breadcrumbs__list');
  if (!list) return;

  const existingObserver = observers.get(host);
  existingObserver?.disconnect();
  api.mutate(() => {
    const root = list.closest('[data-ax-root]');
    const hostChildren = [...host.children];
    const rootIndex = hostChildren.indexOf(root);
    const beforeRoot = hostChildren
      .slice(0, rootIndex)
      .filter(isBreadcrumbContent);
    const afterRoot = hostChildren
      .slice(rootIndex + 1)
      .filter(isBreadcrumbContent);
    for (const child of beforeRoot.reverse()) list.prepend(child);
    for (const child of afterRoot) list.append(child);

    for (const child of [...list.children]) {
      if (child.localName === 'li' || !isBreadcrumbContent(child)) continue;
      const wrapper = document.createElement('li');
      wrapper.setAttribute('data-ax-breadcrumb-wrapper', '');
      child.before(wrapper);
      wrapper.append(child);
    }

    for (const item of [...list.children].filter(
      child => child.localName === 'li',
    )) {
      const content = [...item.children].filter(isBreadcrumbContent);
      if (content.length === 0) {
        item.remove();
        continue;
      }
      let previous = item;
      for (const extra of content.slice(1)) {
        const wrapper = document.createElement('li');
        wrapper.setAttribute('data-ax-breadcrumb-wrapper', '');
        previous.after(wrapper);
        wrapper.append(extra);
        previous = wrapper;
      }
    }

    const items = [...list.children].filter(child => child.localName === 'li');
    for (const item of items) {
      item.classList.add('ax-breadcrumbs__item');
      let separator = item.querySelector(':scope > .ax-breadcrumbs__separator');
      if (!separator) {
        separator = document.createElement('span');
        separator.className = 'ax-breadcrumbs__separator';
        separator.setAttribute('aria-hidden', 'true');
        item.prepend(separator);
      }
      const separatorText = api.read('separator');
      if (separator.textContent !== separatorText)
        separator.textContent = separatorText;
    }

    for (const generatedCurrent of list.querySelectorAll(
      '[data-ax-breadcrumb-generated-current]',
    )) {
      generatedCurrent.removeAttribute('aria-current');
      generatedCurrent.removeAttribute('data-ax-breadcrumb-generated-current');
    }
    let current = items
      .map(item => item.querySelector(contentSelector))
      .find(content => content?.getAttribute('aria-current') === 'page');
    if (!current && items.length) {
      current = items.at(-1).querySelector(contentSelector);
      current?.setAttribute('aria-current', 'page');
      current?.setAttribute('data-ax-breadcrumb-generated-current', '');
    }
    for (const item of items) {
      const content = item.querySelector(contentSelector);
      if (!content) continue;
      const isCurrent = content === current;
      content.classList.toggle('ax-breadcrumbs__current', isCurrent);
      content.classList.toggle(
        'ax-breadcrumbs__link',
        content.localName === 'a' && !isCurrent,
      );
    }
  });
  preserveWrappedItems(host, list);

  const observer =
    existingObserver ??
    new MutationObserver(() => {
      if (host.isConnected) normalizeItems(host, api);
    });
  observers.set(host, observer);
  observer.observe(host, {childList: true, subtree: true});
}

export default {
  name: 'Breadcrumbs',
  tag: 'ax-breadcrumbs',
  attributes: {
    separator: {
      type: 'string',
      default: '/',
      description: 'Visible separator between authored breadcrumb items.',
    },
    variant: {
      type: 'enum',
      values: ['default', 'supporting'],
      default: 'default',
      description: 'Default or supporting visual treatment.',
    },
    label: {
      type: 'string',
      default: 'Breadcrumb',
      description: 'Accessible label for the navigation landmark.',
    },
  },
  slots: {
    default: {
      description:
        'Plain link and current-page children; Breadcrumbs generates list items, separators, and BEM classes.',
      required: true,
    },
  },
  docs: 'Show a short navigation trail above the page heading and mark the current location.',
  examples: [
    {
      name: 'default',
      html: `<ax-breadcrumbs>
  <a href="#home">Home</a>
  <span>Projects</span>
</ax-breadcrumbs>`,
    },
    {
      name: 'supporting',
      gallery: false,
      html: `<ax-breadcrumbs variant="supporting" label="Settings breadcrumb" separator="›">
  <a href="#settings">Settings</a>
  <strong>Notifications</strong>
</ax-breadcrumbs>`,
    },
  ],
  hooks: {
    afterRender(host, api) {
      normalizeItems(host, api);
    },
    disconnected(host) {
      observers.get(host)?.disconnect();
      observers.delete(host);
    },
  },
  render(_host, h) {
    const classes = ['ax-breadcrumbs'];
    if (h.attr('variant') === 'supporting')
      classes.push('ax-breadcrumbs--supporting');
    return `<nav class="${classes.join(' ')}" aria-label="${h.escape(h.attr('label'))}">
  <ol class="ax-breadcrumbs__list" ${h.slot()}></ol>
</nav>`;
  },
};
