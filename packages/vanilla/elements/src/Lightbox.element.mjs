// Copyright (c) Meta Platforms, Inc. and affiliates.
/* global globalThis, queueMicrotask */

const openerByHost = new WeakMap();

function mediaItems(api) {
  return api.queryAll('[data-ax-lightbox-item], .ax-lightbox__item');
}

function syncIndex(host, api, requested, emit = false) {
  const items = mediaItems(api);
  const index = Math.max(
    0,
    Math.min(Number(requested) || 0, Math.max(0, items.length - 1)),
  );
  items.forEach((item, itemIndex) => {
    item.hidden = itemIndex !== index;
  });
  const previous = api.query('[data-ax-lightbox-previous]');
  const next = api.query('[data-ax-lightbox-next]');
  if (previous) previous.disabled = index <= 0;
  if (next) next.disabled = index >= items.length - 1;
  const counter = api.query('[data-ax-lightbox-counter]');
  if (counter)
    counter.textContent =
      items.length > 1 ? `${index + 1} / ${items.length}` : '';
  api.reflect('index', String(index));
  if (emit) api.dispatch('astryx:index-change', {index});
  return index;
}

function setOpen(host, api, open, {opener = null, emit = false} = {}) {
  const dialog = api.control;
  if (!dialog) return;
  if (opener) openerByHost.set(host, opener);
  if (open && !dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  if (!open && dialog.open) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  api.reflect('is-open', open);
  if (open)
    queueMicrotask(() => api.query('[data-ax-lightbox-close]')?.focus());
  else if (openerByHost.get(host)?.isConnected) openerByHost.get(host).focus();
  if (emit) api.dispatch('astryx:open-change', {isOpen: open});
}

export default {
  name: 'Lightbox',
  tag: 'ax-lightbox',
  attributes: {
    src: {
      type: 'string',
      description: 'Image source.',
    },
    alt: {type: 'string', description: 'Image alternative.'},
    caption: {type: 'string', description: 'Visible image.'},
    'thumbnail-src': {
      type: 'string',
      description: 'Trigger thumbnail.',
    },
    'trigger-label': {
      type: 'string',
      default: 'Open image viewer',
      description: 'Accessible trigger.',
    },
    label: {
      type: 'string',
      default: 'Image viewer',
      description: 'Accessible dialog.',
    },
    'lightbox-id': {
      type: 'string',
      description: 'Native dialog.',
    },
    'is-open': {
      type: 'boolean',
      aliases: ['open'],
      aliasProperties: ['open'],
      default: false,
      description: 'Controlled viewer.',
    },
    index: {
      type: 'string',
      default: '0',
      description: 'Current zero-based.',
    },
    'has-zoom': {
      type: 'boolean',
      default: false,
      description: 'Reserved image.',
    },
  },
  slots: {
    thumbnail: 'Trigger thumbnail content.',
    default: {description: 'Media figures.', required: true},
    caption: 'Caption for generated single-image media.',
  },
  content: [
    {attribute: 'src', slot: 'default', required: true},
    {attribute: 'caption', slot: 'caption'},
  ],
  control: 'dialog[data-ax-lightbox]',
  preserveAttributes: ['open'],
  methods: {
    show: {
      description: 'Open modal.',
      call(api, index = Number(api.read('index'))) {
        syncIndex(this, api, index);
        setOpen(this, api, true, {emit: true});
      },
    },
    close: {
      description: 'Close modal.',
      call(api) {
        setOpen(this, api, false, {emit: true});
      },
    },
    next: {
      description: 'Move next.',
      call(api) {
        syncIndex(this, api, Number(api.read('index')) + 1, true);
      },
    },
    previous: {
      description: 'Move previous.',
      call(api) {
        syncIndex(this, api, Number(api.read('index')) - 1, true);
      },
    },
  },
  events: {
    'astryx:open-change': 'Custom event.',
    'astryx:index-change': 'Custom event.',
  },
  hooks: {
    attributeChanged(host, name, _oldValue, _newValue, api) {
      if (!api.control) return false;
      if (name === 'is-open') {
        setOpen(host, api, api.read('is-open'));
        return true;
      }
      if (name === 'index') {
        syncIndex(host, api, api.read('index'));
        return true;
      }
      return false;
    },
    afterRender(host, api) {
      syncIndex(host, api, api.read('index'));
      if (api.read('is-open')) setOpen(host, api, true);
      const vanilla = globalThis.astryx || globalThis.AstryxVanilla;
      if (vanilla) {
        api.listen(api.control, 'astryx:lightbox-open', event => {
          api.reflect('is-open', true);
          api.reflect('index', String(event.detail?.index ?? 0));
        });
        api.listen(api.control, 'astryx:lightbox-change', event =>
          api.reflect('index', String(event.detail?.index ?? 0)),
        );
        api.listen(api.control, 'astryx:lightbox-close', () =>
          api.reflect('is-open', false),
        );
        return;
      }
      api.listen(host, 'click', event => {
        const open = event.target.closest?.('[data-ax-lightbox-open]');
        if (open) {
          event.preventDefault();
          syncIndex(
            host,
            api,
            Number(open.dataset.axLightboxIndex || api.read('index')),
          );
          setOpen(host, api, true, {opener: open, emit: true});
          return;
        }
        if (event.target.closest?.('[data-ax-lightbox-close]')) {
          event.preventDefault();
          setOpen(host, api, false, {emit: true});
          return;
        }
        if (event.target.closest?.('[data-ax-lightbox-previous]')) {
          event.preventDefault();
          syncIndex(host, api, Number(api.read('index')) - 1, true);
          return;
        }
        if (event.target.closest?.('[data-ax-lightbox-next]')) {
          event.preventDefault();
          syncIndex(host, api, Number(api.read('index')) + 1, true);
          return;
        }
        if (event.target.matches?.('[data-ax-lightbox-backdrop]'))
          setOpen(host, api, false, {emit: true});
      });
      api.listen(api.control, 'cancel', event => {
        event.preventDefault();
        setOpen(host, api, false, {emit: true});
      });
      api.listen(api.control, 'keydown', event => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          syncIndex(host, api, Number(api.read('index')) - 1, true);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          syncIndex(host, api, Number(api.read('index')) + 1, true);
        }
      });
      api.listen(api.control, 'close', () => {
        if (api.read('is-open')) {
          api.reflect('is-open', false);
          api.dispatch('astryx:open-change', {isOpen: false});
        }
      });
    },
  },
  docs: 'Lightbox custom element using native Astryx markup.',
  examples: [
    {
      name: 'single',
      html: `<ax-lightbox src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Launch"></ax-lightbox>`,
    },
    {
      name: 'gallery',
      html: `<ax-lightbox><figure class="ax-lightbox__item" data-ax-lightbox-item><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="One" /></figure></ax-lightbox>`,
    },
  ],
  render(_host, h) {
    const id = h.attr('lightbox-id') || h.id('dialog');
    const src = h.attr('src');
    const thumbnail = h.attr('thumbnail-src') || src;
    const caption = h.content('caption', 'caption');
    const open = h.attr('is-open');
    const indexAttribute = h.hasAttribute('index')
      ? ` data-ax-lightbox-index="${h.escape(h.attr('index'))}"`
      : '';
    const trigger = `<button class="ax-lightbox__trigger" type="button" data-ax-lightbox-open="${h.escape(id)}"${indexAttribute} aria-label="${h.escape(h.attr('trigger-label'))}"${h.hasSlot('thumbnail') ? ` ${h.slot('thumbnail')}` : ''}>${h.hasSlot('thumbnail') ? '' : `<img class="ax-lightbox__thumbnail" src="${h.escape(thumbnail)}" alt="${h.escape(h.attr('alt'))}" />`}</button>`;
    const media = h.hasSlot()
      ? `<span class="ax-lightbox__counter" data-ax-lightbox-counter aria-live="polite"></span><button class="ax-lightbox__control ax-lightbox__previous" type="button" data-ax-lightbox-previous aria-label="Previous image">‹</button><span ${h.slot()}></span><span hidden ${h.slot('caption')}></span><button class="ax-lightbox__control ax-lightbox__next" type="button" data-ax-lightbox-next aria-label="Next image">›</button>`
      : `<figure class="ax-lightbox__item" data-ax-lightbox-item><img class="ax-lightbox__media" src="${h.escape(src)}" alt="${h.escape(h.attr('alt'))}" />${caption.slotted || caption.html ? `<figcaption class="ax-lightbox__caption"${caption.slotted ? ` ${h.slot('caption')}` : ''}>${caption.html}</figcaption>` : ''}</figure>`;
    return `${trigger}
<dialog class="ax-lightbox" id="${h.escape(id)}" data-ax-lightbox data-ax-owned="ax-lightbox" aria-label="${h.escape(h.attr('label'))}"${open ? ' open' : ''}>
  <div class="ax-lightbox__container" data-ax-lightbox-backdrop>
    <button class="ax-lightbox__control ax-lightbox__close" type="button" data-ax-lightbox-close aria-label="Close viewer">×</button>
    ${media}
  </div>
</dialog>`;
  },
};
