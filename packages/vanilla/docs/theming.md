# Theming Vanilla Astryx

Vanilla Astryx supports every shipped Astryx theme, light and dark modes, and custom themes made from CSS custom-property overrides. Load the Vanilla stylesheet first, then one or more theme stylesheets, then place custom overrides after them in the `astryx-theme` layer.

## Shipped themes

| Theme     | Package                         | Typography                       |
| --------- | ------------------------------- | -------------------------------- |
| Neutral   | `@astryxdesign/theme-neutral`   | Figtree                          |
| Butter    | `@astryxdesign/theme-butter`    | Outfit and Sarina                |
| Y2K       | `@astryxdesign/theme-y2k`       | Poppins and Crimson Text         |
| Stone     | `@astryxdesign/theme-stone`     | Figtree and Montserrat           |
| Matcha    | `@astryxdesign/theme-matcha`    | DM Sans and Playwrite US Trad    |
| Chocolate | `@astryxdesign/theme-chocolate` | Albert Sans and Fraunces         |
| Gothic    | `@astryxdesign/theme-gothic`    | Fustat and Manufacturing Consent |

Gothic is intentionally dark-only. Its light and dark mode settings use the same dark palette.

Load each theme you want to offer. The demo loads all seven so changing the root attribute does not require another request:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-neutral@0.6.5/dist/theme.css" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-butter@0.6.5/dist/theme.css" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-y2k@0.6.5/dist/theme.css" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-stone@0.6.5/dist/theme.css" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-matcha@0.6.5/dist/theme.css" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-chocolate@0.6.5/dist/theme.css" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@astryxdesign/theme-gothic@0.6.5/dist/theme.css" />
```

Set the page theme and mode on the document root:

```html
<html lang="en" data-astryx-theme="matcha" data-theme="dark"></html>
```

## Define one custom brand theme

A custom theme is a named `data-astryx-theme` scope with semantic token overrides. Keep every literal brand value in one `astryx-theme` block after shipped theme stylesheets. Components and page CSS should only consume tokens; do not restyle component classes with raw colors.

```html
<style>
  @layer astryx-theme {
    [data-astryx-theme='brand'] {
      --color-accent: light-dark(#6d28d9, #a78bfa);
      --color-accent-muted: light-dark(#ede9fe, #2e1a47);
      --color-on-accent: light-dark(#ffffff, #1f1235);
      --color-text-accent: light-dark(#5b21b6, #c4b5fd);
      --color-icon-accent: light-dark(#5b21b6, #c4b5fd);
      --color-background-body: light-dark(#f5f3ff, #171126);
      --focus-outline-color: var(--color-accent);
    }
  }
</style>
```

The base theme supplies every token not listed here.

## Recipe 1: scope the brand to one section

The nearest `data-astryx-theme` scope wins. Content outside the scope keeps the page theme.

### HTML

```html
<html lang="en" data-astryx-theme="neutral" data-theme="light">
  <body>
    <p class="ax-text">Neutral page content</p>

    <div class="ax-theme" data-astryx-theme="brand">
      <div class="ax-card">
        <h2 class="ax-heading ax-heading--3">Brand workspace</h2>
        <button class="ax-button ax-button--primary" type="button">
          Continue
        </button>
      </div>
    </div>
  </body>
</html>
```

### Web components

```html
<p>Neutral page content</p>

<ax-theme theme="brand">
  <ax-card>
    <ax-heading level="3">Brand workspace</ax-heading>
    <ax-button variant="primary">Continue</ax-button>
  </ax-card>
</ax-theme>
```

`ax-theme` renders light DOM and scopes the same semantic tokens as the HTML form.

## Recipe 2: nest dark mode inside a light page

`data-theme` controls `color-scheme` at any Vanilla Theme scope, so `light-dark()` token values resolve independently in nested content.

### HTML

```html
<html lang="en" data-astryx-theme="neutral" data-theme="light">
  <body>
    <p class="ax-text">Light page content</p>

    <div class="ax-theme" data-astryx-theme="brand" data-theme="dark">
      <div class="ax-card">
        <h2 class="ax-heading ax-heading--3">Dark tools</h2>
        <p class="ax-text">This subtree uses the brand dark tokens.</p>
      </div>
    </div>
  </body>
</html>
```

### Web components

```html
<ax-theme theme="neutral" mode="light">
  <ax-text>Light page content</ax-text>

  <ax-theme theme="brand" mode="dark">
    <ax-card>
      <ax-heading level="3">Dark tools</ax-heading>
      <ax-text>This subtree uses the brand dark tokens.</ax-text>
    </ax-card>
  </ax-theme>
</ax-theme>
```

## Recipe 3: persist a three-theme switcher

The Vanilla JavaScript bundle recognizes `data-ax-theme-switch` on a native `<select>`. It applies the selected slug to the document root, stores it under `astryx-vanilla-theme` in `localStorage`, restores it on reload, and accepts custom slugs. Load every shipped stylesheet and custom theme block named by an option.

### HTML

```html
<label class="ax-selector">
  <span class="ax-selector__label">Theme</span>
  <span class="ax-selector__control">
    <select class="ax-selector__select" data-ax-theme-switch>
      <option value="neutral">Neutral</option>
      <option value="butter">Butter</option>
      <option value="brand">Brand</option>
    </select>
    <span class="ax-selector__indicator" aria-hidden="true"></span>
  </span>
</label>
```

### Web-component page

Behavior hooks remain native controls, so they work alongside `ax-*` components without another adapter:

```html
<label>
  Theme
  <select data-ax-theme-switch>
    <option value="neutral">Neutral</option>
    <option value="butter">Butter</option>
    <option value="brand">Brand</option>
  </select>
</label>

<ax-card>
  <ax-heading level="3">Current theme</ax-heading>
  <ax-text>The saved selection applies to this component after reload.</ax-text>
</ax-card>
```

Use `data-ax-mode-switch` with `light` and `dark` options for a persisted page-wide mode control. `data-ax-theme-toggle` cycles shipped themes and `data-ax-mode-toggle` toggles modes. Storage failures are ignored, so controls still work in sandboxed and local-file contexts. Query parameters named `theme` and `mode` take precedence in the included templates and are remembered for later pages.

Copy the version-matched examples from a checkout with:

```sh
node packages/cli/clients/cli/bin/astryx.mjs component Theme --framework html
node packages/cli/clients/cli/bin/astryx.mjs component Theme --framework web-components
```
