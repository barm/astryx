---
'@astryxdesign/cli': minor
---

[breaking] Five commands refuse silently ignored option pairs.

- incompatible-fix `IFIX-0005` / cleanup `CLN-0011` — silent option-pair ignores in gap-report, layout, init, upgrade, template

AST-042 FR5 requires every option pair to compose, refuse, or be prevented.
Each silent ignore is now a typed refusal: ERR_INVALID_ARGUMENT, exit 1, naming
the conflicting options.

@josephfarina
