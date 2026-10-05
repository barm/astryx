// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * @input A web-component definition and author-provided light-DOM children.
 * @output A registered custom element that morphs native Astryx BEM markup in place.
 * @position Shared, component-agnostic runtime for build-less Astryx elements.
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
  'role',
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

function kebabToCamel(value) {
  return value.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function isMeaningfulNode(node) {
  return node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim());
}

function walkNodes(root, visit) {
  for (const child of root.childNodes) {
    visit(child);
    walkNodes(child, visit);
  }
}

function sameNodeKind(current, desired) {
  return (
    current.nodeType === desired.nodeType &&
    (!(current instanceof Element) ||
      (desired instanceof Element && current.localName === desired.localName))
  );
}

function attributeMetadata(definition) {
  const aliases = new Map();
  for (const [name, spec] of Object.entries(definition.attributes)) {
    for (const alias of spec.aliases ?? []) aliases.set(alias, name);
  }
  return {
    aliases,
    observed: [
      ...new Set([...Object.keys(definition.attributes), ...aliases.keys()]),
    ],
  };
}

function markGeneratedSubtree(node, desiredGenerated, nextGenerated) {
  if (desiredGenerated.has(node)) nextGenerated.add(node);
  for (const child of node.childNodes) {
    markGeneratedSubtree(child, desiredGenerated, nextGenerated);
  }
}

function syncAttributes(current, desired, preserveAttributes) {
  const desiredNames = new Set(
    [...desired.attributes].map(attribute => attribute.name),
  );
  for (const attribute of [...current.attributes]) {
    if (
      !desiredNames.has(attribute.name) &&
      !preserveAttributes.has(attribute.name)
    ) {
      current.removeAttribute(attribute.name);
    }
  }
  for (const attribute of desired.attributes) {
    if (current.getAttribute(attribute.name) !== attribute.value) {
      current.setAttribute(attribute.name, attribute.value);
    }
  }
}

function morphChildren(
  currentParent,
  desiredParent,
  authorNodes,
  desiredGenerated,
  nextGenerated,
  preserveAttributes,
) {
  const desiredChildren = [...desiredParent.childNodes];
  let index = 0;

  for (const desired of desiredChildren) {
    const current = currentParent.childNodes[index] ?? null;
    if (authorNodes.has(desired)) {
      if (current !== desired) currentParent.insertBefore(desired, current);
      index += 1;
      continue;
    }

    if (
      current &&
      !authorNodes.has(current) &&
      sameNodeKind(current, desired)
    ) {
      if (current instanceof Element && desired instanceof Element) {
        syncAttributes(current, desired, preserveAttributes);
        morphChildren(
          current,
          desired,
          authorNodes,
          desiredGenerated,
          nextGenerated,
          preserveAttributes,
        );
      } else if (current.nodeValue !== desired.nodeValue) {
        current.nodeValue = desired.nodeValue;
      }
      if (desiredGenerated.has(desired)) nextGenerated.add(current);
      index += 1;
      continue;
    }

    currentParent.insertBefore(desired, current);
    markGeneratedSubtree(desired, desiredGenerated, nextGenerated);
    index += 1;
  }

  while (currentParent.childNodes.length > desiredChildren.length) {
    currentParent.lastChild.remove();
  }
}

function installElementAPI(ElementClass, definition, metadata) {
  const descriptors = new Map();

  for (const [attribute, spec] of Object.entries(definition.attributes)) {
    const names = [spec.property ?? kebabToCamel(attribute)];
    for (const aliasProperty of spec.aliasProperties ?? [])
      names.push(aliasProperty);
    for (const alias of spec.aliases ?? []) {
      if (!(spec.aliasProperties ?? []).length) names.push(kebabToCamel(alias));
    }
    for (const property of names) {
      if (descriptors.has(property)) continue;
      descriptors.set(property, attribute);
      Object.defineProperty(ElementClass.prototype, property, {
        configurable: true,
        enumerable: true,
        get() {
          if (spec.liveProperty && this._control) {
            return this._control[spec.liveProperty];
          }
          return this._readAttribute(attribute);
        },
        set(value) {
          this._setAttributeValue(attribute, value);
        },
      });
    }
  }

  if (definition.control) {
    for (const method of ['focus', 'click']) {
      Object.defineProperty(ElementClass.prototype, method, {
        configurable: true,
        value(...args) {
          return this._control?.[method](...args);
        },
      });
    }
  }

  for (const property of definition.delegates?.properties ?? []) {
    Object.defineProperty(ElementClass.prototype, property, {
      configurable: true,
      enumerable: true,
      get() {
        return this._control?.[property] ?? null;
      },
    });
  }
  for (const method of definition.delegates?.methods ?? []) {
    Object.defineProperty(ElementClass.prototype, method, {
      configurable: true,
      value(...args) {
        return this._control?.[method](...args);
      },
    });
  }
  for (const [method, spec] of Object.entries(definition.methods ?? {})) {
    Object.defineProperty(ElementClass.prototype, method, {
      configurable: true,
      value(...args) {
        return spec.call.apply(this, [this._api, ...args]);
      },
    });
  }

  ElementClass.attributeAliases = metadata.aliases;
}

export function registerElement(definition) {
  if (customElements.get(definition.tag))
    return customElements.get(definition.tag);
  const metadata = attributeMetadata(definition);
  const preserveAttributes = new Set(definition.preserveAttributes ?? []);

  class AstryxElement extends HTMLElement {
    static observedAttributes = metadata.observed;

    constructor() {
      super();
      this._authorNodes = [];
      this._slotByNode = new WeakMap();
      this._generatedNodes = new WeakSet();
      this._regions = new Map();
      this._runtimeRoots = [];
      this._renderQueued = false;
      this._reflecting = false;
      this._warned = new Set();
      this._renderCleanup = [];
      this._connectionCleanup = null;
      this._observer = new MutationObserver(records =>
        this._handleMutations(records),
      );
      this._api = this._createAPI();
    }

    connectedCallback() {
      if (this._runtimeRoots.length === 0 && !this._adoptRenderedMarkup()) {
        this._resetAuthorNodes([...this.childNodes]);
      }
      for (const attribute of this.attributes)
        this._validateAttribute(attribute.name);
      this._connectionCleanup =
        definition.hooks?.connected?.(this, this._api) ?? null;
      this._observe();
      if (document.readyState === 'loading') {
        this._readyListener = () => {
          this._readyListener = null;
          this._scheduleRender();
        };
        document.addEventListener('DOMContentLoaded', this._readyListener, {
          once: true,
        });
      } else {
        this._scheduleRender();
      }
    }

    disconnectedCallback() {
      this._observer.disconnect();
      if (this._readyListener) {
        document.removeEventListener('DOMContentLoaded', this._readyListener);
        this._readyListener = null;
      }
      this._clearRenderCleanup();
      this._connectionCleanup?.();
      this._connectionCleanup = null;
      definition.hooks?.disconnected?.(this, this._api);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      const canonical = metadata.aliases.get(name) ?? name;
      this._validateAttribute(name);
      if (this._reflecting) return;
      const handled = definition.hooks?.attributeChanged?.(
        this,
        canonical,
        oldValue,
        newValue,
        this._api,
      );
      if (handled !== true) this._scheduleRender();
    }

    _createAPI() {
      const host = this;
      return Object.freeze({
        get control() {
          return host._control;
        },
        query(selector) {
          return host.querySelector(selector);
        },
        queryAll(selector) {
          return [...host.querySelectorAll(selector)];
        },
        read(name) {
          return host._readAttribute(name);
        },
        reflect(name, value) {
          host._reflectAttribute(name, value);
        },
        render() {
          host._scheduleRender();
        },
        mutate(callback) {
          host._observer.disconnect();
          try {
            return callback();
          } finally {
            const authorNodes = new Set(host._authorNodes);
            for (const root of host._runtimeRoots) {
              walkNodes(root, node => {
                if (!authorNodes.has(node)) host._generatedNodes.add(node);
              });
            }
            if (host.isConnected) host._observe();
          }
        },
        dispatch(type, detail = {}, target = host) {
          target.dispatchEvent(
            new CustomEvent(type, {bubbles: true, composed: true, detail}),
          );
        },
        warn(key, message) {
          host._warn(key, message);
        },
        listen(target, type, listener, options) {
          target.addEventListener(type, listener, options);
          const cleanup = () =>
            target.removeEventListener(type, listener, options);
          host._renderCleanup.push(cleanup);
          return cleanup;
        },
      });
    }

    _observe() {
      this._observer.observe(this, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    _resetAuthorNodes(nodes) {
      this._authorNodes = [];
      this._slotByNode = new WeakMap();
      for (const node of nodes)
        this._addAuthorNode(node, this._declaredSlot(node));
    }

    _adoptRenderedMarkup() {
      const directNodes = [...this.childNodes];
      const roots = directNodes.filter(
        node => node instanceof Element && node.hasAttribute('data-ax-root'),
      );
      if (roots.length === 0) return false;

      this._authorNodes = [];
      this._slotByNode = new WeakMap();
      this._regions = new Map();
      for (const root of roots) {
        const regions = [
          ...(root.matches('[data-ax-region]') ? [root] : []),
          ...root.querySelectorAll('[data-ax-region]'),
        ].filter(region => region.closest('[data-ax-root]') === root);
        for (const region of regions) {
          const slot = region.getAttribute('data-ax-region') || 'default';
          this._regions.set(slot, region);
          for (const node of region.childNodes) this._addAuthorNode(node, slot);
        }
      }
      for (const node of directNodes) {
        if (roots.includes(node)) continue;
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())
          continue;
        this._addAuthorNode(node, this._declaredSlot(node));
      }

      const authorSet = new Set(this._authorNodes);
      this._generatedNodes = new WeakSet();
      const markGenerated = node => {
        if (authorSet.has(node)) return;
        this._generatedNodes.add(node);
        for (const child of node.childNodes) markGenerated(child);
      };
      for (const node of directNodes) {
        if (
          roots.includes(node) ||
          (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())
        ) {
          markGenerated(node);
        }
      }
      this._runtimeRoots = directNodes.filter(node =>
        this._generatedNodes.has(node),
      );
      return true;
    }

    _declaredSlot(node, fallback = 'default') {
      if (!(node instanceof Element)) return fallback;
      return node.getAttribute('slot') || fallback;
    }

    _slotForContainer(container) {
      for (const [name, region] of this._regions) {
        if (region === container || region.contains(container)) return name;
      }
      return 'default';
    }

    _addAuthorNode(node, slot) {
      if (this._authorNodes.includes(node)) return;
      this._authorNodes.push(node);
      this._slotByNode.set(node, slot);
    }

    _removeAuthorSubtree(node) {
      this._authorNodes = this._authorNodes.filter(author => {
        if (author === node) return false;
        return !(node instanceof Element && node.contains(author));
      });
    }

    _handleMutations(records) {
      let reset = false;
      let changed = false;
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target === this)
            this._validateAttribute(record.attributeName);
          continue;
        }
        if (
          this._authorNodes.some(
            author =>
              author instanceof Element && author.contains(record.target),
          )
        ) {
          continue;
        }
        const insideRegion = [...this._regions.values()].some(
          region => region === record.target || region.contains(record.target),
        );
        if (this._generatedNodes.has(record.target) && !insideRegion) continue;
        if (
          record.target === this &&
          [...record.removedNodes].some(node =>
            this._runtimeRoots.includes(node),
          )
        ) {
          reset = true;
          continue;
        }
        for (const node of record.removedNodes) {
          this._removeAuthorSubtree(node);
          changed = true;
        }
        const fallbackSlot = this._slotForContainer(record.target);
        for (const node of record.addedNodes) {
          if (this._generatedNodes.has(node)) continue;
          this._addAuthorNode(node, this._declaredSlot(node, fallbackSlot));
          changed = true;
        }
      }
      if (reset) {
        this._runtimeRoots = [];
        this._regions.clear();
        this._generatedNodes = new WeakSet();
        if (!this._adoptRenderedMarkup()) {
          this._resetAuthorNodes([...this.childNodes]);
        }
        changed = true;
      }
      if (changed) this._scheduleRender();
    }

    _syncAuthorNodes() {
      if (
        this._runtimeRoots.length > 0 &&
        this._runtimeRoots.some(root => root.parentNode !== this)
      ) {
        this._runtimeRoots = [];
        this._regions.clear();
        this._generatedNodes = new WeakSet();
        if (!this._adoptRenderedMarkup()) {
          this._resetAuthorNodes([...this.childNodes]);
        }
        return;
      }

      this._authorNodes = this._authorNodes.filter(node => this.contains(node));
      for (const [slot, region] of this._regions) {
        for (const node of region.childNodes) {
          if (!this._generatedNodes.has(node)) this._addAuthorNode(node, slot);
        }
      }
      for (const node of this.childNodes) {
        if (!this._generatedNodes.has(node)) {
          this._addAuthorNode(node, this._declaredSlot(node));
        }
      }
    }

    _scheduleRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      queueMicrotask(() => {
        this._renderQueued = false;
        if (this.isConnected) this._render();
      });
    }

    _createHelpers(authorSet) {
      const host = this;
      const nodesForSlot = name =>
        this._authorNodes.filter(
          node => isMeaningfulNode(node) && this._slotByNode.get(node) === name,
        );
      return Object.freeze({
        attr(name) {
          return host._readAttribute(name);
        },
        hasAttribute(name) {
          return host._hasAttributeValue(name);
        },
        escape: escapeHTML,
        hasSlot(name = 'default') {
          return nodesForSlot(name).length > 0;
        },
        content(attribute, slot = 'default', fallback = '') {
          const slotted = nodesForSlot(slot).length > 0;
          const attributed = host._hasAttributeValue(attribute);
          if (slotted && attributed) {
            host._warn(
              `content:${attribute}:${slot}`,
              `[Astryx] <${definition.tag}> received both ${attribute} and slot="${slot}"; slotted content wins.`,
            );
          }
          return slotted
            ? {html: '', slotted: true}
            : {
                html: escapeHTML(
                  attributed ? host._readAttribute(attribute) : fallback,
                ),
                slotted: false,
              };
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
        warn(key, message) {
          host._warn(key, message);
        },
        authorNodes: authorSet,
      });
    }

    _render() {
      this._observer.disconnect();
      this._syncAuthorNodes();
      this._clearRenderCleanup();

      const authorSet = new Set(this._authorNodes);
      const helpers = this._createHelpers(authorSet);
      const template = document.createElement('template');
      template.innerHTML = definition.render(this, helpers).trim();
      for (const node of template.content.childNodes) {
        if (node instanceof Element) node.setAttribute('data-ax-root', '');
      }
      for (const region of template.content.querySelectorAll(
        '[data-ax-slot]',
      )) {
        region.setAttribute(
          'data-ax-region',
          region.getAttribute('data-ax-slot'),
        );
      }
      const desiredGenerated = new WeakSet();
      walkNodes(template.content, node => desiredGenerated.add(node));

      const desiredRegions = new Map();
      for (const region of template.content.querySelectorAll(
        '[data-ax-slot]',
      )) {
        desiredRegions.set(region.getAttribute('data-ax-slot'), region);
      }
      for (const node of this._authorNodes) {
        let slot = this._slotByNode.get(node) || this._declaredSlot(node);
        if (!Object.hasOwn(definition.slots, slot)) {
          this._warn(
            `slot:${slot}`,
            `[Astryx] <${definition.tag}> received unknown slot "${slot}"; using the default slot.`,
          );
          slot = Object.hasOwn(definition.slots, 'default') ? 'default' : slot;
          this._slotByNode.set(node, slot);
        }
        const region =
          desiredRegions.get(slot) ?? desiredRegions.get('default');
        if (region) region.append(node);
        else template.content.append(node);
      }

      const nextGenerated = new WeakSet();
      morphChildren(
        this,
        template.content,
        authorSet,
        desiredGenerated,
        nextGenerated,
        preserveAttributes,
      );
      this._generatedNodes = nextGenerated;
      this._runtimeRoots = [...this.childNodes].filter(node =>
        this._generatedNodes.has(node),
      );
      this._regions = new Map();
      for (const region of this.querySelectorAll('[data-ax-region]')) {
        const root = region.closest('[data-ax-root]');
        if (root?.parentNode !== this) continue;
        const name = region.getAttribute('data-ax-region');
        this._regions.set(name, region);
        region.removeAttribute('data-ax-slot');
      }

      this._control = definition.control
        ? this.querySelector(definition.control)
        : null;
      this._setupReflections();
      const cleanup = definition.hooks?.afterRender?.(this, this._api);
      if (typeof cleanup === 'function') this._renderCleanup.push(cleanup);
      this._observe();
    }

    _setupReflections() {
      for (const [attribute, spec] of Object.entries(definition.attributes)) {
        if (!spec.reflect || !this._control) continue;
        const target = spec.reflect.selector
          ? this.querySelector(spec.reflect.selector)
          : this._control;
        if (!target) continue;
        const reflect = event => {
          const value = spec.reflect.get
            ? spec.reflect.get(this, target, event, this._api)
            : target[spec.reflect.property ?? spec.liveProperty ?? attribute];
          if (value !== undefined) this._reflectAttribute(attribute, value);
        };
        for (const event of spec.reflect.events ?? []) {
          this._api.listen(target, event, reflect);
        }
        if (target.form) {
          this._api.listen(target.form, 'reset', () => queueMicrotask(reflect));
        }
      }
    }

    _clearRenderCleanup() {
      for (const cleanup of this._renderCleanup.splice(0)) cleanup();
    }

    _canonicalAttribute(name) {
      return metadata.aliases.get(name) ?? name;
    }

    _hasAttributeValue(name) {
      const spec = definition.attributes[name];
      if (!spec) return this.hasAttribute(name);
      return (
        this.hasAttribute(name) ||
        (spec.aliases ?? []).some(alias => this.hasAttribute(alias))
      );
    }

    _rawAttribute(name) {
      const spec = definition.attributes[name];
      if (this.hasAttribute(name)) return this.getAttribute(name);
      for (const alias of spec?.aliases ?? []) {
        if (this.hasAttribute(alias)) return this.getAttribute(alias);
      }
      return null;
    }

    _readAttribute(name) {
      const spec = definition.attributes[name];
      if (!spec) return this.getAttribute(name);
      const raw = this._rawAttribute(name);
      if (spec.type === 'boolean') {
        if (raw === null) return spec.default === true;
        if (spec.default === true && raw === 'false') return false;
        return true;
      }
      if (raw === null || raw === '') return spec.default ?? '';
      if (spec.type === 'enum' && !spec.values.includes(raw)) {
        this._warnInvalidEnum(name, raw, spec.values);
        return spec.default;
      }
      return raw;
    }

    _setAttributeValue(name, value) {
      const spec = definition.attributes[name];
      this._reflecting = false;
      if (spec.type === 'boolean') {
        if (spec.default === true && !value) {
          this.setAttribute(name, 'false');
          for (const alias of spec.aliases ?? []) this.removeAttribute(alias);
        } else if (value) this.setAttribute(name, '');
        else {
          this.removeAttribute(name);
          for (const alias of spec.aliases ?? []) this.removeAttribute(alias);
        }
        return;
      }
      if (value === null || value === undefined) {
        this.removeAttribute(name);
        for (const alias of spec.aliases ?? []) this.removeAttribute(alias);
      } else {
        this.setAttribute(name, String(value));
      }
    }

    _reflectAttribute(name, value) {
      const spec = definition.attributes[name];
      if (!spec) return;
      this._reflecting = true;
      const presentAliases = (spec.aliases ?? []).filter(alias =>
        this.hasAttribute(alias),
      );
      if (spec.type === 'boolean') {
        if (spec.default === true && !value) {
          this.setAttribute(name, 'false');
          for (const alias of spec.aliases ?? []) this.removeAttribute(alias);
        } else if (value) {
          if (this.hasAttribute(name) || presentAliases.length === 0) {
            this.setAttribute(name, '');
          }
          for (const alias of presentAliases) this.setAttribute(alias, '');
        } else {
          this.removeAttribute(name);
          for (const alias of spec.aliases ?? []) this.removeAttribute(alias);
        }
      } else {
        const text = String(value ?? '');
        if (this.hasAttribute(name) || presentAliases.length === 0) {
          if (this.getAttribute(name) !== text) this.setAttribute(name, text);
        }
        for (const alias of presentAliases) {
          if (this.getAttribute(alias) !== text) this.setAttribute(alias, text);
        }
      }
      this._reflecting = false;
    }

    _validateAttribute(name) {
      const canonical = this._canonicalAttribute(name);
      const spec = definition.attributes[canonical];
      if (
        spec ||
        GLOBAL_ATTRIBUTES.has(name) ||
        name.startsWith('aria-') ||
        name.startsWith('data-') ||
        /^on[a-z]+$/i.test(name)
      ) {
        const value = this.getAttribute(name);
        if (
          spec?.type === 'boolean' &&
          spec.default !== true &&
          value === 'false'
        ) {
          this._warn(
            `boolean-false:${canonical}`,
            `[Astryx] <${definition.tag}> treats ${name}="false" as present and therefore true; remove the attribute for false.`,
          );
        }
        if (
          spec?.type === 'enum' &&
          value !== null &&
          value !== '' &&
          !spec.values.includes(value)
        ) {
          this._warnInvalidEnum(canonical, value, spec.values);
        }
        return;
      }
      const suggestion = definition.attributeSuggestions?.[name];
      this._warn(
        `unknown:${name}`,
        `[Astryx] <${definition.tag}> received unknown attribute "${name}".${suggestion ? ` Did you mean "${suggestion}"?` : ''}`,
      );
    }

    _warnInvalidEnum(name, value, values) {
      this._warn(
        `enum:${name}`,
        `[Astryx] <${definition.tag}> received invalid ${name}="${value}"; expected ${values.join(', ')}.`,
      );
    }

    _warn(key, message) {
      if (this._warned.has(key)) return;
      this._warned.add(key);
      console.warn(message);
    }
  }

  installElementAPI(AstryxElement, definition, metadata);
  customElements.define(definition.tag, AstryxElement);
  return AstryxElement;
}

export function registerElements(definitions) {
  return definitions.map(registerElement);
}
