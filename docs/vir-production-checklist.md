# VIR formatter integration checklist

Slides owns application policy, presentation, lifecycle UX, publication,
dependency pins and downstream acceptance. Module owns VIR acquisition,
validation and runtime contracts. Production requires Lean formatting executed
by mandatory VIR and one JavaScript measurement/presentation layer.

## Current baseline and credited evidence

The ABI-qualified Slides baseline is
`51c6d782285845c4c9dee5f2f1852051cdaffede`; its lakefile, manifest and clean
dependency select VIR `47e82e9a483e727431bb004fb64ce76ada739ba9`.
Lean remains 4.34.0 / `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`.
Runtime `401b115e` and program `97b280b7` have their complete identities in
[the bounds checkpoint](vir-prettym-bounds.md). Runtime source is `-`:
qualification used a supplied pack, not anonymous installation.

The current lifecycle implementation is Slides
`481ea5cfffef0e125579c1daee6725c75023f372`, following reviewed cleanup
`c1bcc76c8cec8fe6aae5be633ac10ce1983656b2`. Pins and production resources remain
unchanged. Its separate evidence/documentation commit changes no production bytes.

| Completed checkpoint | Commit / evidence |
| --- | --- |
| Earlier 4.34 candidate | Slides `d68e701` / VIR `970ad3d2`; retained historical supplied-pack acceptance |
| Latest pre-contract supplied-pack adoption | Pin `f582da6`, qualification `9cb9b54` / VIR `0a9abac0`; 7 native + 13 browser checks |
| Unchanged-production successor alignment | Slides `05570da` / VIR `cf816e94`; prior evidence reused for test-only delta |
| Bounded pure Except/v2 and strict creation | Slides `51c6d782` / VIR `47e82e9a`; 101 native, 11 Node and 30 focused Chromium/Firefox checks; [retained summary/logs](evidence/vir-51c6d782/README.md) |
| Cleanup reporting | Slides `c1bcc76c`; 20 Node, 6 focused browser checks and targeted build; [retained evidence](evidence/bootstrap-cleanup/README.md). Module's bounded source/evidence review found no shared-contract blocker; it did not rerun tests. |
| Loading/failure/explicit retry | Slides `481ea5c`; 35 Node, 16 focused Chromium/Firefox, both typechecks and targeted build; [retained evidence](evidence/formatter-lifecycle/README.md). Ready for this slice's review. |
| Upstream exact-head CI | [VIR run 36720794347](https://github.com/ejgallego/lean-vir/actions/runs/36720794347) completed successfully at `47e82e9a`; independently read back for this slice |

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

## Current lifecycle slice

One page-owned attempt supplies its pending controller and resolved instance.
Retry detaches the old attempt before cancellation/disposal, and both completion
paths check ownership. Loading/failure states and a retry button leave static
navigation/selection usable. Readiness renders the current selection; clearing
selection clears its reflow source. Terminal pagehide releases ownership once;
persisted pagehide keeps it. Raw primary/cause/cleanup diagnostics are retained,
including throwing disposal and reporting sinks. No arbitrary runtime calls are
replayed; pending cancellation does not preempt synchronous Lean execution.

## Ordered remaining work

| Item | Owner | Current status / next action |
| --- | --- | --- |
| 1 Cleanup reporting | Slides | Complete at `c1bcc76c`; bounded upstream review found no shared-contract blocker. |
| 2 Loading, failure, explicit retry | Slides | Implemented and locally qualified at `481ea5c`; stop for review. Controlled completion/disposal negatives and real browser loading/failure/retry/selection/pagehide checks pass. |
| 3 Mandatory-VIR consolidation | Slides | Next unmet application item. Remove `--pixel-pretty`, `Config.virPrettyM` selection and handwritten JS layout. Consolidate measurement, annotations/classes/bindings/escaping/interaction/reflow without a permanent fallback or backend abstraction. These existing selectors/copies are superseded work. |
| 4 Validated publication plan | Slides | Replace repeated full validation with one reusable plan. Preserve namespace/casing constraints; test failure/stale files and measure actual pack/warm-build costs. Current stage/remove/rename writer is single-writer and nontransactional. |
| 5 Durable exact acquisition | VIR Module; Slides acceptance | Release blocker: source remains `-`. VIR supplies durable exact source; Slides qualifies fresh ordinary downstream builds and separate cold/warm offline behavior. No private loader, validator or manual build workaround. |
| Generic prefix casing / checked-helper clarification | VIR Module | Completed locally at `bbd3ed30` / `0f720625`, reported in their explicit handoffs. Successor runtime `832ab095` remains unadopted; Slides selects `47e82e9a` / `401b115e`. Casing source/pack were inspected; producer tests were not rerun by Slides. Publication/durable source remain gated. |
| Final exact-pair acceptance | Slides integration lead | Pending distribution/product seams. Include downstream/nested publication, native/browser semantics and annotations, narrow/Unicode/font/theme/resize geometry, lifecycle/retry, repeated calls and retention/performance. Normalized text does not qualify geometry. |

No upstream API expansion, decision, pin update or runtime pack is required for
this lifecycle slice. It changes emitted bootstrap/panel JS/CSS; the runtime and
Lean program bytes remain unchanged. Targeted fresh checks qualify those changes;
historical full campaigns are not relabelled as fresh results.

Review branch pushes are authorized; PR creation, merge, force-push, branch
retirement and releases are not. Stop after this lifecycle slice for review.
The [earlier proposal correspondence](history/vir-creation-contract-review.md)
is retained separately; current work follows the mandatory shared plan.
