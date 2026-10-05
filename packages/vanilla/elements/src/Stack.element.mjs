// Copyright (c) Meta Platforms, Inc. and affiliates.

const gaps = ['0', '0.5', '1', '1.5', '2', '3', '4', '5', '6', '8', '10'];
const alignments = [
  'start',
  'center',
  'end',
  'between',
  'around',
  'evenly',
  'stretch',
];
const wraps = ['nowrap', 'wrap', 'wrap-reverse'];

function alignment(value) {
  return (
    {
      start: 'flex-start',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    }[value] ?? value
  );
}

export default {
  name: 'Stack',
  tag: 'ax-stack',
  attributes: {
    direction: {
      type: 'enum',
      values: ['horizontal', 'vertical'],
      default: 'vertical',
      description: 'Flex direction matching Stack direction.',
    },
    gap: {
      type: 'enum',
      values: gaps,
      default: '0',
      description: 'Tokenized spacing step between children.',
    },
    wrap: {
      type: 'enum',
      values: wraps,
      default: 'nowrap',
      description: 'Flex wrapping behavior.',
    },
    'is-scrollable': {
      type: 'boolean',
      default: false,
      description: 'Enables automatic overflow scrolling.',
    },
    width: {type: 'string', description: 'CSS width of the stack.'},
    height: {type: 'string', description: 'CSS height of the stack.'},
    'max-width': {
      type: 'string',
      description: 'CSS maximum width of the stack.',
    },
    'min-height': {
      type: 'string',
      description: 'CSS minimum height of the stack.',
    },
    'h-align': {
      type: 'enum',
      values: alignments,
      description: 'Horizontal alignment matching hAlign.',
    },
    'v-align': {
      type: 'enum',
      values: alignments,
      description: 'Vertical alignment matching vAlign.',
    },
    justify: {
      type: 'enum',
      values: alignments.slice(0, 6),
      description: 'Main-axis alignment.',
    },
    align: {
      type: 'enum',
      values: ['start', 'center', 'end', 'stretch'],
      description: 'Cross-axis alignment.',
    },
  },
  slots: {default: {description: 'Stack items.', required: true}},
  docs: 'Arrange children in a horizontal or vertical flex stack with tokenized spacing.',
  examples: [
    {
      name: 'vertical',
      html: `<ax-stack gap="3">
  <span>First item</span>
  <span>Second item</span>
</ax-stack>`,
    },
    {
      name: 'horizontal-wrap',
      html: `<ax-stack direction="horizontal" gap="2" wrap="wrap">
  <span>One</span>
  <span>Two</span>
  <span>Three</span>
</ax-stack>`,
    },
  ],
  render(_host, h) {
    const direction = h.attr('direction');
    const gap = String(h.attr('gap')).replace('.', '-');
    const wrap = h.attr('wrap');
    const classes = [
      'ax-stack',
      `ax-stack--${direction}`,
      `ax-stack--gap-${gap}`,
    ];
    if (wrap !== 'nowrap') classes.push(`ax-stack--${wrap}`);
    const styles = [];
    for (const [attribute, property] of [
      ['width', 'width'],
      ['height', 'height'],
      ['max-width', 'max-width'],
      ['min-height', 'min-height'],
    ]) {
      if (h.attr(attribute))
        styles.push(`${property}:${h.escape(h.attr(attribute))}`);
    }
    if (h.attr('is-scrollable')) styles.push('overflow:auto');
    const horizontal = direction === 'horizontal';
    const main =
      h.attr('justify') || (horizontal ? h.attr('h-align') : h.attr('v-align'));
    const cross =
      h.attr('align') || (horizontal ? h.attr('v-align') : h.attr('h-align'));
    if (main) styles.push(`justify-content:${alignment(main)}`);
    if (cross) styles.push(`align-items:${alignment(cross)}`);
    return `<div class="${classes.join(' ')}"${styles.length ? ` style="${styles.join(';')}"` : ''} ${h.slot()}></div>`;
  },
};
