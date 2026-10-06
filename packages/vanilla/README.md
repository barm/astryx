# Vanilla Astryx

Experimental no-build Astryx assets for plain HTML pages. Vanilla Astryx combines readable `ax-*` classes, Astryx design tokens, and progressively enhanced browser behaviors in one CSS file and one JavaScript file.

## What is included

- Component CSS in `dist/astryx-vanilla.css`.
- Classic and ESM behavior bundles in `dist/astryx-vanilla.js` and `dist/astryx-vanilla.mjs`.
- Copyable component markup in `markup/`.
- Nine standalone page templates in `templates/`:
  - [`dashboard.html`](templates/dashboard.html)
  - [`table-filter.html`](templates/table-filter.html)
  - [`form-two-column.html`](templates/form-two-column.html)
  - [`detail-page.html`](templates/detail-page.html)
  - [`settings.html`](templates/settings.html)
  - [`shell-side-nav.html`](templates/shell-side-nav.html)
  - [`product-detail.html`](templates/product-detail.html)
  - [`login.html`](templates/login.html)
  - [`kanban-board.html`](templates/kanban-board.html)
- Generated custom-element docs in `elements-markup/` and nine standalone web-component templates in `elements-templates/`.
- Self-contained custom-element bundles in `dist/astryx-elements.js` (ESM) and `dist/astryx-elements.classic.js`.
- A browsable [`demo/index.html`](demo/index.html) for HTML templates and [`demo/elements/index.html`](demo/elements/index.html) for web-component templates.
- Committed, ready-to-open pinned copies under [`demo/pinned/`](demo/pinned/) and [`demo/elements/pinned/`](demo/elements/pinned/).

The canonical HTML and web-component templates use `__ASTRYX_VANILLA_CDN__` as the base for their CSS and JavaScript URLs. The Astryx CLI and demo renderer replace that placeholder with the same commit-pinned jsDelivr URL.

## Install

POC branch canaries use the isolated `vanilla-poc` npm channel. Install the public packages and CLI from that channel with commands such as:

```sh
npm install @astryxdesign/core@vanilla-poc
npm install -g @astryxdesign/cli@vanilla-poc

# Or run the CLI without a global install.
npx --yes @astryxdesign/cli@vanilla-poc component --list --framework html
```

The commit-pinned preview tarball remains available as a fallback:

```sh
npm install -g https://cdn.jsdelivr.net/gh/facebook/astryx@ce7b98c3c01705bb8d71b96861828bfbc07283ac/packages/vanilla/dist/cli/astryx-cli-vanilla.tgz
```

The channel does not publish private packages such as `@astryxdesign/vanilla`, or packages marked canary-only, unless the release workflow explicitly includes them.

## Try it

Install dependencies and build the package:

```sh
pnpm install --frozen-lockfile
pnpm -F @astryxdesign/vanilla build
pnpm -F @astryxdesign/vanilla test
```

A fresh clone already contains the rendered demo. Open `packages/vanilla/demo/pinned/index.html` directly in a browser; its links open the nine templates in the same directory. To regenerate the pinned copies from the canonical demo, templates, and CDN pin, run:

```sh
pnpm -F @astryxdesign/vanilla demo
```

The command prints the ready-to-open `file://` URL. The committed copies intentionally load CSS and JavaScript from the single `ASTRYX_VANILLA_CDN_REF` constant in the CLI.

Run the CLI directly from a checkout:

```sh
node packages/cli/clients/cli/bin/astryx.mjs template --list --framework html
node packages/cli/clients/cli/bin/astryx.mjs template dashboard --framework html > dashboard.html
node packages/cli/clients/cli/bin/astryx.mjs template dashboard --framework web-components > dashboard-elements.html
node packages/cli/clients/cli/bin/astryx.mjs component Button --framework web-components
```

`--html` remains a deprecated alias for `--framework html`; new examples use `--framework` so the output target is explicit.

For local development, replace `__ASTRYX_VANILLA_CDN__` in a canonical template or the source demo index with either:

- `../dist` for the source demo index;
- an absolute URL for a local static server; or
- a commit-pinned public URL such as `https://cdn.jsdelivr.net/gh/facebook/astryx@<commit>/packages/vanilla/dist`.

Then serve the repository root with any static file server. The canonical HTML documents preserve the placeholder for CLI rendering, while `demo/pinned/` is the zero-setup copy for local files or an HTML-capable static host.

## Markup contract

- Public markup uses readable BEM-style `ax-*` classes such as `.ax-button`, `.ax-button--primary`, and `.ax-card__header`.
- State uses native elements and ARIA attributes where possible; behavior hooks use `data-ax-*` attributes.
- Component styles live one-per-file in `src/components/` and are discovered automatically by the build.
- `markup/<ComponentName>.html` contains CLI-ready examples beginning with a `docs` comment and labeled `variant` blocks.
- CSS custom-property defaults are generated from `packages/core/src/theme/tokens.stylex.ts`.
- The document root selects a shipped or custom theme with `data-astryx-theme` and selects `light` or `dark` with `data-theme`.

## Web-component contract

- Every `ax-*` host renders light DOM that reuses the same Vanilla Astryx CSS and native controls; there is no shadow DOM.
- Use canonical React-derived kebab-case attributes such as `is-disabled`, `html-name`, and `is-open`. Booleans are presence attributes unless the component docs explicitly describe a default-true value.
- Named content uses the slots listed by `astryx component <Name> --framework web-components`; array-like content uses documented native children such as `option`, `button`, `a`, `input`, or `table`.
- Do not put `ax-*` BEM classes or inline styles inside custom elements. The element owns its markup; page-specific layout stays outside it and uses Astryx tokens.
- Load `astryx-vanilla.js` together with one of the self-contained element bundles. Native events bubble from inner controls, and component-specific `astryx:*` events are listed in generated docs.

## Theming

Vanilla Astryx supports Neutral, Butter, Y2K, Stone, Matcha, Chocolate, and Gothic. Load the corresponding `@astryxdesign/theme-*` stylesheets, then switch themes by changing `data-astryx-theme`. Theme and mode attributes can live on the document root or a subtree; nested `data-theme="dark"` scopes resolve dark tokens inside a light page. Gothic is intentionally dark-only.

Custom themes override semantic CSS variables in one `astryx-theme` layer block. Keep literal brand values in that dedicated definition; templates and component styles should only consume semantic tokens. Use `.ax-theme` for HTML scopes or `<ax-theme theme="…" mode="…">` for web-component scopes.

The JavaScript bundle persists controls marked with `data-ax-theme-switch`, `data-ax-mode-switch`, `data-ax-theme-toggle`, or `data-ax-mode-toggle`. A theme `<select>` may offer shipped slugs and custom slugs together; the demo and templates restore the saved choice before styles load, and query parameters named `theme` and `mode` take precedence.

See [`docs/theming.md`](docs/theming.md) for complete HTML and web-component recipes for a scoped brand section, nested dark mode, and a persisted three-theme switcher. Copy the version-matched scope examples with:

```sh
node packages/cli/clients/cli/bin/astryx.mjs component Theme --framework html
node packages/cli/clients/cli/bin/astryx.mjs component Theme --framework web-components
```

## Known gaps

This is a proof of concept optimized for demo clarity, not a production compatibility promise. It covers the documented component subset and modern browser primitives; it does not yet provide every React Astryx component, server-rendered state, framework adapters, or a legacy-browser bundle. Shipped theme packages override shared tokens, while theme rules aimed at React's generated component classes do not automatically style `ax-*` components.

A future implementation could generate readable vanilla CSS and component markup from the same source used by React Astryx. That would remove parallel styling work while preserving a no-build consumer path.
