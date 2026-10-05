# Three-patch PrettyM review

Branch: `feat/vir-prettym-minimal-review`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `8e1f5d9`: Lean formatter, VIR dependency/resource wiring, root library carrier,
   one-shot initialization and typed JavaScript call adapter.
2. `829bcad`: delete the handwritten JavaScript layout implementation and route
   panels and lightboxes through shared Lean-backed presentation.
3. Tests, ordinary downstream example, short documentation and the required
   one-line Demo source-location correction for the pinned Verso version.

The final tree has one formatter and the agreed pure Array/v3 result. The first
commit is an intermediate migration step; intermediate commits are not separately
qualified. Budgets and unrelated asset/mobile work remain
[separate followups](vir-followups.md).

## Qualification

Executed source: `4d66d3cffe44338f6c16435737ab4c43fcff9898`. All production and
test files in this regrouped candidate are byte-identical to that source. Only
these short review notes differ. Previous candidate `edf3fdb` is preserved.

Ordinary demo/test-target build passes (757 jobs); a warm independent downstream
deck rebuild passes (743 jobs). Native formatter:8 checks; Node:43 checks;
published Chromium/Firefox/static acceptance:45 checks. Publication, existing
config17 and renderer24 checks, JavaScript typing and bundle coverage pass.
Full segments/tags/DOM bindings/escaping, numeric admission and same-instance
health, reflow, pending creation cancellation and one-shot document lifetime are
covered. Three hosting routes have identical16 resource files and relative URLs;
six manifests/42 payload hashes are verified. Settled warm build preserves four
pack cache/stage snapshots; missing source-stage repair uses normal prerequisites.
The existing writer retains stale files; application output is rendered fresh.
No full anonymous cold-install, mobile, geometry/performance or offline rerun is
claimed. Source/cache dependencies are independently retained in Slides.

[Exact commands, identities and raw results](https://github.com/ejgallego/verso-slides/tree/f2e2ec9659a99bb83d36c02b1cc05ba047d8366b/docs/evidence/simplification)
remain outside this landing diff. Exact-head
[VIR CI37327449728](https://github.com/ejgallego/lean-vir/actions/runs/37327449728)
has four successful jobs. This is upstream CI; no Slides PR, Slides CI, merge or
release is claimed.

Exact VIR: `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`, Lean4.34.0.
Runtime content ID: `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA256: `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID: `6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995`.
Program pack SHA256: `cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace`.
