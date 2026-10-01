# VIR formatter integration checklist

Slides owns application policy, presentation, lifecycle UX, publication,
dependency pins and downstream acceptance. Module owns VIR acquisition,
validation and runtime contracts. Production requires Lean formatting executed
by mandatory VIR and one JavaScript measurement/presentation layer.

## Current baseline and credited evidence

The current adoption is Slides `ea079cd7bff00f986e5f4a7edcd2e74aafb59bda`;
lakefile, root/downstream manifests and clean dependency checkouts select
VIR `af3052cac2740f41bd701de3646df348b7e2dbb3`.
Lean remains 4.34.0 / `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`.
Runtime `832ab095` and unchanged program `97b280b7` have their full identities in
[the adoption evidence](evidence/publication-adoption/README.md). Runtime source is `-`:
qualification used a supplied pack, not anonymous installation.

Publication plan `d0aee5e0f028b7b799857709766faa59ca7526f2` was separately
authorized and committed before the narrower successor-qualification handoff.
Adoption preserves it and the accepted bootstrap correction `19bf157f`,
consolidation `89e0314c` and historical `781cab8` / VIR `47e82e9a` / `401b115e`
pair. The separate evidence/documentation successor changes no production bytes.

| Completed checkpoint | Commit / evidence |
| --- | --- |
| Earlier 4.34 candidate | Slides `d68e701` / VIR `970ad3d2`; retained historical supplied-pack acceptance |
| Latest pre-contract supplied-pack adoption | Pin `f582da6`, qualification `9cb9b54` / VIR `0a9abac0`; 7 native + 13 browser checks |
| Unchanged-production successor alignment | Slides `05570da` / VIR `cf816e94`; prior evidence reused for test-only delta |
| Bounded pure Except/v2 and strict creation | Slides `51c6d782` / VIR `47e82e9a`; 101 native, 11 Node and 30 focused Chromium/Firefox checks; [retained summary/logs](evidence/vir-51c6d782/README.md) |
| Cleanup reporting | Slides `c1bcc76c`; 20 Node, 6 focused browser checks and targeted build; [retained evidence](evidence/bootstrap-cleanup/README.md). Module's bounded source/evidence review found no shared-contract blocker; it did not rerun tests. |
| Loading/failure/explicit retry | Slides `481ea5c`; 35 Node, 16 focused Chromium/Firefox, both typechecks and targeted build; [retained evidence](evidence/formatter-lifecycle/README.md). |
| Mandatory-VIR consolidation | Slides `89e0314c`; 46 Node, 101 native formatter, 24 native rendering and 105 Chromium/Firefox checks, both typechecks and targeted warm build; [retained evidence](evidence/mandatory-formatter/README.md). Module reviewed `89e0314c` / `e2b34da` with no new renderer blocker and verified all 34 source/evidence ledger hashes; owner-run campaigns were inspected, not rerun. |
| Loading-notification reentrancy | Slides `19bf157f`; four focused regressions fail against `e2b34da`, then 50 Node / 22 focused Chromium/Firefox checks, both typechecks and targeted warm build pass; [retained evidence](evidence/lifecycle-notification/README.md). Module accepted `19bf157f` / `13dc7d0`, independently verified 17 source/evidence hashes and executed its formerly failing controlled VM probe successfully; owner-run campaigns were not rerun. |
| Validated publication plan | Slides `d0aee5e`; four casing negatives red on prior code, 32 configuration cases and publication/installation tests pass. All 115 emitted files byte-identical on the unchanged pair. Five local render samples: median 262 → 172 ms; warm builds essentially unchanged. [Evidence and failure contract](evidence/publication-adoption/README.md). |
| Exact successor adoption | Slides `ea079cd` / VIR `af3052c`, supplied runtime `832ab095`, program `97b280b7`: owning-library root/downstream builds, 46 Chromium/Firefox checks, 50 Node + one emitted ABI-reference check, 24 native render cases and publication/installation checks pass. Native corpora and program payloads unchanged; no broad formatter campaign rerun. [Exact evidence](evidence/publication-adoption/README.md). |
| Upstream exact-head CI | [VIR run 36720794347](https://github.com/ejgallego/lean-vir/actions/runs/36720794347) completed successfully at `47e82e9a`; independently read back during the cleanup slice, not rerun here |

The GitHub run query for Slides `51c6d782` returned zero runs; local checks are
not Slides CI. Older 4.35 and path-based qualifications stay separate in history.
The independently retained ABI reference, typed adapter, iterative compact
admission and independent Lean preflight/output reservations are implemented.
Keep the agreed pure `Except FormatError (Array Pretty.Segment)` v2 contract;
no accept-either protocol, runtime-derived expectation or JSON call protocol.

## Credited cleanup-reporting slice

Reproduced the late-success cleanup defect against the current `51c6d782`
bootstrap before editing it: `Error` lost its cleanup evidence; `null` and
`undefined` also caused a secondary unhandled `TypeError`. The controlled Node
fixture substitutes module acquisition and runtime completion, not a browser
race or a memory-leak test.

This slice preserves the stale-page error and attaches the untouched disposal
failure as an own readonly `cleanupError`. Reports keep the primary wrapper,
context and raw cause/secondary values. Nullish and arbitrary rejection values
are admitted safely by reporting; failing diagnostic/alert sinks cannot create
an unobserved rejection. Disposed-page results never install a facade or alert.
[Regression evidence and scope](evidence/bootstrap-cleanup/README.md).

## Credited lifecycle slice

One page-owned attempt supplies its pending controller and resolved instance.
Retry detaches the old attempt before cancellation/disposal, and both completion
paths check ownership. Loading/failure states and a retry button leave static
navigation/selection usable. Readiness renders the current selection; clearing
selection clears its reflow source. Terminal pagehide releases ownership once;
persisted pagehide keeps it. Raw primary/cause/cleanup diagnostics are retained,
including throwing disposal and reporting sinks. No arbitrary runtime calls are
replayed; pending cancellation does not preempt synchronous Lean execution.

The loading-notification review reproduced one public-promise ordering defect
against the consolidation head. Corrected at `19bf157f`: publish and observe
the current promise before notifying synchronous retry/pagehide listeners.
Four controlled Node negatives and six real-runtime browser notification checks
cover this correction; prior evidence is retained as historical qualification.

Module's consolidation review targets the earlier `e2b34da` source and reproduces
the same P2 there. Its subsequent loading-notification acceptance reviews the
separate `19bf157f` correction and immutable red/green evidence at `13dc7d0`.
P2 is resolved and consolidation is accepted for its recorded local scope.
Module's new controlled VM probe is distinct from the owner's retained browser
checks. No consolidation redo or broad rerun is required. The later user request
explicitly authorized the publication plan and reaching successor adoption;
their two implementation commits remain separate.

## Credited consolidation slice

Normal production has one VIR formatting path: `--pixel-pretty`,
`Config.virPrettyM` and the handwritten JavaScript layout are removed.
Panels and lightboxes share measurement, goal structure, annotations, escaping,
binding selection and reflow in `web-lib/panel/pretty.js`. Full exact tag stacks
are retained in DOM attributes; the nearest registered annotation supplies the
visible class/binding. Rejected rich formatting reports a deliberate failure
with raw diagnostics. Static content/navigation remains usable.

Fresh checks use complete native segment results and exact DOM text, tags,
classes and bindings. Font notifications and resize reflow are covered; exhaustive
geometry and delayed font-download qualification remain open. Historical pixel
comparison evidence remains in history. No fallback or backend abstraction remains.

## Current publication and adoption checkpoint

`VirResourceSite.prepare` validates once and retains manifests/owned bytes plus
loader URLs in a plan. The renderer reuses that plan for bootstrap and writing;
ordinary asset collection also runs once. Native embedding and browser integrity
remain separate trust boundaries. Resource/staging namespaces reject portable
casing and separator aliases, including generated directory destinations.

Directory type preflight rejects files and symlinks before mutating output.
Staging failures preserve installed resources; stale stage/installed files are
removed on successful replacement. Installed resources are still removed before
final rename, so failure/interruption there can leave them absent. Other site
files are written separately: publication remains single-writer/nontransactional.
No speculative cache was added.

Adoption uses only the agreed public Embed import, exact pin/manifests and matching
supplied bytes. Role, complete independent ABI, wrapper policy, presentation and
accepted lifecycle are unchanged. Browser creation tests execute the actual new
loader, including conflicting directory spelling rejected before payload/instance
creation. Relocated native rendering succeeds with the consumer program source
pack withheld, using only ordinary declared image inputs; its bytes match.

## Ordered remaining work

| Item | Owner | Current status / next action |
| --- | --- | --- |
| 1 Cleanup reporting | Slides | Complete at `c1bcc76c`; bounded upstream review found no shared-contract blocker. |
| 2 Loading, failure, explicit retry | Slides | Implemented at `481ea5c`, loading-notification ordering corrected at `19bf157f`; Module accepted `13dc7d0` and closed P2. |
| 3 Mandatory-VIR consolidation | Slides | Implemented and locally qualified at `89e0314c`; accepted for recorded local scope after the bounded P2 correction review. One shared presentation layer and mandatory formatter remain intact. Final release gates remain open. |
| 4 Validated publication plan | Slides | Implemented/locally qualified at `d0aee5e`, ready for bounded review. One reusable plan; failure/stale files, portable namespace aliases and actual pack costs checked. Writer remains single-writer/nontransactional. |
| 5 Durable exact acquisition | VIR Module; Slides acceptance | Release blocker: source remains `-`. VIR supplies durable exact source; Slides qualifies fresh ordinary downstream builds and separate cold/warm offline behavior. No private loader, validator or manual build workaround. |
| Generic prefix casing / checked-helper clarification | VIR Module | Source fixes at `bbd3ed30` / `0f720625`, now included in deliberately adopted public `af3052c` / `832ab095`. Focused consumer admission checks pass. Broad producer campaigns were not rerun. No fresh CI query or anonymous distribution claim. |
| Native carrier import simplification | VIR Module; Slides adoption | Agreed single `public import Vir.Resources.Embed` compiled through ordinary owning-library builds at `ea079cd` / `af3052c`. Supplied pack verified exactly; relocated native consumption passed. Historical carrier/pair remain in history. |
| Final exact-pair acceptance | Slides integration lead | Pending distribution/product seams. Include downstream/nested publication, native/browser semantics and annotations, narrow/Unicode/font/theme/resize geometry, lifecycle/retry, repeated calls and retention/performance. Normalized text does not qualify geometry. |

No new upstream API decision or producer writes were required. The adopted
runtime loader bytes change (`401` → `832`), with exact supplied-pack qualification;
Wasm/program/presentation/bootstrap bytes remain unchanged. Fresh focused checks
cover this pair; historical full campaigns remain credited as historical evidence.

Review branch pushes are authorized; PR creation, merge, force-push, branch
retirement and releases are not. Stop at this local publication/adoption checkpoint
for review; durable anonymous acquisition and final product gates remain open.
The [earlier proposal correspondence](history/vir-creation-contract-review.md)
is retained separately; current work follows the mandatory shared plan.
