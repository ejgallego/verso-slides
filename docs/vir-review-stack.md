# Three-patch PrettyM review

Branch: `feat/vir-prettym-v3-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `0b71ce1`: Lean segment formatter, VIR dependency/resource wiring,
   one-shot bootstrap and typed JavaScript call adapter.
2. `c2dd814`: delete the handwritten JavaScript layout implementation and route
   both panels and lightboxes through shared Lean-backed presentation.
3. Tests, the ordinary downstream example and short integration documentation.

The first commit is an intermediate migration step; the final tree has one
formatter. Intermediate commits have not been separately qualified.

The resource-budget policy has been removed from the first landing and queued
in [the followups](vir-followups.md). The wrapper calls Std.Format.prettyM
directly and returns an array under the agreed v3 interface. The former native
error type and JavaScript error-sum handling are removed. The previous bounded
program and its evidence remain on the archival branch, not this landing diff.

## Qualification

Executed source: `bf9bf7f32176030e6e9e295dd9959a850d6c5cb7`.
All production and test files in this regrouped branch are byte-identical to
that source. Local native build (753 jobs), 8 native semantic cases, 39 Node
checks, publication tests and 32 focused Chromium/Firefox checks passed.
Direct typed-array calls cover empty, tagged and nested formats; complete tags,
DOM bindings, escaping, reflow and one-shot lifetime remain covered. Four
root/nested resource envelopes and all 28 payload hashes were verified.

[Immutable qualification evidence](https://github.com/ejgallego/verso-slides/tree/358d5117cc4ff67e525d6e187ce515631a881763/docs/evidence/array-v3)
includes actual generated ABI, identities and raw logs. It remains outside this
landing diff. Earlier v2 evidence is historical and does not qualify v3.

VIR remains `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0.
Runtime content ID:
`832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA-256:
`d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID:
`6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995`.
Program pack SHA-256:
`cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace`.

No new cold-install or CI result is claimed. Historical qualification remains
scoped to its recorded source. Generic mobile
panel restoration, general asset filename validation, output CLI, directory
assets and managed builds remain separate followups after the first patch lands.
