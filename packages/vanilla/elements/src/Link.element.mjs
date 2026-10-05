// Copyright (c) Meta Platforms, Inc. and affiliates.

export default {
  name: 'Link',
  tag: 'ax-link',
  attributes: {
    href: {type: 'string', description: 'Destination URL for navigation.'},
    label: {
      type: 'string',
      description: 'Accessible label for icon-only content.',
    },
    'has-underline': {
      type: 'boolean',
      default: false,
      description: 'Always shows an underline.',
    },
    'is-disabled': {
      type: 'boolean',
      aliases: ['disabled'],
      aliasProperties: ['disabled'],
      default: false,
      description: 'Disables navigation and activation.',
    },
    'is-external-link': {
      type: 'boolean',
      default: false,
      description: 'Opens in a new tab with safe rel tokens.',
    },
    target: {type: 'string', description: 'Native link browsing context.'},
    rel: {type: 'string', description: 'Native link relationship tokens.'},
    download: {
      type: 'string',
      description:
        'Native download filename; an empty value requests download.',
    },
    'referrer-policy': {type: 'string', description: 'Native referrer policy.'},
  },
  slots: {
    default: {description: 'Visible descriptive link content.', required: true},
  },
  control: 'a',
  events: {click: 'Native click event from the inner anchor.'},
  docs: 'Navigate with a themed native anchor while preserving disabled and external-link semantics.',
  examples: [
    {
      name: 'default',
      html: '<ax-link href="#destination">Learn more</ax-link>',
    },
    {name: 'disabled', html: '<ax-link is-disabled>Unavailable</ax-link>'},
  ],
  hooks: {
    afterRender(_host, api) {
      if (api.read('is-disabled'))
        api.listen(api.control, 'click', event => event.preventDefault());
    },
  },
  render(_host, h) {
    const disabled = h.attr('is-disabled');
    const external = h.attr('is-external-link');
    const attributes = ['class="ax-link"'];
    if (h.attr('href') && !disabled)
      attributes.push(`href="${h.escape(h.attr('href'))}"`);
    if (h.attr('label'))
      attributes.push(`aria-label="${h.escape(h.attr('label'))}"`);
    if (disabled) attributes.push('aria-disabled="true"', 'tabindex="-1"');
    const target = external ? '_blank' : h.attr('target');
    if (target) attributes.push(`target="${h.escape(target)}"`);
    const rel = new Set(
      String(h.attr('rel') || '')
        .split(/\s+/)
        .filter(Boolean),
    );
    if (external || target === '_blank')
      (rel.add('noopener'), rel.add('noreferrer'));
    if (rel.size) attributes.push(`rel="${h.escape([...rel].join(' '))}"`);
    if (h.hasAttribute('download'))
      attributes.push(`download="${h.escape(h.attr('download'))}"`);
    if (h.attr('referrer-policy'))
      attributes.push(
        `referrerpolicy="${h.escape(h.attr('referrer-policy'))}"`,
      );
    if (h.attr('has-underline'))
      attributes.push('style="text-decoration:underline"');
    return `<a ${attributes.join(' ')} ${h.slot()}></a>`;
  },
};
