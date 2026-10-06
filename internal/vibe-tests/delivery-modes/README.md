# Delivery-mode vibe tests

This harness compares Astryx across four public consumer delivery modes while holding the prompt battery, agents, and evaluator constant:

- `react-build`: Vite, React 19, npm packages, and generated agent docs.
- `react-nobuild`: one `index.html` using React 19, htm, and Astryx 0.6.5 from public CDNs.
- `vanilla`: build-less HTML with the commit-pinned Vanilla Astryx assets, a minimal working starter, and a locally installed preview CLI.
- `web-components`: build-less HTML using commit-pinned light-DOM `ax-*` custom elements, an equivalent starter, and the same locally installed preview CLI.

Each matrix cell starts a context-free agent in a unique private root. Generated source, transcripts, screenshots, and reports are never written to tracked paths.

## Local runner profile

The harness requires `VIBE_RUNNER_PROFILE` to point to an uncommitted JSON file outside the checkout. Concrete runner commands, launcher arguments, expected built-in context, host paths, isolation scripts, transcript-audit paths, and version commands belong there—not in this public repository. The harness fails before setup when the variable, file, or a required field is missing.

`runner-profile.example.json` is the schema example. It contains placeholders only. Copy it outside the checkout, replace every `REPLACE_ME` value and placeholder command with values for the local host, and keep that concrete file untracked. Argument arrays may use `{{MCP_CONFIG}}`, `{{TOOLS}}`, `{{PROJECT}}`, `{{TASK_FILE}}`, `{{MAX_MODEL_STEPS}}`, and `{{JSON_SCHEMA}}`; the harness fails on a missing substitution.

The profile's `sandbox.mountScript` receives the current uid, gid, private run root, browser cache, username, command, and command arguments as shell positional parameters. `sandbox.probeScript` runs inside that namespace and receives the sibling-run path, private temporary-file paths, and host-user path. Keep the manifest and probe receipt descriptions aligned with what those scripts actually enforce.

## Run

The Linux host must support passwordless `sudo` for constructing mount namespaces. The host launcher uses it before entering the namespace; `sudo` is replaced with `/bin/false` inside every agent and judge sandbox.

```sh
VIBE_RUNNER_PROFILE="$HOME/.config/astryx/vibe-runner-profile.json" \
pnpm -F @astryxdesign/vibe-tests delivery:run \
  --configs react-build,react-nobuild,vanilla,web-components \
  --agents claude,muse \
  --sample 15 \
  --seed 20261003 \
  --concurrency 1 \
  --resume
```

The fixed seed and selected IDs are recorded in `manifest.json`. Concurrency defaults to 1 because mount namespaces still share PID and network namespaces; parallel agents can otherwise kill or reuse another cell's preview server. Each completed cell is checkpointed as `runs/<id>/run.json`. Re-run the same command with `--resume` after an interruption; `--max-new-jobs <n>` can intentionally stop after a checkpoint batch.

Before running agents, the harness renders the no-build React starter at the pinned package version and saves its screenshot. The starter exercises an icon-bearing Banner, component hooks, theme context, and a controlled TextInput; the self-check types into the field and verifies its controlled value. Both the core and theme ESM imports carry `?external=react,react-dom` so esm.sh reuses the import-mapped React runtime.

The published 0.6.5 reference recipe externalized React only on the core import. Its theme import could therefore resolve a second React instance, causing hook/context failures that looked like agent or delivery-mode failures. The corrected harness starter externalizes React on **both** imports and treats its self-check as a prerequisite.

The shared evaluator then:

1. runs `vite build` for `react-build` and separately records `tsc --noEmit` diagnostics as a non-gating quality metric;
2. serves the output and checks for a non-blank render, browser console errors, and page errors;
3. captures a full-page screenshot;
4. measures visible semantic targets using explicit React and Vanilla class taxonomies; web components are scored from their upgraded light-DOM `ax-*` BEM markup, and custom-element hosts are never targets; component classes and their parts confer adoption, while layout-only families and parts never do;
5. scans only agent-authored changes after removing HTML/CSS/JS comments; inline styles, raw hex, and raw pixel values are hard-coded metrics, while custom-property and theme definitions are reported separately;
6. runs axe-core;
7. asks a headless Claude judge to score prompt fulfillment and visual quality from an anonymized screenshot and the task prompt only.

A build failure, page error, blank render, runner failure, timeout, or forbidden-context audit failure receives adoption, prompt-fulfillment, and visual-quality scores of 0. Those rows remain in every median and pass-rate denominator. For a timeout, the report separately scores the last complete on-disk state as **best before timeout** so a slow-but-working output is distinguishable from a broken one without changing the primary result. Reports display the sample count for each metric.

Every prompt states the same wall-clock budget and advertises the same `screenshot <file-or-url> [output.png]` helper. The helper runs the same read-only Playwright Chromium build in all three delivery configs.

The output directory contains `report.md`, a self-contained `report.html`, `report.json`, screenshots, runner transcripts, and per-run receipts. The manifest records the profile schema, runner versions, concurrency, wall-clock limits, and any configured model-step caps. Wall time remains a secondary metric when runners use different caps.

## Isolation and context audit

Every agent and judge runs in its own mode-`0700` root with a unique project, home, configuration directory, and temporary directory. The profile's mount script creates the private namespace, exposes only the runtimes and authentication transport that host requires, and blocks its sensitive paths and executables. Shared results are copied out only after the agent and evaluator finish; the blind judge receives a separate root containing only its screenshot.

The committed harness adds Node, Git, and the identical screenshot helper to a private bin. The profile defines the host-specific startup probe and transcript-audit path list. The probe must prove that the run can write its own project but cannot read sibling runs or host-only context before any matrix cell starts. A post-run transcript audit fails and reports every cell whose tool commands touch a configured sensitive path.

Runner commands, flags, expected versions, built-in context, diagnostic markers, and known asymmetries all come from the local profile. The harness applies the same configured policy to every delivery mode and to the blind judge, fails closed on any policy mismatch, retries one failed judge audit, and leaves judge scores null after two failures. Concrete profile values are recorded in the untracked run manifest, not in repository source.

## Fairness review

Print generated task prompts without installing packages or starting agents:

```sh
VIBE_RUNNER_PROFILE="$HOME/.config/astryx/vibe-runner-profile.json" \
pnpm -F @astryxdesign/vibe-tests delivery:run --sample 3 --dry-run
```

The task text and output contract are shared. Only the factual delivery-environment description and required output filename differ. `expectedComponents` and path-selection coaching are never included.

Vanilla's generated `AGENTS.md` is intentionally HTML-only: pinned page setup, templates, components, rules, and use of the locally installed CLI through `npx astryx`. It contains no web-components or React path, source-clone fallback, or global-install instructions. The `web-components` config receives only the pinned Path A2 setup, templates, component rules, and `--framework web-components` commands; it never receives Path A1 or Path B selection coaching.

`react-nobuild` retains a genuine product limitation rather than a harness workaround: the published CLI cannot show component docs when `@astryxdesign/core` is loaded only from a CDN and is not installed locally. Reports label this finding explicitly.

The adoption regression tests cover real React/Vanilla output plus pinned web-component upgrades. Real React and Vanilla TopNav, Banner, Card, TextInput and Layout/Stack fixtures must score within five percentage points, and the raw button inside a layout wrapper must remain unadopted. The web-component cases require equivalent generated `ax-*` light DOM to stay within five points of Vanilla, invented `ax-*` tags to earn no credit, Theme/Card hosts not to hide hand-rolled controls, and non-semantic Text/Badge/Divider hosts not to pad either the denominator or score.

## Pins

Override delivery inputs for a later branch snapshot without editing the harness:

```sh
VIBE_RUNNER_PROFILE="$HOME/.config/astryx/vibe-runner-profile.json" \
pnpm -F @astryxdesign/vibe-tests delivery:run \
  --vanilla-cdn-ref <commit> \
  --vanilla-tarball-url <public-tarball-url> \
  --react-version <published-version>
```

The defaults match the pins documented by this branch's Vanilla Astryx `llms.txt`.
