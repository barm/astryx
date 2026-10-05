// Copyright (c) Meta Platforms, Inc. and affiliates.

const radii = ['none', '0', '1', '2', '3', '4', 'rounded'];

export default {
  name: 'Skeleton',
  tag: 'ax-skeleton',
  attributes: {
    width: {
      type: 'string',
      default: '100%',
      description: 'CSS width or pixel value.',
    },
    height: {
      type: 'string',
      default: '100%',
      description: 'CSS height or pixel value.',
    },
    radius: {
      type: 'enum',
      values: radii,
      default: '3',
      description: 'Tokenized corner radius.',
    },
    index: {
      type: 'string',
      default: '0',
      description: 'Animation stagger index.',
    },
  },
  slots: {},
  docs: 'Preview the shape of loading content with a decorative, reduced-motion-aware placeholder.',
  examples: [
    {
      name: 'text',
      html: '<ax-skeleton width="100%" height="12px"></ax-skeleton>',
    },
    {
      name: 'avatar',
      html: '<ax-skeleton width="40px" height="40px" radius="rounded"></ax-skeleton>',
    },
  ],
  render(_host, h) {
    const width = h.attr('width');
    const height = h.attr('height');
    const radius = h.attr('radius');
    const classes = ['ax-skeleton'];
    const styles = [];

    const isAvatar =
      width === '40px' && height === '40px' && radius === 'rounded';
    const isText = height === '12px';
    const isCard = width === '100%' && height === '128px';
    if (isAvatar) classes.push('ax-skeleton--avatar');
    else if (isText) {
      classes.push('ax-skeleton--text');
      if (width === '62%') classes.push('ax-skeleton--short');
      else if (width !== '100%') styles.push(`width:${h.escape(width)}`);
    } else if (isCard) classes.push('ax-skeleton--card');
    else styles.push(`width:${h.escape(width)}`, `height:${h.escape(height)}`);

    if (!isAvatar) {
      if (radius === 'none' || radius === '0') styles.push('border-radius:0');
      else if (radius === 'rounded')
        styles.push('border-radius:var(--radius-full)');
      else if (radius !== '3')
        styles.push(`border-radius:var(--radius-${h.escape(radius)})`);
    }
    const index = Number(h.attr('index'));
    if (Number.isFinite(index) && index > 0)
      styles.push(`animation-delay:calc(var(--duration-fast) * ${index})`);
    return `<span class="${classes.join(' ')}" aria-hidden="true"${styles.length ? ` style="${styles.join(';')}"` : ''}></span>`;
  },
};
