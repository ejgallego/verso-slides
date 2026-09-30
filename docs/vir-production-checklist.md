# VIR formatter integration checklist

Slides owns this application checklist. Module owns VIR's resource and execution
contracts. This plan follows the canonical production direction of 2026-09-30.

## Immutable adoption checkpoints

| Checkpoint | Slides | VIR | Runtime content ID | Qualification |
| --- | --- | --- | --- | --- |
| Historical 4.34 candidate | `d68e701964f7602454019bc026f9fabdf83b9786` | `970ad3d27b7daf82cd5bfe2e4d53251037cd7b87` | `5b58adf465c88e5aa9fac9300d42d7a3b33789557d2323c53e7fb8612741c70e` | Supplied-pack site/browser acceptance; retained in history |
| Current requested adoption | Descendant of the historical candidate; exact commit in delivery checkpoint | `0a9abac0e1245ddb3752a0d4dccef30d28c39621` | `ff7b5a61fd6558e7f4e828e460f3aed033803a84ef599073c6cfe44af85e2ba3` | Supplied-pack qualification recorded in the build guide |

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
| Check callable interface before formatting | Recipe verifies the role/declaration; `interfaceId` is metadata, not a generated type check | Agree a public way to verify the expected role, interface ID and callable input/output shape before the adapter's first call. Slides will use that agreed surface. |
| Cancel an obsolete pending load | Slides can invalidate a generation and dispose a late success; current loader has no caller cancellation option | Agree whether/how a caller cancels acquisition, its rejection behavior, and cleanup ownership. Generation checks remain required even with cancellation. |
| Bounded formatter failure | Current canary returns an array and has no formatter-specific failure result | Agree the production typed result and interface-ID migration if its shape changes. Keep the host ABI; introduce no JSON request/response wrapper. |

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

1. Finish the exact supplied-pack adoption and record native/root/nested browser
   evidence independently of anonymous cold acceptance.
2. Module and Slides review and agree interface verification, cancellation and
   the typed formatter result/limits before either repository implements a
   shared-contract change.
3. Implement the agreed Slides adapter, bounded Lean formatter and lifecycle in
   small changes, each with a reproducer or focused regression where behavior changes.
4. Consolidate the one JS presentation layer and remove the production formatter
   fallback. Qualify actual panels, Unicode/tags/width boundaries, failure/retry,
   completion ordering and disposal.
5. Qualify anonymous cold installation when a release source is supplied, then
   request the final production review. Publication, merge and cleanup require
   their own authorization.

Step 1 is qualified for VIR `0a9abac0` and pack `ff7b5a61`: seven native checks and
13 site/browser checks pass on Lean 4.34. Step 2 is the next review checkpoint;
no proposed shared-contract change has been implemented. The canary's direct
host ABI has no formatter-specific work limits yet. The historical JSON bounds
acceptance therefore remains evidence for its own historical pair only.
