---
'@astryxdesign/cli': minor
---

[breaking] An empty-string argument no longer discards the rest of the command.

- incompatible-fix `IFIX-0003` / cleanup `CLN-0009` — empty-string positional treated as omitted in template, swizzle, discover

`astryx template "" src/zzz.tsx` exited 0, printed the whole template list, and
threw away the write target the user named. `swizzle ""` and `discover ""` listed
the same way. An empty string is falsy, so `if (name)` could not tell `""` from
an argument that was never typed — one space already failed correctly with
ERR_INVALID_ARGUMENT.

`template`, `swizzle` and `discover` now reject an empty positional with
ERR_INVALID_ARGUMENT and exit 1, in both text and `--json`. Omitting the
argument still lists. A positional that the chosen mode ignores stays ignored
when it is empty.

`layout` is deliberately unchanged: its expression can also arrive via `--file`
or stdin.

@josephfarina
