# VIR formatter integration checklist

Slides owns this application checklist. Module owns VIR's resource and execution
contracts. This checklist follows the canonical production direction and the
shared implementation plan at
`/home/egallego/Downloads/vir-verso-slides-shared-implementation-plan.md`
(SHA-256 `03b35dc3e4218afd7cc7465244da8ad7fc1dd550c1f97c13caa6c25065c4417f`).

## Immutable adoption checkpoints

| Checkpoint | Slides | VIR | Runtime content ID | Qualification |
| --- | --- | --- | --- | --- |
| Historical 4.34 candidate | `d68e701964f7602454019bc026f9fabdf83b9786` | `970ad3d27b7daf82cd5bfe2e4d53251037cd7b87` | `5b58adf465c88e5aa9fac9300d42d7a3b33789557d2323c53e7fb8612741c70e` | Supplied-pack site/browser acceptance; retained in history |
| Executed adoption acceptance | `9cb9b54270abc7dd737621cde72eaf1d258f5f95` (pin change `f582da67372a150d358f47256fa939aa6f60f2a5`) | `0a9abac0e1245ddb3752a0d4dccef30d28c39621` | `ff7b5a61fd6558e7f4e828e460f3aed033803a84ef599073c6cfe44af85e2ba3` | Seven native checks; 13 site/browser checks; supplied pack |
| Final test-only source alignment | `05570da` | `cf816e94d3a5207e3a9d6c1e0c4d312a7845bfb9` | Same `ff7b5a61…` artifact | Reuses the executed acceptance above; no native/browser rerun |

VIR `cf816e94` is the direct successor of `0a9abac0`. Its complete diff is
three added lines in `tests/packages/lake-facets.sh`, explicitly building the
standalone generator used only by the test's independent comparison. No
production blob, runtime/API, compatibility or pack-lock change occurred.
At that checkpoint, source pin, manifests and root/downstream dependency
checkouts selected that successor consistently. The canonical successor handoff and upstream retained
red/green cold-facet evidence were read; that campaign was not rerun by Slides.
Fresh successor CI is not claimed. All acceptance/reproducer attribution to
`0a9abac0` below records where those checks were actually executed.

Both 4.34 checkpoints use Lean revision
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`. The separate historical 4.35 demo
retains its own revision, runtime and evidence. Runtime acquisition for both the historical and strict
creation pins selects available-only source `-`; anonymous cold installation
has its own release gate.

## Required production shape

- [x] Lean owns layout through `Std.Format.prettyM`; VIR executes the exported
  Slides wrapper through the direct host ABI.
- [x] Ordinary builds prepare the program and resource carrier through owning
  libraries. The native renderer publishes compiled resource values.
- [ ] Make VIR mandatory: remove the production `--pixel-pretty` switch,
  `Config.virPrettyM` selection and JavaScript layout implementation. The pixel
  comparison in this adoption is temporary evidence. Its historical revision
  supplies future reference evidence after the production implementation is removed.
- [ ] Consolidate DOM measurement, annotation/HTML presentation and interaction
  into one browser layer. Keep one typed formatter adapter and no optional
  formatter backend abstraction.
- [x] Bound input conversion and Lean layout work; qualify pure Except/v2 and
  width/indentation/error policy. See [bounds and evidence](vir-prettym-bounds.md).
- [ ] Own loading, visible failure, explicit retry, pending-load invalidation,
  disposal and stale-completion suppression in Slides.
- [ ] Plan publication before writes, preserve the reserved resource namespace,
  and document the existing single-writer/nontransactional site limitation.
- [ ] Complete semantic, negative, lifecycle and visual acceptance for the
  production adapter, including independent downstream examples.

## Current strict-creation consumer checkpoint

Explicit adoption `VIR-SLIDES-STRICT-CREATION-ADOPTION-20260930-001` selects local
VIR `47e82e9a483e727431bb004fb64ce76ada739ba9` and supplied pack `401b115e`.
The dirty work on Slides `5e3c5207` is preserved as the bounded pure Except/v2
implementation. The published bootstrap supplies an independent complete ABI
reference and pending-creation signal; exact consumer qualification is recorded
in [bounds and evidence](vir-prettym-bounds.md).

The root pin, manifest and dependency checkout agree. The maintainer-authorized PR207 update publishes the same `47e82e9a` source;
fresh upstream CI is pending. No source/artifact change or repeated qualification
was needed for publication. The old optional
pixel selector/duplicate presentation remain applicable findings. Supplied-pack
checks do not close anonymous acquisition, final UX or mandatory consolidation.

The correspondence below records the contract decisions preceding implementation.
Current completed status supersedes its historical pending-implementation labels.

## Shared-contract review correspondence

The existing agreed canary exports role `formatSegments`, interface ID
`verso-slides-format-segments-hostabi-v1`, and
`Std.Format → Nat → Nat → Array Pretty.Segment`. The resource compatibility
record is exactly `{leanRevision, virVersion}`. These were the contracts used by
the historical `0a9abac0` adoption; the items below are requirements for review, not new APIs.

| Consumer requirement | Current boundary | Review decision needed |
| --- | --- | --- |
| Exact runtime acquisition | Verified supplied pack; available-only lock | VIR release owner supplies a durable anonymous source with the selected identity. Slides qualifies a fresh unseeded build separately. |
| Check callable interface before formatting | Recipe verifies the role/declaration; current loader has no consumer expectation option | Revised agreed proposal: optional `expectedExports` with exact declaration, interface ID and existing ABI argument/result/effect representations checked before instantiation. Independent reviewed reference belongs to Slides; implementation/handoff pending. |
| Cancel an obsolete pending load | Slides can invalidate a generation and dispose a late success; current loader has no caller cancellation option | Revised agreed proposal: optional pending-creation `signal`; explicit disposal after resolution. Primary cancellation remains `AbortError` even when cleanup throws, with own readonly `cleanupError` retaining secondary evidence. Implementation/handoff pending; generation checks remain required. |
| Bounded formatter failure | Current canary returns an array and has no formatter-specific failure result | Agreed migration: pure `Except FormatError (Array Pretty.Segment)` under `verso-slides-format-segments-hostabi-v2`, retaining role/declaration and three inputs. Application categories/budgets and exact ABI qualification remain pending. |

### Agreed creation contract (now implemented and consumed)

Accepted the revised `build/SLIDES-STRICT-CONTRACT-PROPOSAL-20260930.md` from
VIR's resource-abi4 worktree (SHA-256
`bb6cacc56bfad5e29e0dda007ad621551fa1a506783a45d368fa3af04aab72e5`).
It supersedes the preliminary ID-only map and AggregateError decisions recorded
in Slides `c9481d2`; neither was implemented. The generic creation proposal adds
`expectedExports?: Readonly<Record<string, ExpectedExport>>` and
`signal?: AbortSignal` to the existing two URL inputs. An expected export holds
`declaration`, `interfaceId`, and `signature: {args, result, effect}` using the
current existing interface type/effect representation, including recursive,
constructor, field and layout facts. There is no `expectedInterfaces` alias.
Malformed/partial expectations reject before I/O; snapshot validated complete
own entries before awaits. Extra program roles are allowed.

Check required role, exact declaration and semantic ID against admitted resource
metadata, then compare ordered argument types/count, result and effect against
the actual validated root callable ABI. Preserve exact binding, alias/dependency
exclusion and existing integrity/compatibility/native-layout checks. Mismatch is
a `program-validation` creation error before instantiation/Lean initialization.
Descriptor mismatches can precede payload acquisition; ABI checks need verified
program bytes. Object-key order and parameter display names are irrelevant;
constructor/field/argument order and representation facts are significant.

Slides owns a reviewed reference constant captured from authoritative interface
data alongside its typed adapter/tests. Do not derive it from the just-loaded
program or discover producer paths at application runtime. Reuse existing format
authority and marshaller; add no second grammar or generator framework. Compiler
layout changes may need deliberate reference updates. Independent ABI agreement
still does not prove formatting semantics; native/browser oracle tests remain.

Preserve readonly `Program.status` and explicit idempotent terminal disposal.
The signal owns pending creation only; final abort check and listener removal
define handoff without an intervening await. Later abort does not own the result
or interrupt synchronous calls. Remove timers/listeners on all exits and detach
references even when cleanup throws. Cancellation retains primary name
`AbortError` (no DOMException-instance promise), with original abort reason as
cause. If cleanup throws, attach an own readonly `cleanupError` holding the
untouched secondary value, even `undefined` or `null`; check property presence,
not truthiness. Slides reports this secondary failure even for an obsolete mount.
Non-cancellation creation failures likewise retain primary phase/cause and any
own cleanup evidence. Later abort cannot overwrite an already classified failure.
Acquisition timeout is `TimeoutError`, distinct from caller cancellation.
Resolved explicit disposal still propagates its ordinary cleanup error after
terminal detachment. Creation wrappers do not alter call/IO/fatal/quarantine
semantics and do not inspect/stringify arbitrary cause or cleanup values.

Pure Except/v2 was separately explicitly agreed in
`SLIDES-VIR-RESOURCE-API-AND-V2-AGREED-20260930-001`; the revised creation proposal
does not revoke that result-migration decision. The v2 formatter remains pure
and uses the existing host ABI. Finite application
errors, input admission, width policy and construction limits belong to Slides.
Budget rejection must leave the instance usable. Do not accept both protocol
IDs, guess the result shape, truncate output or substitute an algorithm. Existing
v1 source/artifacts remain historical evidence. Compile/inspect the exact v2
signature and compare native/browser results before calling it qualified.

The proposal was absent from `cf816e94` / `ff7b5a61`; VIR supplied exact
`47e82e9a` / `401b115e` with focused checks and coordinator-authorized adoption.
The consumer checkpoint above now exercises it; loader JS changes the
runtime content identity. Slides v2 separately changes its program identity.
Coordinator retains implementation sequencing and publication decisions.

Slides proposes the following application limits as a starting point for review,
using the historical canary's bounds where the units still apply: 10,000 format
nodes, depth 128, width/effective indentation at most 4,096 columns, and 1 MiB
of input/output text. Segment count and total tag entries need their own bounds
because the direct result has no serialized JSON-size envelope. Compact numeric
fields must be exact before conversion to decimal ABI scalars. Define zero-width,
negative nesting, Unicode column measurement and oversized-result behavior in
the typed adapter and Lean tests. The initial proposals were not implemented by that pin
update; the fixed policy now bounds input to 64 KiB, text nodes to 16 KiB,
output to 1 MiB, segments to 10,000 and aggregate tag entries to 65,536. The old JSON-protocol boundary negatives
qualify their historical pair only.

Retry creates a fresh program after explicit user action and disposes the prior
instance. It does not replay a failed formatting call automatically. Failed or
obsolete attempts cannot replace the current view or leave a usable stale facade.

## Change and review order

Follow the shared plan's A–E checkpoints; preparation for independent items can
proceed while an upstream gate is pending. Supplied-pack adoption completes the
Slides baseline portion of A. B remains the earliest unmet shared checkpoint.

| Shared-plan step | Actual status and owner |
| --- | --- |
| 1 Baseline/CI alignment (A) | Slides pin mismatch resolved in `f582da6`; supplied-pack acceptance in `9cb9b54`. VIR's historical source-inventory regression was fixed in `8d1facd`; the exact named Node test passes locally at `0a9abac0` (1 passed). This is not a claim about full public CI. |
| 2 Mandatory acquisition (B) | Pending VIR durable anonymous source. Explicit supplied-pack acquisition and ordinary root/downstream builds pass. An empty-cache public acquisition probe rejects with `RESOURCE_OFFLINE_MISS` and the exact required content ID; it is not a fresh anonymous deck build. Slides owns downstream qualification after a usable source handoff. |
| 3 Formatter bounds (B) | Implemented and locally qualified: iterative compact admission, independent Lean preflight/output reservations, finite errors and pure Except/v2. 101 native checks plus browser same-wrapper bounds/recovery. Broader realistic goal sizing/performance remains open. |
| 4 Portable paths (B) | Generic rule belongs to VIR. Current JS `validateDescriptor` accepts `Assets/a.js` and `assets/b.js`; a minimal lexical regression reproduces the missing rejection at `0a9abac0`. Native source has the same gap; native/case-insensitive-platform execution has not been claimed. Slides reserves exact `lib/vir`/`lib/.vir-stage` spellings; its casing rules still need regression/review. |
| 5 Consumer contract/typed adapter (C) | Exact `47e82e9a` / `401b115e` adopted; Slides independent existing-format ABI reference embedded and checked by the loader. Typed bounded v2 adapter and native/browser oracle qualified. ABI equality is supported separately by semantic corpus evidence. |
| 6 Cancellation/loading UX (C) | Pending signal consumed on terminal pagehide; strict rejection, acquisition/real-instance cancellation, late completion and raw secondary cleanup reporting qualified. No stale facade on actual bootstrap cancellation. Visible loading/failure/retry UX and broader overlapping UI attempts remain pending. |
| 7 One presentation layer (D) | Pending Slides. Production `--pixel-pretty`/`Config.virPrettyM` selectors and the two JS presentation copies are superseded architecture. Remove them after the bounded typed adapter/lifecycle seam is settled. |
| 8 Native guarantees (D) | VIR `8d1facd` added inner interface/compiler compatibility checks, included in actual successful program builds. Format-authority/precondition clarification remains VIR review work; do not infer completion from downstream happy-path builds. |
| 9 Publication/costs (D) | Pending Slides. Source still validates the same resource set through `configureVirAssets`/`describe` and `write`/`describe`/`bundles`. No real-cost claim; next publication patch needs a single validated plan, output/failure regressions and measured validation passes/costs. |
| 10 Final mandatory qualification (E) | Pending. Current native/root/nested/panel checks credit completed work, with limited pixel-content comparison. The current narrow gate qualifies fixed budgets and pending creation cancellation; final classes/bindings/visual layout, retry, dynamic retention/performance and anonymous cold installation remain open. |

## Next Slides patch and handoff

The bounded v2 slice and authorized strict-creation consumer gate are complete
locally; exact identities, executed tests and remaining limits are retained in
[bounds and evidence](vir-prettym-bounds.md). Return this checkpoint to the
integration coordinator before upstream publication. No VIR source change or
new shared API decision is required by this slice.

The next Slides product seam is explicit loading/failure/retry ownership on the
agreed API, followed by retiring the superseded pixel selector and consolidating
measurement/presentation. Anonymous acquisition remains the earliest shared
release gate and needs a durable-source handoff from VIR. Portable paths,
publication planning, final visual/retention/performance and independent downstream
qualification remain open. No publication, merge or branch cleanup is authorized
by this checkpoint.
