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

The forSite adoption deliberately selects the public helper revision below.
Affected native build (751 jobs), ordinary publication tests and all 46 filename/
namespace checks pass. Complete rendered output matches the preceding candidate
byte-for-byte: all 113 production files, including loader URLs and manifests.
Root/nested output matches four envelopes and all 28 payloads; runtime and v2
program packs are unchanged. Focused actual-loader browser checks are pending.

Formatter, numeric conversion, one-shot lifecycle and all JavaScript assets are
unchanged from the qualified numeric-delegation checkpoint. Its broader tests
remain historical evidence of those unchanged files, not a fresh campaign.
Raw qualification evidence stays outside the landing diff.

VIR selected: `7d69b9a09b0c946333d1b6358341be251306f161`, Lean 4.34.0.
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
