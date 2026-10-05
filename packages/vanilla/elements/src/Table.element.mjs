// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Table',
  tag: 'ax-table',
  attributes: {
    label: {
      type: 'string',
      default: 'Data table',
      description: 'Accessible label for the horizontal scroll region.',
    },
    density: {
      type: 'enum',
      values: ['compact', 'balanced', 'spacious'],
      default: 'balanced',
      description: 'Body row density.',
    },
    dividers: {
      type: 'enum',
      values: ['rows', 'columns', 'grid', 'none'],
      default: 'rows',
      description: 'Cell divider treatment.',
    },
    'is-striped': {
      type: 'boolean',
      default: false,
      description: 'Adds alternating body-row surfaces.',
    },
    'has-hover': {
      type: 'boolean',
      default: false,
      description: 'Adds pointer hover highlighting to body rows.',
    },
    'vertical-align': {
      type: 'enum',
      values: ['middle', 'top', 'bottom'],
      default: 'middle',
      description: 'Vertical alignment for body cells.',
    },
    'text-overflow': {
      type: 'enum',
      values: ['wrap', 'truncate'],
      default: 'wrap',
      description: 'Body-cell overflow behavior.',
    },
  },
  slots: {
    default: {
      description: 'A native table with semantic sections, rows, and cells.',
      required: true,
    },
  },
  docs: 'Style an authored native table inside an accessible horizontal scroll region.',
  examples: [
    {
      name: 'balanced',
      html: `<ax-table label="Project table" has-hover>
  <table>
    <thead><tr><th scope="col">Project</th><th scope="col">Status</th></tr></thead>
    <tbody><tr><td>Astryx</td><td>Active</td></tr></tbody>
  </table>
</ax-table>`,
    },
    {
      name: 'compact-grid',
      html: `<ax-table label="Release table" density="compact" dividers="grid" is-striped>
  <table>
    <thead><tr><th scope="col">Version</th><th scope="col">Channel</th></tr></thead>
    <tbody><tr><td>0.6.5</td><td>Stable</td></tr></tbody>
  </table>
</ax-table>`,
    },
  ],
  hooks: {
    afterRender(_host, api) {
      const table = api.query('table');
      if (!table) return;
      table.classList.add('ax-table');
      for (const name of [
        'compact',
        'spacious',
        'columns',
        'grid',
        'none',
        'striped',
        'hover',
      ])
        table.classList.remove(`ax-table--${name}`);
      const density = api.read('density');
      const dividers = api.read('dividers');
      if (density !== 'balanced') table.classList.add(`ax-table--${density}`);
      if (dividers !== 'rows') table.classList.add(`ax-table--${dividers}`);
      if (api.read('is-striped')) table.classList.add('ax-table--striped');
      if (api.read('has-hover')) table.classList.add('ax-table--hover');
      const verticalAlign = api.read('vertical-align');
      for (const cell of table.querySelectorAll('tbody td')) {
        if (verticalAlign === 'middle') {
          cell.style.removeProperty('vertical-align');
          if (!cell.getAttribute('style')?.trim())
            cell.removeAttribute('style');
        } else cell.style.verticalAlign = verticalAlign;
        cell.classList.toggle(
          'ax-table__truncate',
          api.read('text-overflow') === 'truncate',
        );
      }
    },
  },
  render(_host, h) {
    return `<div class="ax-table__scroll" tabindex="0" role="group" aria-label="${h.escape(h.attr('label'))}" ${h.slot()}></div>`;
  },
};
