---
'@astryxdesign/cli': minor
---

[breaking] Validate commands fail when there is nothing to validate.

- incompatible-fix `IFIX-0008` / cleanup `CLN-0014` — doctor integration validate and integration verify exit 0 with no package.json

`doctor integration validate` in a directory with no package.json exited 0 and
said nothing was validated — the "I found no problems" trap. It now exits 1.
`integration verify` with no package.json returned a success envelope with a
`no_package` issue; it now throws ERR_INVALID_ARGUMENT and exits 1.

@josephfarina
