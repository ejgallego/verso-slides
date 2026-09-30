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
| Final test-only source alignment | Successor pin recorded in this document's commit | `cf816e94d3a5207e3a9d6c1e0c4d312a7845bfb9` | Same `ff7b5a61…` artifact | Reuses the executed acceptance above; no native/browser rerun |

VIR `cf816e94` is the direct successor of `0a9abac0`. Its complete diff is
three added lines in `tests/packages/lake-facets.sh`, explicitly building the
standalone generator used only by the test's independent comparison. No
production blob, runtime/API, compatibility or pack-lock change occurred.
Source pin, manifests and root/downstream dependency checkouts select this
successor consistently. The canonical successor handoff and upstream retained
red/green cold-facet evidence were read; that campaign was not rerun by Slides.
Fresh successor CI is not claimed. All acceptance/reproducer attribution to
`0a9abac0` below records where those checks were actually executed.

Both 4.34 checkpoints use Lean revision
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`. The separate historical 4.35 demo
retains its own revision, runtime and evidence. Runtime acquisition for the
current pin still selects available-only source `-`; anonymous cold installation
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
- [ ] Bound input conversion and Lean layout work, and define width, indentation
  and error behavior before changing the formatter call contract.
- [ ] Own loading, visible failure, explicit retry, pending-load invalidation,
  disposal and stale-completion suppression in Slides.
- [ ] Plan publication before writes, preserve the reserved resource namespace,
  and document the existing single-writer/nontransactional site limitation.
- [ ] Complete semantic, negative, lifecycle and visual acceptance for the
  production adapter, including independent downstream examples.

## Shared-contract review checkpoint

The existing agreed canary exports role `formatSegments`, interface ID
`verso-slides-format-segments-hostabi-v1`, and
`Std.Format → Nat → Nat → Array Pretty.Segment`. The resource compatibility
record is exactly `{leanRevision, virVersion}`. These are the contracts used by
the current adoption; the items below are requirements for review, not new APIs.

| Consumer requirement | Current boundary | Review decision needed |
| --- | --- | --- |
| Exact runtime acquisition | Verified supplied pack; available-only lock | VIR release owner supplies a durable anonymous source with the selected identity. Slides qualifies a fresh unseeded build separately. |
| Check callable interface before formatting | Recipe verifies the role/declaration; current loader has no consumer expectation option | Revised agreed proposal: optional `expectedExports` with exact declaration, interface ID and existing ABI argument/result/effect representations checked before instantiation. Independent reviewed reference belongs to Slides; implementation/handoff pending. |
| Cancel an obsolete pending load | Slides can invalidate a generation and dispose a late success; current loader has no caller cancellation option | Revised agreed proposal: optional pending-creation `signal`; explicit disposal after resolution. Primary cancellation remains `AbortError` even when cleanup throws, with own readonly `cleanupError` retaining secondary evidence. Implementation/handoff pending; generation checks remain required. |
| Bounded formatter failure | Current canary returns an array and has no formatter-specific failure result | Agreed migration: pure `Except FormatError (Array Pretty.Segment)` under `verso-slides-format-segments-hostabi-v2`, retaining role/declaration and three inputs. Application categories/budgets and exact ABI qualification remain pending. |

### Agreed proposal, pending implementation

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

The proposal is not shipped in pinned `cf816e94` or runtime `ff7b5a61`.
VIR must supply an immutable implemented source and regenerated matching runtime
artifact with focused checks before consumer adoption; loader JS changes the
runtime content identity. Slides v2 separately changes its program identity.
Coordinator retains implementation sequencing and publication decisions.

Slides proposes the following application limits as a starting point for review,
using the historical canary's bounds where the units still apply: 10,000 format
nodes, depth 128, width/effective indentation at most 4,096 columns, and 1 MiB
of input/output text. Segment count and total tag entries need their own bounds
because the direct result has no serialized JSON-size envelope. Compact numeric
fields must be exact before conversion to decimal ABI scalars. Define zero-width,
negative nesting, Unicode column measurement and oversized-result behavior in
the typed adapter and Lean tests. These proposals are not implemented by the pin
update, and the old JSON-protocol boundary negatives do not qualify this canary.

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
| 3 Formatter bounds (B) | Earliest Slides implementation item. Current direct wrapper and recursive converter have no formatter-specific budgets. Historical JSON bounds qualify their old pair only. Pure Except/v2 migration is agreed; prepare small-budget regressions and settle finite application policy before qualifying the changed signature. |
| 4 Portable paths (B) | Generic rule belongs to VIR. Current JS `validateDescriptor` accepts `Assets/a.js` and `assets/b.js`; a minimal lexical regression reproduces the missing rejection at `0a9abac0`. Native source has the same gap; native/case-insensitive-platform execution has not been claimed. Slides reserves exact `lib/vir`/`lib/.vir-stage` spellings; its casing rules still need regression/review. |
| 5 Consumer contract/typed adapter (C) | Revised expectedExports declaration/ID/actual-ABI contract and pure Except/v2 migration agreed; upstream implementation/artifact, Slides independent reference and typed adapter remain pending. ABI equality is not semantic proof. Width/error policy and exact v2 native/browser qualification remain Slides work. |
| 6 Cancellation/loading UX (C) | Pending-creation signal/lifetime and revised primary-error/own cleanupError contract agreed. Implementation/artifact and Slides loading/failure/retry remain pending. Ready-instance disposal, persisted pagehide and fresh reload pass; this does not cover obsolete acquisition cancellation or all pending-completion races. |
| 7 One presentation layer (D) | Pending Slides. Production `--pixel-pretty`/`Config.virPrettyM` selectors and the two JS presentation copies are superseded architecture. Remove them after the bounded typed adapter/lifecycle seam is settled. |
| 8 Native guarantees (D) | VIR `8d1facd` added inner interface/compiler compatibility checks, included in actual successful program builds. Format-authority/precondition clarification remains VIR review work; do not infer completion from downstream happy-path builds. |
| 9 Publication/costs (D) | Pending Slides. Source still validates the same resource set through `configureVirAssets`/`describe` and `write`/`describe`/`bundles`. No real-cost claim; next publication patch needs a single validated plan, output/failure regressions and measured validation passes/costs. |
| 10 Final mandatory qualification (E) | Pending. Current native/root/nested/panel checks credit completed work, with limited pixel-content comparison. They do not qualify final budgets, classes/bindings/layout, cancellation/retry, dynamic retention/performance, or anonymous cold installation. |

## Next Slides patch and handoff

The next minimal application change is a regression set for a small formatter
policy: node/depth boundaries before ABI conversion, cumulative indentation
before newline allocation, and output growth before appending. Exercise equality
to each limit and one unit over using small budgets; after every expected error,
format a valid value on the same program. Use native Lean as the semantic oracle
and the actual compact converter/browser path for admission checks. This is
preparation for Step 3, not completion of the pending distribution gate.

The pure Except result and v2 interface-ID migration are agreed; settle the
finite Slides error categories/limits and qualify the exact generated ABI before
adoption. Before integrating Step 5/6, obtain the explicit implemented VIR
checkpoint for the agreed expectedExports checks and caller-owned creation cancellation,
with error/cleanup tests and a matching artifact. Step 2 additionally needs a
durable anonymous source. No guessed loader options,
compatibility aliases or alternative production formatter enter these patches.

Publication, merge and cleanup remain outside this adoption. The next explicit
handoff carries the exact local head, completed evidence, the remaining lexical
path reproducer, and these contract/source requests to the existing Module owner.
