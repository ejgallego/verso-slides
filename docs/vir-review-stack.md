# Three-patch PrettyM review

Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. Lean formatter and VIR dependency/resource wiring, embedded by the existing
   asset library; one-shot initialization and typed JavaScript adapter.
2. Delete the handwritten JavaScript layout implementation and use shared
   Lean-backed panel/lightbox presentation.
3. Tests, ordinary downstream example, short documentation and the required
   one-line Demo source-location correction for the pinned Verso version.

Intermediate commits are not independently qualified. The final tree has one
formatter and the pure Array/v3 result. Budgets and unrelated asset/mobile work
remain [separate followups](vir-followups.md).

## Build simplification

The existing `VersoSlides` library owns the formatter, and the existing
`VersoSlidesVendored` library embeds its program pack with the browser assets.
There are no new libraries or carrier modules. Only the asset library has the
`virResourcePack` prerequisite. VIR still owns preparation and acquisition;
applications use ordinary `lake build` and `slidesMain` without resource setup.

Default package and warm transitive default-deck builds pass (741 jobs each).
Native formatter:8 checks and ordinary publication tests pass. Settled default
warm build preserves four cache/stage pack snapshots; withholding only the asset
library's source stage is repaired by default build, preserving other pack stats.
Fresh root113 and downstream112 production files are byte-identical to the
previously qualified simplification output. The exact program/runtime packs,
relative loader URLs and generated ABI are unchanged.

The preceding Node43 and published Chromium/Firefox/static45 checks remain
historical executed evidence on source `4d66d3cffe44338f6c16435737ab4c43fcff9898`:
[retained results](https://github.com/ejgallego/verso-slides/tree/f2e2ec9659a99bb83d36c02b1cc05ba047d8366b/docs/evidence/simplification).
Those suites were not rerun for this build-only change. No full anonymous
cold-install, mobile, geometry/performance or offline rerun is claimed. The
existing writer retains stale files; fresh output is used for comparison.

Exact VIR: `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`, Lean4.34.0.
Runtime content ID: `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA256: `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID: `6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995`.
Program pack SHA256: `cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace`.
