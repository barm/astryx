// Copyright (c) Meta Platforms, Inc. and affiliates.

const heights = ['fill', 'auto'];

export default {
  name: 'Layout',
  tag: 'ax-layout',
  attributes: {
    height: {
      type: 'enum',
      values: heights,
      default: 'fill',
      description: 'Fill the available container or grow with content.',
    },
  },
  slots: {
    header: 'Optional header region.',
    start: 'Optional logical-start panel region.',
    default: 'Primary content region.',
    end: 'Optional logical-end panel region.',
    footer: 'Optional footer region.',
  },
  docs: 'Arrange header, start, content, end, and footer regions in a bounded layout.',
  examples: [
    {
      name: 'page-shell',
      html: `<ax-layout>
  <h1 slot="header">Page title</h1>
  <p>Page content</p>
  <small slot="footer">Footer</small>
</ax-layout>`,
    },
    {
      name: 'named-regions',
      html: `<ax-layout>
  <nav slot="start">Navigation</nav>
  <main>Main content</main>
  <aside slot="end">Inspector</aside>
</ax-layout>`,
    },
  ],
  render(_host, h) {
    const hasPanels = h.hasSlot('start') || h.hasSlot('end');
    const classes = ['ax-layout'];
    if (hasPanels) classes.push('ax-layout--regions');
    if (hasPanels && h.hasSlot('start') && h.hasSlot('end')) {
      classes.push('ax-layout--three-column');
    }

    if (!hasPanels) {
      return `<div class="${classes.join(' ')}">
  ${h.hasSlot('header') ? `<header class="ax-layout__header" ${h.slot('header')}></header>` : ''}
  <main class="ax-layout__main" ${h.slot()}></main>
  ${h.hasSlot('footer') ? `<footer class="ax-layout__footer" ${h.slot('footer')}></footer>` : ''}
</div>`;
    }

    return `<div class="${classes.join(' ')}">
  ${h.hasSlot('header') ? `<header class="ax-layout__header" ${h.slot('header')}></header>` : ''}
  ${h.hasSlot('start') ? `<aside class="ax-layout__panel ax-layout__panel--start" ${h.slot('start')}></aside>` : ''}
  <main class="ax-layout__content" ${h.slot()}></main>
  ${h.hasSlot('end') ? `<aside class="ax-layout__panel ax-layout__panel--end" ${h.slot('end')}></aside>` : ''}
  ${h.hasSlot('footer') ? `<footer class="ax-layout__footer" ${h.slot('footer')}></footer>` : ''}
</div>`;
  },
};
