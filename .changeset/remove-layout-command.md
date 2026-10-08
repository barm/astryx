---
'@astryxdesign/cli': minor
---

[breaking] Remove the `astryx layout` command group (CLN-0006)

Removes the deprecated `astryx layout` command group (`expand`, `check`, `grammar`),
its three response types (`layout.expand`, `layout.check`, `layout.grammar`), and
the programmatic API exports (`layoutExpand`, `layoutCheck`, `layoutGrammar`).
Completes the `CLN-0006` cleanup of `DEP-0006`.

@josephfarina
