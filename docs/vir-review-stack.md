# Three-patch PrettyM review

Branch: `feat/vir-prettym-site-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `1622455`: Lean segment formatter, VIR dependency/resource wiring,
   one-shot bootstrap and typed JavaScript call adapter.
2. `30ecce2`: delete the handwritten JavaScript layout implementation and route
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

Executed source: `a92d77b736ac42b6f186690bbe927f051f867fc3`.
All production/test files in this regrouped candidate are byte-identical to that
source. The forSite adoption deliberately selects the public helper below and
removes the entire 49-line VirResourceSite adapter and generic client tests.

Affected native build (751 jobs), ordinary publication tests and all 46 filename/
namespace checks pass. Complete rendered output matches the preceding candidate
byte-for-byte: all 113 production files, including loader URLs and manifests.
Root/nested output matches four envelopes and all 28 payloads; runtime and v2
program packs are unchanged. All 12 focused Chromium/Firefox/static checks pass,
including actual typed calls at root/nested, full text/tags/DOM associations,
numeric rejection/recovery and proof-panel reflow.

Formatter, numeric conversion, one-shot lifetime and JavaScript assets/tests
are unchanged from the qualified numeric-delegation checkpoint. Its broader
7-native/43-Node/36-browser results cover those unchanged files and were not
rerun as a new campaign. Intermediate commits are not separately qualified.

[Immutable commands, complete output inventory and retained logs](https://github.com/ejgallego/verso-slides/tree/f23c5690a487b4d09ecec1a9e6833b4491adbe04/docs/evidence/site-files)
remain outside this landing diff. Upstream exact-head run
[36989194732](https://github.com/ejgallego/lean-vir/actions/runs/36989194732)
completed with a resource cache-test assertion failure (`3 != 5`). Local consumer
qualification does not resolve that producer CI gate or claim release readiness.

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
