# Historical VIR creation contract correspondence

Retained from Slides `51c6d782285845c4c9dee5f2f1852051cdaffede`.
This records earlier proposal/review decisions, including historical pending
labels; it is not the current work checklist. Current status and owners are in
[the production checklist](../vir-production-checklist.md).

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
