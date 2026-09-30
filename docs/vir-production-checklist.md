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
| Current requested adoption | `9cb9b54270abc7dd737621cde72eaf1d258f5f95` (pin change `f582da67372a150d358f47256fa939aa6f60f2a5`) | `0a9abac0e1245ddb3752a0d4dccef30d28c39621` | `ff7b5a61fd6558e7f4e828e460f3aed033803a84ef599073c6cfe44af85e2ba3` | Seven native checks; 13 site/browser checks; supplied pack |

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

Follow the shared plan's A–E checkpoints; preparation for independent items can
proceed while an upstream gate is pending. Supplied-pack adoption completes the
Slides baseline portion of A. B remains the earliest unmet shared checkpoint.

| Shared-plan step | Actual status and owner |
| --- | --- |
| 1 Baseline/CI alignment (A) | Slides pin mismatch resolved in `f582da6`; supplied-pack acceptance in `9cb9b54`. VIR's historical source-inventory regression was fixed in `8d1facd`; the exact named Node test passes locally at `0a9abac0` (1 passed). This is not a claim about full public CI. |
| 2 Mandatory acquisition (B) | Pending VIR durable anonymous source. Explicit supplied-pack acquisition and ordinary root/downstream builds pass. An empty-cache public acquisition probe rejects with `RESOURCE_OFFLINE_MISS` and the exact required content ID; it is not a fresh anonymous deck build. Slides owns downstream qualification after a usable source handoff. |
| 3 Formatter bounds (B) | Earliest Slides implementation item. Current direct wrapper and recursive converter have no formatter-specific budgets. Historical JSON bounds qualify their old pair only. Prepare small-budget regressions; agree the recoverable typed result before changing its contract. |
| 4 Portable paths (B) | Generic rule belongs to VIR. Current JS `validateDescriptor` accepts `Assets/a.js` and `assets/b.js`; a minimal lexical regression reproduces the missing rejection at `0a9abac0`. Native source has the same gap; native/case-insensitive-platform execution has not been claimed. Slides reserves exact `lib/vir`/`lib/.vir-stage` spellings; its casing rules still need regression/review. |
| 5 Consumer contract/typed adapter (C) | Pending shared agreement. Current recipe checks declarations; `interfaceId` is not checked against consumer expectations. Ask VIR for its public expected-interface proposal; then integrate a typed Slides adapter and reviewed width/error semantics. |
| 6 Cancellation/loading UX (C) | Pending agreed caller cancellation API and Slides loading/failure/retry work. Ready-instance disposal, persisted pagehide and fresh reload pass; this does not cover obsolete acquisition cancellation or all pending-completion races. |
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

Before changing the exported result, agree a recoverable typed error shape and
the interface-ID migration with Module. Before integrating Step 5/6, obtain an
explicit VIR proposal/checkpoint for expected-interface checking and caller-owned
creation cancellation, with error/cleanup semantics and a matching artifact.
Step 2 additionally needs a durable anonymous source. No guessed loader options,
compatibility aliases or alternative production formatter enter these patches.

Publication, merge and cleanup remain outside this adoption. The next explicit
handoff carries the exact local head, completed evidence, the remaining lexical
path reproducer, and these contract/source requests to the existing Module owner.
