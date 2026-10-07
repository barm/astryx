---
'@astryxdesign/cli': minor
---

[breaking] `init --remove-agents` says when there was nothing to remove.

- incompatible-fix `IFIX-0004` / cleanup `CLN-0010` — `data.removed` was always `true` even on a clean project

`data.removed` is now a boolean: true when a managed agent-docs block was found
and removed, false when there was none. The human line says which happened.

@josephfarina
