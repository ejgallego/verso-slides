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
directly, retaining the existing Except/v2 result shape for this checkpoint.
The array-result cleanup is a separate coordination item. The previous bounded
program and its evidence remain on the archival branch, not this landing diff.

## Qualification

Executed source: `141161a5910bc6a3d895dc87a7136c1d31e8c898`.
Seven native semantic checks, 39 Node checks, the warm native build/publication
tests and 32 focused Chromium/Firefox checks passed. Fresh root/nested output
matched four manifests and 28 payloads. The final production files and executable
tests are byte-identical to that source; commit grouping and documentation differ.
Intermediate commits have not been separately qualified.
[Archived commands/results](https://github.com/ejgallego/verso-slides/blob/e6b5315/docs/evidence/budget-deferral/README.md).
Historical 101-check bounds results are coverage of the deferred implementation.
Raw logs remain outside this landing diff.

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
