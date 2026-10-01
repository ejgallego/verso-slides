# Three-patch PrettyM review

Branch: `feat/vir-prettym-minimal-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `111c505`: Lean segment formatter, VIR dependency/resource wiring,
   one-shot bootstrap and typed JavaScript call adapter.
2. `989c12a`: delete the handwritten JavaScript layout implementation and route
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

The v3 result migration regenerates the program pack. Fresh native/browser
qualification is required; the older v2 results remain historical. Raw logs
stay outside this landing diff.

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
