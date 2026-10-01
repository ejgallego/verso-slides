# Three-patch PrettyM review

Branch: `feat/vir-prettym-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `c806137`: Lean segment formatter, VIR dependency/resource wiring,
   one-shot bootstrap and typed JavaScript call adapter.
2. `075d271`: delete the handwritten JavaScript layout implementation and route
   both panels and lightboxes through shared Lean-backed presentation.
3. Tests, the ordinary downstream example and short integration documentation.

The first commit is an intermediate migration step; the final tree has one
formatter. Intermediate commits have not been separately qualified.

The resource-budget policy has been removed from the first landing and queued
in [the followups](vir-followups.md). The wrapper calls Std.Format.prettyM
directly, retaining the existing Except/v2 result shape for this checkpoint.
The pure-array v3 cleanup is agreed and retained as a separate later migration. The previous bounded
program and its evidence remain on the archival branch, not this landing diff.

## Qualification

Executed source: `71eddc1c15aa74737210f72e6a786913a08329c2`.
All production/test files in this regrouped candidate are byte-identical to that
source. Seven native semantic checks, 43 Node checks, the warm native build
(753 jobs)/publication tests and 36 Chromium/Firefox checks passed. Four
root/nested manifests and all 28 payload hashes were checked. Runtime and v2
program packs remain byte-identical to the preceding fa731b6 checkpoint.
Intermediate migration commits have not been separately qualified.

Numeric values now pass unchanged to VIR's existing Nat/Int validation. Slides
retains compact shape and pixel measurement policy. Rejected requests preserve
active instances and raw diagnostics; failed/disposed instances close formatting.
Tests cover safe numbers, signed indentation, exact decimal/BigInt tags, invalid
numbers, raw Error/null/undefined and active versus terminal document ownership.

[Immutable commands/results and retained initial failures](https://github.com/ejgallego/verso-slides/tree/18519bb9eb07cd87983077c14613266384c8d722/docs/evidence/numeric-input)
remain outside this landing diff. The initial browser run exposed assertions tied
to the former local error code and exception-class closure policy; the final
checks explicitly exercise the chosen status-based recovery. Historical bounded
results qualify only the deferred implementation.

VIR remains `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0.
Runtime content ID:
`832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA-256:
`d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID:
`f8c7b00eb26eb097f7894d13abb2a6198ff827b0fb09deffd3b86cedf475aede`.
Program pack SHA-256:
`85dd8d25261b5da8e807b4d373dd5db885a5b24480c24d1310525895ad308c3f`.

No new cold-install or CI result is claimed. Historical qualification remains
scoped to its recorded source. Generic mobile
panel restoration, general asset filename validation, output CLI, directory
assets and managed builds remain separate followups after the first patch lands.
