# PrettyM v2 bounds and strict creation checkpoint

This checkpoint preserves the work started at Slides `5e3c5207` and qualifies
its bounded formatter with the explicitly authorized VIR
`47e82e9a483e727431bb004fb64ce76ada739ba9` source and supplied runtime pack.
It follows `VIR-SLIDES-STRICT-CREATION-ADOPTION-20260930-001`.
The historical `cf816e94` / `ff7b5a61` and 4.35 qualifications remain in history.

## Formatter contract

Role `formatSegments`, declaration `VersoSlides.VirPrettyM.formatSegments`,
interface ID `verso-slides-format-segments-hostabi-v2`:

```lean
Std.Format → Nat → Nat → Except FormatError (Array Pretty.Segment)
```

This pure result uses the existing VIR host ABI. A rejected input raises a
`PrettyFormatError` in the browser adapter and leaves the program active.
No result truncation, protocol guessing or replay occurs. The finite error
codes are `invalidInput`, `inputNodes`, `inputDepth`, `inputBytes`, `textBytes`,
`hardLines`, `tagValue`, `width`, `indentation`, `outputBytes`, `outputSegments`
and `outputTags`. `invalidInput` belongs to compact-input admission; native
`Std.Format` values already have valid constructors.

| Inclusive production limit | Value / unit |
| --- | --- |
| Input nodes | 10,000, counting every constructor |
| Depth | 128; root depth is one |
| Aggregate input text | 65,536 UTF-8 bytes |
| Text node | 16,384 UTF-8 bytes |
| Literal hard newlines | 4,096 across input text nodes |
| Width | 0–4,096 Lean columns |
| Initial indentation | 0–4,096 columns |
| Signed cumulative nesting | Absolute value at every node ≤4,096 |
| Tag | 0–99,999,999,999,999,999,999 |
| Output text | 1,048,576 UTF-8 bytes |
| Output segments | 10,000 |
| Total tag entries across segments | 65,536 |

Zero width retains Lean's layout behavior. Negative indentation retains Lean's
clamping to zero when emitting spaces; signed nesting deltas may cancel each
other, but every intermediate cumulative value is bounded. Column advancement
retains `String.Internal.length`, independently of UTF-8 byte accounting.
Numbers must be safe integers or canonical bounded decimal strings before ABI
conversion. Fractional, exponential and imprecise scalars, leading-zero/negative-zero
decimal strings and invalid Unicode inputs are rejected. Large exact tag values remain decimal
strings in browser results; they are never rounded through JavaScript numbers.

The iterative admission pass completes before recursive object construction or
any ABI call. Lean independently preflights the whole input before `prettyM`.
Output reservations precede segment append and newline indentation allocation.
Pinned `prettyM` allocates alignment spaces before calling `pushOutput`; complete
cumulative-nesting admission bounds that intermediate allocation to 4,096 spaces.
The output budget checks the resulting alignment segment before appending it.
The text-node and hard-line budgets bound `prettyM`'s hard-line splitting work.
These are finite workload limits, not a measured latency guarantee.

The initial 1 MiB input proposal was tightened to 64 KiB total / 16 KiB per node.
A sample of 124 format documents from the retained demo contained at most
112 nodes, depth 31, 42 aggregate UTF-8 text bytes and a 9-byte text chunk.
That supports this demo's admission; broader realistic goal sizing and performance
qualification remain separate product work.

## Strict creation and independent reference

`web-lib/vir-prettym/format-segments-v2.contract.json` holds the complete
existing interface representation captured from the validated owning v2 root.
Its argument types, recursive identities, constructor/field order, layouts,
result and pure effect were inspected. It is a reviewed source constant, embedded
by the native renderer; the application never derives it from a loaded program.
The test compares it with the generated root using VIR's existing validator and
canonical signature comparison. No second ABI grammar or generator is added.

The published bootstrap supplies this map as `expectedExports` and a page-owned
pending `AbortSignal`. Terminal `pagehide` aborts creation or explicitly disposes
a ready program. Persisted `pagehide` keeps it active. Late success is guarded
before installing either facade. An own secondary `cleanupError` is reported
without inspecting or stringifying its raw value, including `undefined`/`null`,
even for obsolete creation. Slides `481ea5c` subsequently adds page-owned loading,
failure and explicit retry: each attempt owns cancellation/disposal, and stale
completion cannot install a facade or change the current view. See the
[separate lifecycle evidence](evidence/formatter-lifecycle/README.md).

## Exact artifact pair

| Identity | Value |
| --- | --- |
| VIR source / native generator source | `47e82e9a483e727431bb004fb64ce76ada739ba9` |
| Lean revision | `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b` |
| Resource compatibility | Lean revision above; `virVersion: 1` |
| Native ABI / interface / IR formats | 4 / 9 / 11 |
| Runtime content ID | `401b115ed3f4770b11e5b64d6066cbebb5b41beb468c3f9908603b89690776ba` |
| Supplied pack SHA-256 | `1d6192985fedd8d4c85c3db3c625857c2191832a3f02c72d818f47562e3daaf7` |
| Published runtime JS SHA-256 | `08e542ef60d71b9308b1e12ba3f4438fef24b7634e1aab1f380a93833e1469a0` |
| Published Wasm SHA-256 | `e74e7f8e663537a4f0035c0edf594fbea9699f40b4b683ffe563922b4f453ec4` |
| Program content ID | `97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58` |

The source pin, root manifest and dependency checkout agree. The subsequent
maintainer-authorized PR207 update publishes this same immutable source; [VIR CI run 36720794347](https://github.com/ejgallego/lean-vir/actions/runs/36720794347)
subsequently passed at this exact head; later readback is retained in
`docs/evidence/bootstrap-cleanup/vir-run.json`. This status update changes no API/artifact. No separately
installed SDK archive was consumed: native program tools come from the exact
pinned source, and the browser SDK is the supplied pack's ESM module identified
above. Producer-retained Wasm provenance records WASI SDK 33 / clang 22.1.0,
Lean 4.34 release, `wasm32-wasip1`, `-O3`, initial memory 4 MiB and stack 1 MiB.
Slides reused these exact Wasm bytes and did not compile Wasm sources.

## Executed consumer evidence

This section records execution at Slides `51c6d782`; it is historical
qualification, not a rerun after the [focused cleanup fix](evidence/bootstrap-cleanup/README.md)
or [loading/retry slice](evidence/formatter-lifecycle/README.md).
[Retained evidence](evidence/vir-51c6d782/README.md) includes native/Node/browser
logs and `identities.json` source/artifact/test hashes. Larger generated corpora
and root/nested sites remain locally under `/tmp/verso-prettym-strict-adoption`;
the tracked tests and recorded source revisions reproduce them with the supplied pack.

- Targeted `lake build test-pretty demo-slides`: pass, 748 jobs. Ordinary carrier
  preparation and root/nested rendering passed. This is local targeted build
  evidence, not clean CI or anonymous-cold qualification.
- Native: 101 checks pass — original seven semantic checks, 34 small-budget
  equality/one-over cases, 29 production-wrapper cases, and recovery after
  each negative. Native oracle results include complete segments and tag stacks.
- Node: 11 tests pass — strict compact admission/typed recovery, bootstrap
  pending completion ordering/cleanup reporting and independent ABI comparison.
- Both JS projects typecheck successfully.
- Focused Chromium/Firefox matrix checks exact root/nested inventories and
  reference embedding, native semantic/bounds results, recovery on the same
  program, real panel reflow, resolved lifecycle, strict identity/signature
  rejection before instantiation and pending cancellation/cleanup. The final combined inventory has 30 focused checks (5 deselected),
  including the two emitted-bootstrap cancellation checks. Prior separate runs
  are retained; no full suite or broad downstream/pixel rerun is claimed.

Identity negatives need no payload requests; malformed expectations need no I/O.
Actual argument count/order, result, effect, constructor and valid layout
mismatches require verified program bytes but allocate zero Wasm instances.
Cancellation covers manifest fetch, Wasm fetch and actual instance creation;
no stale facade is handed off, terminal cleanup runs once, and fresh creation
recovers. After resolution, abort does not own the program. Cleanup-error tests
inject a secondary failure at the actual runtime's callback-root cleanup using a
bounded test-only `Set.clear` observation, restored after each check. They assert
primary `AbortError`, untouched cause and own readonly secondary values.
The browser imports only emitted ESM/Wasm bytes; no producer test SDK is substituted.

## Remaining gates

Durable anonymous acquisition remains open (`source: "-"`). This supplied-pack
checkpoint does not qualify distribution, final visual geometry, wider goal
workloads, dynamic retention/performance, broader product UX,
publication planning or portable-path rules. Slides `89e0314` removes the old pixel
switch and duplicated JS formatter, with one mandatory VIR presentation path;
[fresh consolidation evidence](evidence/mandatory-formatter/README.md) includes
101 native formatter, 24 rendering, 46 Node and 105 browser checks. Upstream
publication and final product acceptance remain coordinator-owned sequencing.
