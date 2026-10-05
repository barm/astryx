// Copyright (c) Meta Platforms, Inc. and affiliates.

const sizes = ['xsm', 'sm', 'md', 'lg', 'xl'];
const shapes = ['circle', 'rounded', 'square'];

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '●';
  const first = [...parts[0]][0] ?? '';
  const last = parts.length > 1 ? ([...parts.at(-1)][0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '●';
}

export default {
  name: 'Avatar',
  tag: 'ax-avatar',
  attributes: {
    src: {type: 'string', description: 'Primary profile image URL.'},
    'fallback-src': {
      type: 'string',
      description: 'Image URL used if the primary source fails.',
    },
    name: {
      type: 'string',
      description: 'Person or team name used for initials and accessible text.',
    },
    alt: {
      type: 'string',
      description: 'Accessible name override; defaults to name.',
    },
    size: {
      type: 'string',
      default: 'md',
      description: 'Named avatar size or CSS length.',
    },
    shape: {
      type: 'enum',
      values: shapes,
      default: 'circle',
      description: 'Circle, rounded, or square silhouette.',
    },
    href: {type: 'string', description: 'Optional profile destination.'},
    target: {type: 'string', description: 'Native link browsing context.'},
    rel: {type: 'string', description: 'Native link relationship tokens.'},
    tooltip: {
      type: 'string',
      description: 'Native tooltip text; omit to avoid duplicate tooltips.',
    },
  },
  slots: {
    default: 'Custom fallback initials or mark when no image is available.',
    status: 'Optional status indicator in the avatar corner.',
  },
  control: 'a',
  events: {click: 'Native activation event when href is present.'},
  docs: 'Represent a person or team with an image, initials, or fallback mark and optional status.',
  examples: [
    {
      name: 'initials-status',
      html: `<ax-avatar src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" name="Ada Lovelace" alt="Ada Lovelace, Online">
  <ax-status-dot slot="status" variant="success" label="Online"></ax-status-dot>
</ax-avatar>`,
    },
    {
      name: 'linked-image',
      html: `<ax-avatar href="#profile" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" name="Grace Hopper" size="lg" shape="rounded"></ax-avatar>`,
    },
  ],
  hooks: {
    attributeChanged(host, name) {
      if (name === 'src' || name === 'fallback-src')
        host.removeAttribute('data-ax-image-failed');
      return false;
    },
    afterRender(host, api) {
      const image = api.query('.ax-avatar__image');
      if (!image) return;
      api.listen(image, 'error', () => {
        const fallback = api.read('fallback-src');
        if (fallback && image.getAttribute('src') !== fallback)
          image.setAttribute('src', fallback);
        else {
          host.setAttribute('data-ax-image-failed', '');
          api.render();
        }
      });
    },
  },
  render(host, h) {
    const size = h.attr('size');
    const shape = h.attr('shape');
    const name = h.attr('name');
    const alt = h.attr('alt') || name || 'Avatar';
    const href = h.attr('href');
    const classes = ['ax-avatar'];
    if (sizes.includes(size)) classes.push(`ax-avatar--${size}`);
    if (shape !== 'circle') classes.push(`ax-avatar--${shape}`);
    else classes.push('ax-avatar--circle');
    const attributes = [`class="${classes.join(' ')}"`];
    if (!href) attributes.push('role="img"');
    attributes.push(`aria-label="${h.escape(alt)}"`);
    if (href) attributes.push(`href="${h.escape(href)}"`);
    if (h.attr('target'))
      attributes.push(`target="${h.escape(h.attr('target'))}"`);
    if (h.attr('rel')) attributes.push(`rel="${h.escape(h.attr('rel'))}"`);
    if (h.attr('tooltip'))
      attributes.push(`title="${h.escape(h.attr('tooltip'))}"`);
    if (!sizes.includes(size))
      attributes.push(`style="--ax-avatar-size:${h.escape(size)}"`);
    const source = h.attr('src');
    const hasFallback = h.hasSlot();
    const image =
      source && !host.hasAttribute?.('data-ax-image-failed')
        ? `<img class="ax-avatar__image" src="${h.escape(source)}" alt="" />`
        : hasFallback
          ? ''
          : h.escape(initials(name));
    return `<${href ? 'a' : 'span'} ${attributes.join(' ')}>
  <span class="ax-avatar__content" aria-hidden="true"${hasFallback ? ` ${h.slot()}` : ''}>${image}</span>
  ${h.hasSlot('status') ? `<span class="ax-avatar__status" aria-hidden="true" ${h.slot('status')}></span>` : ''}
</${href ? 'a' : 'span'}>`;
  },
};
