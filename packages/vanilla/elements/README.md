# Vanilla Astryx web components

This package is a build-less experiment that wraps existing Vanilla Astryx markup in standard custom elements. It deliberately uses **light DOM**, so `astryx-vanilla.css`, shipped theme CSS, and `astryx-vanilla.js` continue to style and enhance the same native elements and `ax-` BEM classes.

## API conventions

- Tags are `ax-` plus the React component name in kebab case: `Button` becomes `ax-button`, `TextInput` becomes `ax-text-input`, and `TabList` becomes `ax-tab-list`.
- Attributes mirror React Astryx prop names in kebab case where the HTML surface exposes that concept. Boolean props use presence attributes (`is-disabled`), while enum attributes declare allowed values and a default in the generated markup docs.
- `open`, `selected`, `checked`, and `value` are state attributes. The runtime reflects native state changes to them without replacing the active native control.
- Native events bubble from the rendered button, input, select, or dialog. The wrapper does not synthesize competing click, input, change, or close events.
- Unknown attributes and invalid enum values warn once per element and attribute.

Each `src/<ComponentName>.element.mjs` file is the single source for its tag, attributes, slots, docs, examples, and light-DOM renderer. `scripts/build-elements.mjs` discovers those definitions, generates `elements-markup/*.html`, and bundles the registration runtime.

## Light DOM and slots

Shadow DOM would isolate the native markup from the existing stylesheet, theme scopes, progressive-enhancement script, labels, and document-level behavior handlers. These elements therefore render no shadow root.

Author children are retained as the same nodes across idempotent renders. A child with `slot="header"`, `slot="footer"`, `slot="start"`, `slot="end"`, `slot="title"`, or `slot="panels"` moves into the matching BEM region. Remaining children use the default slot. Card, Layout, Dialog, and TabList demonstrate named regions.

`ax-selector` intentionally accepts native `<option>` and `<optgroup>` children rather than introducing `ax-option`. The rendered control remains a real `<select>`, preserving browser keyboard behavior and native form submission with no form-associated-custom-element shim.

## Native wiring and state

- `ax-text-input` generates label, description, status, `aria-describedby`, and `aria-invalid` wiring around a real `<input>`.
- `ax-selector` generates equivalent field wiring around a real `<select>`.
- `ax-dialog` renders a real `<dialog>`, exposes `show()` and `close()`, restores focus to its connected invoker, and interoperates with `data-ax-dialog` behavior from `astryx-vanilla.js`.
- `ax-tab-list` and `ax-tab` render the existing tablist/button contract, including `aria-selected`, `aria-controls`, roving `tabindex`, mouse activation, and arrow/Home/End navigation from `astryx-vanilla.js`.

## Layout and FOUC

Hosts use `display: contents`; the existing BEM root is the layout box. This avoids an extra flex/grid participant while retaining a custom-element ownership boundary. The explicit `ax-*:not(:defined)` tag list in `src/base.css` hides author children until registration, preventing an unstyled flash without relying on an unsupported wildcard selector.

## Browser support

The experiment targets the repository's current browser baseline: custom elements, native `<dialog>`, `MutationObserver`, `queueMicrotask`, and modern ESM. The classic bundle removes the module-loader requirement but does not polyfill custom elements or dialog behavior. Both bundles contain no bare module specifiers.

## Build and validation

```bash
pnpm -F @astryxdesign/vanilla build:elements
pnpm -F @astryxdesign/vanilla check:elements
pnpm -F @astryxdesign/vanilla test
pnpm -F @astryxdesign/vanilla test:elements:browser
```

The browser suite covers ESM and classic registration, keyboard and pointer behavior, form submission, warning deduplication, six theme/mode gallery states, and serious axe violations.
