# Deterministic interaction states

Use these recipes when a page must expose interaction states to people, tests, or a screenshot evaluator without depending on a previous interaction.

- [Build-less HTML state recipes](../examples/state-recipes.html)
- [Web-component state recipes](../examples/elements-state-recipes.html)

Both pages use the same `#state=<name>` contract and render every state in the original document. The shared controller is [`state-recipes.js`](../examples/state-recipes.js).

## State names

| Pattern               | Hash states                                                               | What changes                                                                                    |
| --------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| HoverCard             | `hover-open`                                                              | Opens the surface and synchronizes `hidden`, `data-ax-open`, and `aria-expanded`.               |
| Loading to success    | `loading`, `success`                                                      | Disables and marks the submit button busy while loading, then exposes a visible status message. |
| Upload progress       | `upload-progress`, `upload-done`, `upload-error`                          | Synchronizes the visible label, semantic variant, percentage, and progressbar value.            |
| Password strength     | `password-weak`, `password-medium`, `password-strong`, `password-visible` | Sets a representative value, strength meter, guidance, and password visibility.                 |
| Responsive navigation | `nav-collapsed`, `nav-expanded`                                           | Forces the compact hamburger state or its expanded menu independently of viewport width.        |

Open a state directly:

```text
packages/vanilla/examples/state-recipes.html#state=upload-error
packages/vanilla/examples/elements-state-recipes.html#state=upload-error
```

The default URL shows every recipe. An unknown state falls back to `default`.

## `vibe-states.json`

A multi-state evaluator can capture the default page plus at most four additional same-page states. Put `vibe-states.json` beside the generated project's main page and choose only the states relevant to that project.

HoverCard:

```json
{"states": [{"name": "hover-open", "url": "#state=hover-open"}]}
```

Loading and success:

```json
{
  "states": [
    {"name": "loading", "url": "#state=loading"},
    {"name": "success", "url": "#state=success"}
  ]
}
```

Upload:

```json
{
  "states": [
    {"name": "upload-progress", "url": "#state=upload-progress"},
    {"name": "upload-done", "url": "#state=upload-done"},
    {"name": "upload-error", "url": "#state=upload-error"}
  ]
}
```

Password strength and visibility:

```json
{
  "states": [
    {"name": "password-weak", "url": "#state=password-weak"},
    {"name": "password-medium", "url": "#state=password-medium"},
    {"name": "password-strong", "url": "#state=password-strong"},
    {"name": "password-visible", "url": "#state=password-visible"}
  ]
}
```

Responsive navigation:

```json
{
  "states": [
    {"name": "nav-collapsed", "url": "#state=nav-collapsed"},
    {"name": "nav-expanded", "url": "#state=nav-expanded"}
  ]
}
```

## Authoring rules

1. Treat every hash state as a fresh page load. Derive the complete state from the hash; never depend on a previous capture or timer.
2. Keep the origin and path unchanged. Do not redirect, load a second HTML document, use an iframe, or fetch an HTML fragment for a state.
3. Synchronize visible and programmatic state. For example, update both the progress fill and `aria-valuenow`, and both the menu visibility and `aria-expanded`.
4. Keep controls interactive after deterministic activation. Hash activation supplements pointer and keyboard paths; it does not replace them.
5. Prefer native semantics and Astryx state attributes. Use live regions only when a real user-triggered transition needs an announcement; a screenshot label is not a reason to add one.

## Validation

From the repository root:

```sh
npx --yes pnpm@11.10.0 -F @astryxdesign/vanilla build
npx --yes pnpm@11.10.0 -F @astryxdesign/vanilla test
```

The browser suite opens every documented state in a fresh context for both delivery paths, captures a screenshot, rejects console errors, and requires zero serious or critical axe violations.
