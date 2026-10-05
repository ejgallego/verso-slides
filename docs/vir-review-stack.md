# Three-patch PrettyM review

Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. Lean segment formatter, VIR dependency/resource wiring, root library carrier,
   one-shot initialization and typed JavaScript call adapter.
2. Delete the handwritten JavaScript layout implementation and route panels and
   lightboxes through shared Lean-backed presentation.
3. Tests, ordinary downstream example, short documentation and the required
   one-line Demo source-location correction for the pinned Verso version.

The final tree has one formatter and the agreed pure Array/v3 result. The first
commit is an intermediate migration step; intermediate commits are not separately
qualified. Budgets and unrelated asset/mobile work remain
[separate followups](vir-followups.md).

## Current qualification

The simplification uses VIR `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`
(PR217), Lean4.34.0, runtime832 and regenerated Array/v3 program65334411.
The preceding carrier candidate and its supplied/public acquisition evidence
remain preserved. This checkpoint changes client/program bytes and owns its
focused tests; it does not claim a new anonymous cold-install campaign.

Native formatter:8 checks; Node adapter/lifetime:43 checks; focused published
Chromium/Firefox/static acceptance:45 checks. Publication, 17 existing config
checks, 24 renderer checks, JavaScript typing and bundle coverage pass. Ordinary
owning-library/demo builds and a warm transitive default-deck rebuild pass.
Application output is rendered fresh; the existing writer retains stale files.
Broader mobile/geometry/performance/offline gates are not rerun here.

Exact-head VIR CI37327449728 has four successful jobs. That is upstream CI;
no Slides PR, Slides CI, merge or release is claimed.
