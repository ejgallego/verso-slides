# VIR formatter integration checklist

Slides owns application policy, presentation, lifecycle UX, publication,
dependency pins and downstream acceptance. Module owns VIR acquisition,
validation and runtime contracts. Production requires Lean formatting executed
by mandatory VIR and one JavaScript measurement/presentation layer.

## Current baseline and credited evidence

The reviewed and pushed Slides baseline is
`51c6d782285845c4c9dee5f2f1852051cdaffede`; its lakefile, manifest and clean
dependency select VIR `47e82e9a483e727431bb004fb64ce76ada739ba9`.
Lean remains 4.34.0 / `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`.
Runtime `401b115e` and program `97b280b7` have their complete identities in
[the bounds checkpoint](vir-prettym-bounds.md). Runtime source is `-`:
qualification used a supplied pack, not anonymous installation.

| Completed checkpoint | Commit / evidence |
| --- | --- |
| Earlier 4.34 candidate | Slides `d68e701` / VIR `970ad3d2`; retained historical supplied-pack acceptance |
| Latest pre-contract supplied-pack adoption | Pin `f582da6`, qualification `9cb9b54` / VIR `0a9abac0`; 7 native + 13 browser checks |
| Unchanged-production successor alignment | Slides `05570da` / VIR `cf816e94`; prior evidence reused for test-only delta |
| Bounded pure Except/v2 and strict creation | Slides `51c6d782` / VIR `47e82e9a`; 101 native, 11 Node and 30 focused Chromium/Firefox checks; [retained summary/logs](evidence/vir-51c6d782/README.md) |
| Upstream exact-head CI | [VIR run 36720794347](https://github.com/ejgallego/lean-vir/actions/runs/36720794347) completed successfully at `47e82e9a`; independently read back for this slice |

The GitHub run query for Slides `51c6d782` returned zero runs; local checks are
not Slides CI. Older 4.35 and path-based qualifications stay separate in history.
The independently retained ABI reference, typed adapter, iterative compact
admission and independent Lean preflight/output reservations are implemented.
Keep the agreed pure `Except FormatError (Array Pretty.Segment)` v2 contract;
no accept-either protocol, runtime-derived expectation or JSON call protocol.

## Focused cleanup-reporting slice

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

## Ordered remaining work

| Item | Owner | Current status / next action |
| --- | --- | --- |
| 1 Cleanup reporting | Slides | Fixed in this slice; review before the next implementation item. Node reproducer covers Error/null/undefined, arbitrary rejection and reporting failures. |
| 2 Loading, failure, explicit retry | Slides | Next unmet application item. Own each attempt, cancellation/generation checks, ready disposal, selected-document rendering and explicit retry; static navigation stays usable. Test reversed completion order and failures. Existing pending signal/disposal/bfcache evidence remains credited. |
| 3 Mandatory-VIR consolidation | Slides | Remove `--pixel-pretty`, `Config.virPrettyM` selection and handwritten JS layout. Consolidate measurement, annotations/classes/bindings/escaping/interaction/reflow without a permanent fallback or backend abstraction. These existing selectors/copies are superseded work. |
| 4 Validated publication plan | Slides | Replace repeated full validation with one reusable plan. Preserve namespace/casing constraints; test failure/stale files and measure actual pack/warm-build costs. Current stage/remove/rename writer is single-writer and nontransactional. |
| 5 Durable exact acquisition | VIR Module; Slides acceptance | Release blocker: source remains `-`. VIR supplies durable exact source; Slides qualifies fresh ordinary downstream builds and separate cold/warm offline behavior. No private loader, validator or manual build workaround. |
| Generic prefix casing / checked-helper clarification | VIR Module | Upstream-owned followups. Minimal lexical mixed-prefix reproducer was retained at `0a9abac0`; do not infer successor implementation or native/platform qualification. Adopt only an explicit source/artifact handoff. |
| Final exact-pair acceptance | Slides integration lead | Pending distribution/product seams. Include downstream/nested publication, native/browser semantics and annotations, narrow/Unicode/font/theme/resize geometry, lifecycle/retry, repeated calls and retention/performance. Normalized text does not qualify geometry. |

No upstream API expansion, decision, pin update or runtime pack is required for
this cleanup fix. It changes the emitted application bootstrap; the runtime and
Lean program bytes remain unchanged. Targeted fresh checks qualify that change;
historical full campaigns are not relabelled as fresh results.

Review branch pushes are authorized; PR creation, merge, force-push, branch
retirement and releases are not. Stop after this focused slice for review.
The [earlier proposal correspondence](history/vir-creation-contract-review.md)
is retained separately; current work follows the mandatory shared plan.
