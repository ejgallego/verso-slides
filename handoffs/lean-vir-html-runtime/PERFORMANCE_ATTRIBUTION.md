# VIR complete-HTML performance attribution handoff

## 2026-08-22 source-level update

Before investing in the owner-side profile below, rebuild from the
current Verso source. The original campaign exposed an O(chunks ×
annotations) reverse scan in `VersoSlides.Pretty.annotationSlotFor`.
The compatible sorted-table fast path reduced the 256-annotation VIR
execute phase by 46.8–49.6% in two interleaved campaigns. Full
evidence and reproduction are in
[`VERSO-001`](../../performance-cards/pretty/VERSO-001-annotation-lookup.md).

The remaining symbolized profile is still useful, but the historical
numbers below are hotspot-selection evidence, not the post-fix runtime
baseline.

## Request

Please reproduce and source-map two focused complete-HTML profiles
inside the VIR repository:

1. 4,096 text characters split into 256 independently annotated/tagged
   chunks.
2. 4,096 text characters split across 64 chunks, each nested under 64
   tags.

The Verso browser campaign has already selected these from a
representative 58-format corpus and a 40-point scaling matrix. The
next useful artifact is a symbolized profile or function-index map,
not another aggregate counter.

## Runtime and artifact identity

- VIR source: `a7a54ce4ecea986bca899ec7ee6ebe5cd0781ffb`
- Runtime toolchain: Lean 4.33
- Release Wasm SHA-256:
  `000c0fe150c5a1a7ff8b66e11ff9b8388e4a260af665c039c500b4d94b0f10bc`
- Release Wasm bytes: 740,901
- IR package: 15 members, 2,104 declarations, 11 lab interface exports
- Browser: Chrome 151.0.7922.173 on `capivara`

The release Wasm exposes 84 named function exports but no internal
function name subsection. Chrome therefore reports the dominant
internal functions only as indices.

## Diagnostics-off phase evidence

VIR's current `callTimed` semantics are already useful:

- marshal: lower JavaScript values to runtime objects and write the
  argument pointer vector;
- execute: call `vir_call_resolved_objects`;
- decode: lift/release the returned object; and
- `hostMs`: nested time in semantic host imports during execute.

Median-of-three-campaign evidence:

| Endpoint             |  Marshal |   Execute |   Decode | Committed total | `hostMs` |
| -------------------- | -------: | --------: | -------: | --------------: | -------: |
| 256 annotated chunks | 3.235 ms | 28.520 ms | 0.025 ms |       32.350 ms |        0 |
| 64 tags × 64 chunks  | 9.625 ms | 12.585 ms | 0.025 ms |       22.505 ms |        0 |

The first case is approximately 90% runtime execution before DOM
commit. The second is approximately 43% object import and 57% runtime
execution. Result export and semantic JavaScript host calls are not
material in either case.

For comparison, FIR executes the same Lean renderer in 11.848 and
3.043 ms, respectively. This is product-boundary evidence across
different physical ABIs, not a causal compiler comparison.

## Chrome CPU-sample evidence

Protocol: one selected backend/case, two warmups, 40 measured calls,
Chrome CPU sampling at 100 µs. The profiler inflates runtime; only
sample shares and caller identity are used.

| Endpoint             | VIR Wasm | Adapter JS |   GC | Program/idle |
| -------------------- | -------: | ---------: | ---: | -----------: |
| 256 annotated chunks |    75.8% |      14.4% | 3.4% |         6.5% |
| 64 tags × 64 chunks  |    43.2% |      40.0% | 9.6% |         7.2% |

Both profiles are led by internal Wasm function indices 96, 66, 58,
and 2787. They cannot be mapped safely without a symbol-bearing
companion built from the same source/runtime configuration.

The tag/chunk adapter samples are already attributable from JavaScript
names: `TextEncoder.encode`, constructor-field buffer allocation,
decimal `Nat` conversion, custom-inductive validation/lowering,
pointer-vector writes, and byte allocation. Package-resident inputs
are therefore expected to remove a large fraction of this case's
adapter work. The 256-annotation case remains primarily a Wasm/runtime
target after import is separated.

## Requested owner-side experiment

1. Produce either a profiling Wasm with an internal function name
   section or a deterministic function-index → source/symbol map tied
   to the release digest.
2. Rerun both cases and map indices 96, 66, 58, and 2787 before
   selecting a runtime optimization target.
3. Separate allocator/GC, IR dispatch, string/array operations, and
   the compiled `formatHtmlForRuntime` call path using the symbolized
   samples.
4. Preserve the existing diagnostics-off `callTimed` results as
   acceptance numbers; profile-mode elapsed time is not comparable.
5. After any candidate change, rerun the 58-format representative
   corpus and exact populated-DOM parity, not only these focused
   fixtures.

## Verso reproduction

From the `feat/vir-pretty-prototype` worktree:

```sh
python3 demos/vir-pretty/scripts/browser-html-scaling-measure.py \
  --backend vir-html --case annotations-256 \
  --warmups 2 --repetitions 40 --maximum-batch-calls 1 \
  --cpu-profile \
  --output demos/vir-pretty/_profiles/results/vir-profile-annotations.json

python3 demos/vir-pretty/scripts/browser-html-scaling-measure.py \
  --backend vir-html --case tag-chunks-64-64 \
  --warmups 2 --repetitions 40 --maximum-batch-calls 1 \
  --cpu-profile \
  --output demos/vir-pretty/_profiles/results/vir-profile-tag-chunks.json
```

- Annotation profile SHA-256:
  `0273c671d7ffdec2a3424582cbdc456aede363724625ec1524faa211d4632c8b`
- Tag/chunk profile SHA-256:
  `63491d6f0bbd8ee27c8e190b9dd97343350100503a9845e33694ce2dc47489ab`
- Correctness: exact populated-DOM parity and zero page errors in both
  runs
