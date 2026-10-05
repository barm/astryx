// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input A web-component definition and author-provided light-DOM children.
 * @output A registered custom element that renders native Astryx BEM markup.
 * @position Shared runtime for build-less Astryx custom elements.
 */
/* global CustomEvent, Element, HTMLElement, MutationObserver, Node, customElements, document, queueMicrotask */

const GLOBAL_ATTRIBUTES = new Set([
  'accesskey',
  'autocapitalize',
  'autofocus',
  'class',
  'contenteditable',
  'dir',
  'draggable',
  'enterkeyhint',
  'hidden',
  'id',
  'inert',
  'inputmode',
  'is',
  'itemid',
  'itemprop',
  'itemref',
  'itemscope',
  'itemtype',
  'lang',
  'nonce',
  'part',
  'popover',
  'slot',
  'spellcheck',
  'style',
  'tabindex',
  'title',
  'translate',
]);

let elementID = 0;

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isMeaningfulNode(node) {
  return node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim());
}

function isKnownAttribute(definition, name) {
  return (
    Object.hasOwn(definition.attributes, name) ||
    GLOBAL_ATTRIBUTES.has(name) ||
    name.startsWith('aria-') ||
    name.startsWith('data-')
  );
}

function createHelpers(host, definition, authorNodes, slotsByNode) {
  const nodesForSlot = name =>
    authorNodes.filter(
      node => isMeaningfulNode(node) && slotsByNode.get(node) === name,
    );

  return Object.freeze({
    attr(name) {
      const spec = definition.attributes[name];
      if (!spec) return null;
      const raw = host.getAttribute(name);
      if (spec.type === 'boolean') return raw !== null;
      if (raw === null || raw === '') return spec.default ?? '';
      if (spec.type === 'enum' && !spec.values.includes(raw)) {
        host._warnInvalidEnum(name, raw, spec.values);
        return spec.default;
      }
      return raw;
    },
    escape: escapeHTML,
    hasSlot(name = 'default') {
      return nodesForSlot(name).length > 0;
    },
    id(part) {
      if (!host._astryxID) {
        elementID += 1;
        host._astryxID = host.id || `${definition.tag}-${elementID}`;
      }
      return `${host._astryxID}-${part}`;
    },
    slot(name = 'default') {
      return `data-ax-slot="${escapeHTML(name)}"`;
    },
  });
}

function installDialogMethods(ElementClass) {
  ElementClass.prototype.show = function show() {
    const dialog = this._nativeDialog;
    if (!dialog || dialog.open) return;
    this._dialogReturnTarget = this.ownerDocument.activeElement;
    const vanilla = globalThis.AstryxVanilla;
    if (vanilla?.openDialog)
      vanilla.openDialog(dialog, this._dialogReturnTarget);
    else dialog.showModal();
    this._reflectAttribute('open', true);
    queueMicrotask(() => {
      const focusTarget = dialog.querySelector(
        '[data-ax-dialog-initial-focus], [autofocus], .ax-dialog__title',
      );
      if (focusTarget instanceof HTMLElement) {
        if (!focusTarget.matches('button, input, select, textarea, a[href]')) {
          focusTarget.tabIndex = -1;
        }
        focusTarget.focus({preventScroll: true});
      }
    });
  };

  ElementClass.prototype.close = function close(returnValue = '') {
    const dialog = this._nativeDialog;
    if (!dialog?.open) return;
    const vanilla = globalThis.AstryxVanilla;
    if (vanilla?.closeDialog) vanilla.closeDialog(dialog, false);
    else dialog.close(returnValue);
    this._reflectAttribute('open', false);
    const returnTarget = this._dialogReturnTarget;
    this._dialogReturnTarget = null;
    if (returnTarget instanceof HTMLElement && returnTarget.isConnected) {
      returnTarget.focus({preventScroll: true});
    }
  };
}

export function registerElement(definition) {
  if (customElements.get(definition.tag))
    return customElements.get(definition.tag);

  class AstryxElement extends HTMLElement {
    static observedAttributes = Object.keys(definition.attributes);

    constructor() {
      super();
      this._authorNodes = [];
      this._captured = false;
      this._renderQueued = false;
      this._reflecting = false;
      this._warnedAttributes = new Set();
      this._slotsByNode = new WeakMap();
      this._observer = new MutationObserver(records =>
        this._handleMutations(records),
      );
      this._handleEvent = this._handleEvent.bind(this);
    }

    connectedCallback() {
      this._captureAuthorNodes();
      for (const attribute of this.attributes)
        this._validateAttribute(attribute.name);
      this.addEventListener('input', this._handleEvent);
      this.addEventListener('change', this._handleEvent);
      this.addEventListener('close', this._handleEvent, true);
      this.addEventListener('astryx:dialog-open', this._handleEvent);
      this.addEventListener('astryx:dialog-close', this._handleEvent);
      this.addEventListener('astryx:tab-change', this._handleEvent);
      this._observe();
      this._scheduleRender();
    }

    disconnectedCallback() {
      this._observer.disconnect();
      this.removeEventListener('input', this._handleEvent);
      this.removeEventListener('change', this._handleEvent);
      this.removeEventListener('close', this._handleEvent, true);
      this.removeEventListener('astryx:dialog-open', this._handleEvent);
      this.removeEventListener('astryx:dialog-close', this._handleEvent);
      this.removeEventListener('astryx:tab-change', this._handleEvent);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      this._validateAttribute(name);
      if (!this._reflecting) this._scheduleRender();
    }

    _captureAuthorNodes() {
      if (this._captured) return;
      this._captured = true;
      this._authorNodes = [...this.childNodes];
      for (const node of this._authorNodes) {
        const slot =
          node instanceof Element
            ? node.getAttribute('slot') || 'default'
            : 'default';
        this._slotsByNode.set(node, slot);
      }
    }

    _handleMutations(records) {
      let shouldRender = false;
      for (const record of records) {
        if (record.type === 'attributes') {
          this._validateAttribute(record.attributeName);
          continue;
        }
        for (const node of record.addedNodes) {
          if (this._authorNodes.includes(node)) continue;
          this._authorNodes.push(node);
          const slot =
            node instanceof Element
              ? node.getAttribute('slot') || 'default'
              : 'default';
          this._slotsByNode.set(node, slot);
          shouldRender = true;
        }
      }
      if (shouldRender) this._scheduleRender();
    }

    _observe() {
      this._observer.observe(this, {
        attributes: true,
        childList: true,
      });
    }

    _scheduleRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      queueMicrotask(() => {
        this._renderQueued = false;
        if (this.isConnected) this._render();
      });
    }

    _render() {
      this._observer.disconnect();
      for (const node of this._authorNodes) node.remove();
      const helpers = createHelpers(
        this,
        definition,
        this._authorNodes,
        this._slotsByNode,
      );
      const template = document.createElement('template');
      template.innerHTML = definition.render(this, helpers).trim();
      this.replaceChildren(template.content);

      const regions = new Map();
      for (const region of this.querySelectorAll('[data-ax-slot]')) {
        regions.set(region.getAttribute('data-ax-slot'), region);
      }
      for (const node of this._authorNodes) {
        const slot = this._slotsByNode.get(node) || 'default';
        const region = regions.get(slot) ?? regions.get('default');
        if (region) region.append(node);
      }
      for (const region of regions.values())
        region.removeAttribute('data-ax-slot');

      this._valueControl = this.querySelector('[data-ax-reflect-value]');
      this._checkedControl = this.querySelector('[data-ax-reflect-checked]');
      this._nativeDialog = this.querySelector('dialog[data-ax-dialog]');
      this._nativeTab = this.querySelector('[role="tab"]');
      this._valueControl?.removeAttribute('data-ax-reflect-value');
      this._checkedControl?.removeAttribute('data-ax-reflect-checked');

      if (this._valueControl && this.hasAttribute('value')) {
        this._valueControl.value = this.getAttribute('value');
      }
      if (definition.tag === 'ax-tab-list' && this.hasAttribute('value')) {
        const selectedValue = this.getAttribute('value');
        for (const tab of this.querySelectorAll('ax-tab')) {
          tab.toggleAttribute(
            'selected',
            tab.getAttribute('value') === selectedValue,
          );
        }
      }
      if (this._checkedControl) {
        this._checkedControl.checked = this.hasAttribute('checked');
      }
      if (definition.tag === 'ax-dialog' && this.hasAttribute('open')) {
        queueMicrotask(() => this.show());
      }
      this._observe();
    }

    _handleEvent(event) {
      if (
        (event.type === 'input' || event.type === 'change') &&
        event.target === this._valueControl
      ) {
        if (
          definition.tag === 'ax-selector' &&
          this.hasAttribute('is-read-only')
        ) {
          event.preventDefault();
          event.target.value = this.getAttribute('value') || '';
          return;
        }
        this._reflectAttribute('value', event.target.value);
      }
      if (event.type === 'change' && event.target === this._checkedControl) {
        this._reflectAttribute('checked', event.target.checked);
      }
      if (definition.tag === 'ax-dialog') {
        if (event.type === 'astryx:dialog-open')
          this._reflectAttribute('open', true);
        if (event.type === 'astryx:dialog-close' || event.type === 'close') {
          this._reflectAttribute('open', false);
          const returnTarget = this._dialogReturnTarget;
          this._dialogReturnTarget = null;
          if (returnTarget instanceof HTMLElement && returnTarget.isConnected) {
            returnTarget.focus({preventScroll: true});
          }
        }
      }
      if (
        definition.tag === 'ax-tab-list' &&
        event.type === 'astryx:tab-change'
      ) {
        const selectedTab =
          event.target instanceof Element
            ? event.target.closest('ax-tab')
            : null;
        const value = selectedTab?.getAttribute('value') || event.detail?.value;
        if (value) this._reflectAttribute('value', value);
        for (const tab of this.querySelectorAll('ax-tab'))
          tab._syncNativeState?.();
      }
    }

    _syncNativeState() {
      if (definition.tag !== 'ax-tab' || !this._nativeTab) return;
      this._reflectAttribute(
        'selected',
        this._nativeTab.getAttribute('aria-selected') === 'true',
      );
    }

    _reflectAttribute(name, value) {
      this._reflecting = true;
      if (typeof value === 'boolean') this.toggleAttribute(name, value);
      else if (this.getAttribute(name) !== String(value)) {
        this.setAttribute(name, String(value));
      }
      this._reflecting = false;
    }

    _validateAttribute(name) {
      if (isKnownAttribute(definition, name)) {
        const spec = definition.attributes[name];
        const value = this.getAttribute(name);
        if (
          spec?.type === 'enum' &&
          value !== null &&
          value !== '' &&
          !spec.values.includes(value)
        ) {
          this._warnInvalidEnum(name, value, spec.values);
        }
        return;
      }
      const key = `unknown:${name}`;
      if (this._warnedAttributes.has(key)) return;
      this._warnedAttributes.add(key);
      console.warn(
        `[Astryx] <${definition.tag}> received unknown attribute "${name}".`,
      );
    }

    _warnInvalidEnum(name, value, values) {
      const key = `enum:${name}`;
      if (this._warnedAttributes.has(key)) return;
      this._warnedAttributes.add(key);
      console.warn(
        `[Astryx] <${definition.tag}> received invalid ${name}="${value}"; expected ${values.join(', ')}.`,
      );
    }
  }

  if (definition.tag === 'ax-dialog') installDialogMethods(AstryxElement);
  customElements.define(definition.tag, AstryxElement);
  return AstryxElement;
}

export function registerElements(definitions) {
  return definitions.map(registerElement);
}
