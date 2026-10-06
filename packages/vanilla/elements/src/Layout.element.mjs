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
    'is-main-region': {
      type: 'boolean',
      default: false,
      description:
        "Makes content the page's main landmark. Omit for bounded or nested layouts.",
    },
  },
  slots: {
    header: 'Optional header region.',
    start: 'Optional logical-start panel region.',
    default: 'Primary content region.',
    end: 'Optional logical-end panel region.',
    footer: 'Optional footer region.',
  },
  docs: "Arrange header, panels, content, and footer without implying a page landmark. Set is-main-region only for the page's single main region.",
  examples: [
    {
      name: 'page-main',
      gallery: false,
      html: `<ax-layout is-main-region>
  <h1 slot="header">Page title</h1>
  <p>Page content</p>
  <small slot="footer">Footer</small>
</ax-layout>`,
    },
    {
      name: 'bounded-regions',
      html: `<ax-layout>
  <nav slot="start" aria-label="Workspace navigation">Navigation</nav>
  <a href="#details">Main content</a>
  <aside slot="end">Inspector</aside>
</ax-layout>`,
    },
  ],
  render(host, h) {
    const wantsMainRegion = h.attr('is-main-region');
    const hasAuthoredMain = [...h.authorNodes].some(
      node =>
        node.nodeType === 1 &&
        (node.localName === 'main' || Boolean(node.querySelector('main'))),
    );
    const ancestorMain = wantsMainRegion
      ? host.parentElement?.closest('main, [role="main"]')
      : null;
    const hasOtherDocumentMain =
      wantsMainRegion &&
      !ancestorMain &&
      [
        ...(host.ownerDocument?.querySelectorAll('main, [role="main"]') ?? []),
      ].some(main => !host.contains(main) && !main.contains(host));
    const contentTag =
      wantsMainRegion && !hasAuthoredMain && !ancestorMain ? 'main' : 'div';
    if (wantsMainRegion && hasAuthoredMain) {
      h.warn(
        'main-region:authored-main',
        '[Astryx] <ax-layout is-main-region> received an authored <main>; the content wrapper remains a div to avoid nested main landmarks.',
      );
    }
    if (wantsMainRegion && ancestorMain) {
      h.warn(
        'main-region:ancestor-main',
        '[Astryx] <ax-layout is-main-region> is nested inside an existing main landmark; the content wrapper remains a div to avoid nested main landmarks.',
      );
    }
    if (hasOtherDocumentMain) {
      h.warn(
        'main-region:duplicate-main',
        '[Astryx] <ax-layout is-main-region> found another main landmark in the document; use is-main-region only once per page.',
      );
    }
    const hasPanels = h.hasSlot('start') || h.hasSlot('end');
    const classes = ['ax-layout'];
    if (hasPanels) classes.push('ax-layout--regions');
    if (hasPanels && h.hasSlot('start') && h.hasSlot('end')) {
      classes.push('ax-layout--three-column');
    }

    if (!hasPanels) {
      return `<div class="${classes.join(' ')}">
  ${h.hasSlot('header') ? `<header class="ax-layout__header" ${h.slot('header')}></header>` : ''}
  <${contentTag} class="ax-layout__content" ${h.slot()}></${contentTag}>
  ${h.hasSlot('footer') ? `<footer class="ax-layout__footer" ${h.slot('footer')}></footer>` : ''}
</div>`;
    }

    return `<div class="${classes.join(' ')}">
  ${h.hasSlot('header') ? `<header class="ax-layout__header" ${h.slot('header')}></header>` : ''}
  ${h.hasSlot('start') ? `<aside class="ax-layout__panel ax-layout__panel--start" ${h.slot('start')}></aside>` : ''}
  <${contentTag} class="ax-layout__content" ${h.slot()}></${contentTag}>
  ${h.hasSlot('end') ? `<aside class="ax-layout__panel ax-layout__panel--end" ${h.slot('end')}></aside>` : ''}
  ${h.hasSlot('footer') ? `<footer class="ax-layout__footer" ${h.slot('footer')}></footer>` : ''}
</div>`;
  },
};
