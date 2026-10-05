# Vanilla Astryx web components

This build-less experiment wraps existing Vanilla Astryx markup in standard custom elements. It deliberately uses **light DOM**, so `astryx-vanilla.css`, shipped theme CSS, and the existing `ax-` BEM classes style the same native elements. `astryx-vanilla.js` is optional: interactive elements own their behavior and mark their native roots so the progressive-enhancement bundle defers rather than double-enhancing them.

## API conventions

- Tags are `ax-` plus the React component name in kebab case: `Button` becomes `ax-button`, `TextInput` becomes `ax-text-input`, and `TabList` becomes `ax-tab-list`.
- Canonical attributes are React prop names in kebab case. Boolean props use presence attributes such as `is-disabled` and `is-open`.
- Common native spellings are exact, warning-free aliases where applicable: `disabled`, `open`, `required`, `readonly`, and `name`. Generated docs list the canonical attribute first and its aliases second.
- String content props work as attributes. For example, `<ax-button label="Save">` renders `Save`. Authored children or named slots win when both forms are present, with one development warning for the conflict.
- Generated JavaScript properties include canonical camel-case names and native aliases such as `isDisabled`/`disabled`, `isOpen`/`open`, `value`, and `name`. `focus()` and `click()` delegate to the native control; form-facing getters and validation methods are delegated where applicable.
- Native events bubble from the rendered button, input, select, or dialog. The wrapper does not synthesize competing click, input, change, or close events.
- Unknown attributes, unknown slots, invalid enum values, and boolean attributes written as `="false"` warn once. Global `role`, `aria-*`, `data-*`, and inline `on*` attributes are accepted.

Each `src/<ComponentName>.element.mjs` file is the source for its tag, attributes, aliases, slots, properties, methods, events, behavior hooks, docs, examples, and light-DOM renderer. `scripts/build-elements.mjs` discovers and validates those definitions, then generates the registration index, host/FOUC CSS, `elements-markup/*.html`, the example gallery, and both bundles.

## Add an element

Adding an element must require only files owned by that component:

1. Create `src/<ComponentName>.element.mjs` with the definition, at least two docs examples, and any component-owned behavior hooks. Examples are included in the generated gallery automatically; set `gallery: false` only on an example that is unsafe or invalid in isolation, such as a compound child.
2. If `markup/<ComponentName>.html` exists, create `test/parity/<ComponentName>.parity.mjs` describing the reference variant, host attributes, and authored children. Add any other component-specific tests in their own auto-discovered test file rather than a shared case array.
3. Run `pnpm -F @astryxdesign/vanilla build`. The script discovers all definitions and regenerates `index.generated.mjs`, `elements.generated.css`, `elements-markup/`, `examples/elements-gallery.html`, and the ESM/classic bundles. Run `pnpm -F @astryxdesign/vanilla check` to verify drift.
4. During branch integration, regenerate the bundled CLI copies with `pnpm -F @astryxdesign/cli sync:vanilla-assets`; component authors do not hand-edit those copies.

Never add a tag, count, parity case, or gallery section to a shared registry by hand. Definition tags/counts, parity modules, docs examples, and gallery groups are all discovered from per-component files, so parallel additions only meet in generated outputs.

## Light DOM and slots

Shadow DOM would isolate native markup from the existing stylesheet, theme scopes, labels, and document-level integrations, so these elements render no shadow root.

Rendered slot regions are the source of truth after connection. Author nodes retain identity across attribute updates; removals stay removed, replacements stay replaced, and nodes appended either to a host or a rendered slot region are adopted on the next render. Unknown named slots warn before falling back to the default region.

`ax-selector` intentionally accepts native `<option>` and `<optgroup>` children rather than introducing `ax-option`. The rendered control remains a real `<select>`, preserving browser keyboard behavior and native form submission without a form-associated-custom-element shim.

## Native wiring and behavior ownership

- `ax-text-input` and `ax-selector` use a separate `<label for>` plus description/status nodes, so supporting text does not become part of the control's accessible name.
- `ax-dialog` renders a real `<dialog>`, supports canonical `is-open` plus the `open` alias, exposes `show()` and `close()`, handles external `data-ax-dialog-open`/`data-ax-dialog-close` triggers, and restores focus to its connected invoker. Required dialogs omit the automatic close button and resist Escape/backdrop dismissal.
- `ax-tab-list` and `ax-tab` own panel hiding, `aria-selected`, `aria-controls`, roving `tabindex`, pointer activation, and arrow/Home/End navigation. Their behavior is synchronous after registration with or without `astryx-vanilla.js`.

## Layout and FOUC

Hosts use `display: contents`; the existing BEM root is the layout box. `scripts/build-elements.mjs` generates the complete tag registry used by `src/elements.generated.css`, including the `:not(:defined)` FOUC guard and a `[hidden] { display: none !important; }` override that preserves the HTML hidden contract.

## Browser support

The experiment targets the repository's current browser baseline: custom elements, native `<dialog>`, `MutationObserver`, `queueMicrotask`, and modern ESM. The classic bundle removes the module-loader requirement but does not polyfill custom elements or dialog behavior. Both bundles contain no bare module specifiers.

## Build and validation

```bash
pnpm -F @astryxdesign/vanilla build
pnpm -F @astryxdesign/vanilla check
pnpm -F @astryxdesign/vanilla test
pnpm -F @astryxdesign/vanilla test:elements:browser
```

The suites cover ESM/classic registration, operation with and without the progressive-enhancement bundle, control identity and focus preservation, live child replacement/removal, native properties and delegation, dialog and tab behavior, form submission/reset, generated-contract drift, warning fidelity, six theme/mode gallery states, and serious axe violations.
