---
'@astryxdesign/cli': minor
---

[breaking] Refuse invalid input that used to silently succeed.

- incompatible-fix `IFIX-0007` / cleanup `CLN-0013` — template unknown type/package, build invalid type/fractional limit, integration add excess args, component ambiguous error code

`template --list --type bogus` and `--package @nope/x` exited 0 with an empty
list; they now exit 1 with ERR_INVALID_ARGUMENT. `build --type doc` exited 0
with an empty useless result; `doc` is no longer a valid build type (valid:
component, hook, template). `build --limit 2.5` silently truncated to 2; it now
rejects non-integer limits. `integration add` silently dropped extra positional
arguments; it now refuses them. `component()` threw ERR_UNKNOWN_COMPONENT for an
ambiguous multi-package name; it now throws ERR_AMBIGUOUS_COMPONENT, matching
swizzle and gap-report.

@josephfarina
