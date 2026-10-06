# Shared readable CSS spike

## Recommendation

**Do not scale the current compiled-class projection directly to every component.** The spike proves that readable `ax-` selectors can be projected losslessly from the same compiled StyleX data for the manifest's covered medium-size, non-elevated compositions. That projection preserves token variables, theme hooks, hover rules, and focus rules. It does **not** yet prove parity with React-rendered Astryx. Exact projection requires the final StyleX composition graph, not just each `stylex.create()` object in isolation. Enumerating every composition produces too much CSS and turns runtime conditionals into a combinatorial build input.

If shared React/vanilla CSS becomes a product goal, first introduce an explicit, serializable **component style recipe** layer. React should lower that recipe through StyleX, while a second compiler lowers the same recipe to readable BEM selectors. Keep component-local React output on the maintained StyleX path; treat readable distribution CSS as a generated output with its own parity gate.

## Prototype

The prototype compiles the existing sources with `@stylexjs/babel-plugin`, reads the plugin's atomic-rule metadata and transformed style maps, applies StyleX's last-property-wins merge for each declared component composition, and rewrites the surviving atomic selectors to readable BEM compositions.

Covered emitted and measured compositions:

- **Button:** local base, `md` size, four variants, `none` elevation, shared focus outline, and shared interaction overlay.
- **Card:** local base, all thirteen background variants, `none` elevation, border treatment, and shared Layout container padding.
- **TextInput:** local input styles plus the shared Field wrapper, `md` size, four status cases, status hover ring, and status focus rules.

The manifest also locates `sm`/`lg` and elevated StyleX maps, but those maps are not composed into `readable.css` or measured by this spike. The results therefore make no claim about small/large or elevated output.

The fixtures retain the existing theme contract alongside readable classes:

- `astryx-button` + `data-size` / `data-variant` / `data-elevation`
- `astryx-card` + `data-variant` / `data-elevation`
- `astryx-text-input` + `data-size` / `data-status`

This lets built themes override the generated CSS without forking theme rules. Values remain semantic CSS custom properties such as `var(--color-accent)` and `var(--spacing-4)`.

### Files

- `manifest.mjs` — source/style ownership, readable selectors, and variant cases.
- `generate.mjs` — StyleX compilation, composition merge, readable CSS generation, and deterministic `--check` mode.
- `generated/readable.css` — readable generated CSS.
- `generated/reference.css` — atomic StyleX reference CSS for the same source styles.
- `generated/fixtures.json` — exact atomic and readable class compositions.
- `parity.mjs` — Playwright computed-style comparison.
- `results.json` — complete per-case results and property differences.

### Reproduce

From this directory:

```sh
node generate.mjs
node generate.mjs --check
node parity.mjs
```

The parity run expects built Neutral and Butter theme CSS:

```sh
pnpm -F @astryxdesign/core build
pnpm -F @astryxdesign/theme-neutral build
pnpm -F @astryxdesign/theme-butter build
```

## Parity results

The browser matrix uses the spike manifest as its baseline. The manifest transcribes the covered React composition order, the reference side renders the surviving atomic classes from that manifest, and the generated side renders the same fixture through rewritten readable selectors. The comparison proves that the selector rewrite is lossless for those declared compositions; it does **not** compare against a React-rendered component tree.

A real React parity gate would render each Core component with the same props and theme in Playwright, capture its actual DOM anatomy, class list, attributes, and computed styles, then compare those values with a generated BEM specimen for the same state. That independent render must be the source of truth so a stale or incorrect manifest cannot make both sides agree with each other.

The matrix also renders the existing hand-authored `Button.css`, `Card.css`, and `TextInput.css` against the spike's root-oriented specimen. That is a strict structural comparison, not a visual-regression verdict.

Dimensions:

| Component |            Variants | Fixed axes                  | States                    |            Theme/mode pairs | Comparisons |
| --------- | ------------------: | --------------------------- | ------------------------- | --------------------------: | ----------: |
| Button    |                   4 | size `md`, elevation `none` | rest, hover, focus        | Neutral/Butter × light/dark |          48 |
| Card      |                  13 | elevation `none`            | rest                      | Neutral/Butter × light/dark |          52 |
| TextInput |          4 statuses | size `md`                   | rest, hover, focus-within | Neutral/Butter × light/dark |          48 |
| **Total** | **21 compositions** |                             |                           |                             |     **148** |

Results:

| Output                                  | Manifest-baseline passes | Failed cases | Differing properties |
| --------------------------------------- | -----------------------: | -----------: | -------------------: |
| Generated readable CSS                  |            **148 / 148** |        **0** |                **0** |
| Hand-authored CSS in the spike specimen |                  0 / 148 |          148 |                1,209 |

“Pass” means every measured computed property matched the manifest-derived atomic baseline. The hand-authored CSS remains a useful visual implementation; its 0/148 result is **not** evidence that it looks wrong. The fixture intentionally holds one DOM contract constant while the hand fork often owns a different one.

Largest strict-contract differences:

- **Button (161 differences):** interaction-overlay `background-image`, default transform normalization, focus-outline details, and theme border behavior. The transform difference alone appears in every case but is not necessarily visually observable at rest.
- **Card (860 differences):** the hand fork places spacing on `.ax-card__header`, `__body`, and `__footer`, while the spike puts content directly on the root. Most padding, border, and box-sizing differences therefore reflect anatomy and geometry ownership, not demonstrated visual defects.
- **TextInput (188 differences):** wrapper stacking context, outline normalization, and hover/focus/status shadow composition under the spike's simplified wrapper/input anatomy.

## Important finding: composition must be preserved

A naive rule-by-rule rename initially passed 136/148 cases but failed every focused non-default TextInput status. StyleX had removed the base focus-shadow atomic class when a later status style replaced the same `boxShadow` property. Renaming all source atomics reintroduced that removed rule through the broad `.ax-text-input` selector.

The final prototype emits rules from the **surviving merged class set** for each readable composition. That reaches lossless manifest-baseline projection, but duplicates shared declarations across compositions:

- generated readable CSS: about **68.9 KB for only 21 medium-size, non-elevated compositions**;
- atomic reference CSS: about **8.7 KB for all 57 mapped style records**, including mapped size/elevation records that no readable composition uses;
- current three hand-authored component files: about **6.0 KB**, with a different structural contract.

These are not equivalent bundles, so the report does not treat their ratio as a production compression measurement. The missing declared cross-product is still instructive: Button's 4 variants × 3 sizes × 4 elevations, Card's 13 variants × 4 elevations, and TextInput's 4 statuses × 3 sizes produce **112 compositions** before disabled, loading, grouping, dynamic values, or other states. If duplication grew linearly from the current 21-composition output, readable CSS would be roughly **368 KB**. That figure is an illustrative projection, not measured output, and strengthens the recommendation not to scale composition enumeration unchanged.

## Gaps

### Pseudo-states

- Covered in browser evidence: Button hover/focus-visible and TextInput hover/focus-within.
- Emitted but not measured: Button active/pressed rules.
- Not modeled: disabled, loading, aria-disabled, ButtonGroup adjacency, and other structural pseudo-selectors.
- Relational selectors and scoped markers need dedicated nested-component fixtures before production use.

### Dynamic styles

StyleX dynamic functions compile to an atomic class plus runtime custom-property values. Arbitrary values such as Button width or Card dimensions cannot be represented by a finite modifier list. A production readable path needs one of:

- a small runtime that applies generated private custom properties;
- documented inline custom properties for dynamic values; or
- a deliberately bounded set of readable utility modifiers.

### Conditional styles

React currently selects style objects with JavaScript conditions. A readable stylesheet needs those conditions reflected as stable classes or attributes. Variant/status axes already have theme-hook metadata, but loading, grouping, optional anatomy, and behavioral state do not all have a distributable selector contract.

### Selector specificity

The generated composition selectors are compounds such as `.ax-button.ax-button--md.ax-button--primary.ax-button--elevation-none` (specificity `0,4,0`), while the hand fork deliberately uses `:where()` selectors with zero specificity. Theme layers still win in this fixture, but application-level overrides would observe a different contract. A production compiler must define and test readable-selector specificity instead of inheriting the prototype's compound-selector behavior.

### Shared ownership and private bindings

A component file is not a complete style source:

- Button imports focus and interaction styles;
- Card calls the Layout container recipe;
- TextInput composes Field styles.

The spike uses an explicit manifest and in-memory export probes to observe private compiled bindings. Production code should not depend on private variable names or transformed AST shape. The shared recipe/metadata layer must make ownership explicit and stable.

### Theme hooks

The generated declarations preserve CSS variables. The prototype carries existing `themeProps()` class/attribute hooks through fixture metadata rather than deriving them automatically. A production compiler should consume the same component target metadata that `themeProps()` and component docs use.

## Estimated effort to scale

For one engineer familiar with the styling and theme pipelines:

| Work                                                               |                Estimate |
| ------------------------------------------------------------------ | ----------------------: |
| Stable recipe schema and dual StyleX/readable compiler             |               2–3 weeks |
| Migrate and annotate Core components/shared helpers                |               3–5 weeks |
| Dynamic/conditional/relational state policies and browser fixtures |               1–2 weeks |
| CI drift checks, size optimization, documentation, rollout         |               1–2 weeks |
| **Total**                                                          | **7–12 engineer-weeks** |

The range assumes no public DOM-contract changes. Components whose current composition cannot be expressed without new stable attributes would require separate API/design decisions and extend the schedule.

## Suggested next step

Prototype the shared recipe layer on these same three components, with three hard acceptance gates:

1. An independent Playwright fixture renders the actual React components and makes their DOM, classes, attributes, and computed styles the parity baseline.
2. React output remains byte/behavior equivalent to current StyleX output.
3. Readable output covers the declared size/elevation cross-product and stays under 2× the equivalent atomic CSS size without composition enumeration.

If that size target cannot be met, or if independent React-render parity requires unstable DOM contracts, keep the hand-authored vanilla CSS and add targeted drift tests instead of pursuing full single-source generation.
