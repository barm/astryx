// Copyright (c) Meta Platforms, Inc. and affiliates.

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
      const list = api.query('.ax-breadcrumbs__list');
      if (!list) return;

      api.mutate(() => {
        for (const emptyWrapper of list.querySelectorAll(
          ':scope > li[data-ax-breadcrumb-wrapper]:empty',
        )) {
          emptyWrapper.remove();
        }
        for (const child of [...list.children]) {
          if (child.localName === 'li') continue;
          if (!child.matches('a, span:not(.ax-breadcrumbs__separator), strong'))
            continue;
          const wrapper = document.createElement('li');
          wrapper.setAttribute('data-ax-breadcrumb-wrapper', '');
          child.before(wrapper);
          wrapper.append(child);
        }

        const items = [...list.children].filter(
          child => child.localName === 'li',
        );
        for (const item of items) {
          item.classList.add('ax-breadcrumbs__item');
          let separator = item.querySelector(
            ':scope > .ax-breadcrumbs__separator',
          );
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

        if (items.length && !list.querySelector('[aria-current="page"]')) {
          items
            .at(-1)
            .querySelector(
              ':scope > a, :scope > span:not(.ax-breadcrumbs__separator), :scope > strong',
            )
            ?.setAttribute('aria-current', 'page');
        }
        for (const item of items) {
          const content = item.querySelector(
            ':scope > a, :scope > span:not(.ax-breadcrumbs__separator), :scope > strong',
          );
          if (!content) continue;
          const isCurrent = content.getAttribute('aria-current') === 'page';
          content.classList.toggle('ax-breadcrumbs__current', isCurrent);
          content.classList.toggle(
            'ax-breadcrumbs__link',
            content.localName === 'a' && !isCurrent,
          );
        }
      });
      preserveWrappedItems(host, list);
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
