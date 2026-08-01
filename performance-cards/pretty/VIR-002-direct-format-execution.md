# VIR-002: direct Format ABI is viable, with structural execution costs to profile

- Audience: lean-vir compiler and runtime owners
- Status: observed; needs owner-side profiling
- Priority: performance follow-up

## Forwardable summary

> The direct VIR `Std.Format` ABI removes most boundary overhead and keeps representative-corpus median total latency at 0.165 ms. Its measured execute phase is nevertheless 5.3×–14.6× slower than FIR-native Wasm across the six large scaling endpoints, with the largest interaction gap on nested tags and output transitions.

## Evidence

Representative corpus (1,620 timed invocations per backend):

| Backend | Execute median | Execute p95 | Total median | Total p95 |
| --- | ---: | ---: | ---: | ---: |
| VIR Format | 0.160 ms | 0.620 ms | 0.165 ms | 0.620 ms |
| Native | 0.015 ms | 0.085 ms | 0.050 ms | 0.250 ms |
| LLVM | 0.025 ms | 0.115 ms | 0.040 ms | 0.200 ms |

Largest point in each one-dimensional scaling study:

| Dimension | Endpoint | VIR execute | VIR / Native execute | VIR / LLVM execute | VIR / Native total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Text volume | 8192 code points | 0.077 ms | 6.1× | 0.9× | 2.2× |
| Format nodes | 2047 nodes | 3.874 ms | 10.9× | 4.1× | 1.9× |
| Nesting depth | 256 levels | 0.786 ms | 13.9× | 2.3× | 4.4× |
| Break opportunities | 256 lines | 4.627 ms | 5.3× | 5.1× | 1.9× |
| Tag depth | 256 tags | 0.987 ms | 14.6× | 2.2× | 2.5× |
| Width budget | 160 columns | 1.100 ms | 5.8× | 4.8× | 1.6× |

Interaction endpoints:

| Interaction | Endpoint | VIR execute | VIR / Native execute | VIR / Native total |
| --- | --- | ---: | ---: | ---: |
| Breaks × width | 256 breaks × 128 columns | 4.296 ms | 5.7× | 1.9× |
| Nodes × depth | 512 leaves × 128 levels | 3.519 ms | 10.5× | 1.6× |
| Tag depth × output transitions | 64 tags × 64 chunks | 16.210 ms | 16.6× | 2.7× |
| Input bytes × output expansion | 8192 B input × 64 columns | 0.285 ms | 2.3× | 0.9× |

The end-to-end gap is smaller than the execute-only gap because the direct VIR bridge has very low separately measured marshal/decode cost, while the native and LLVM adapters perform explicit encoding and decoding.

## Interpretation

`VIR Format` is the right path for interactive use, but its `executeMs` is still a user-visible `runtime.call` measurement. It includes importing the JavaScript `Std.Format` object, executing `formatSegmentsForVir`/`prettyM`, allocating the `StateM` arrays and strings, and exporting the segment array. The current harness cannot decide whether the gap belongs to VIR codegen, the runtime object ABI, allocation/GC, or the formatter implementation.

The 64-tag × 64-chunk endpoint is the clearest profiling target: direct VIR takes 16.210 ms execute / 16.573 ms total, versus native at 0.975 ms execute / 6.155 ms total. The total-time result also shows why optimizing only core execution is insufficient: output transport remains material for all backends.

## Requested follow-up

- Profile the 64-tag × 64-chunk case first, then the 2,047-node empty-output case to separate output construction from input traversal.
- Split `runtime.call` into JS-object import, compiled-function execution, allocation/GC, and result export timings.
- Inspect generated code and allocation behavior around `StateM`, `Array.push`, tag-stack updates, string lengths, and recursive `Std.Format` traversal.
- Preserve both execute-only and total-time comparisons; improvements should not move work into an unmeasured adapter phase.

## Caveats

- Native and LLVM have different physical ABIs, so total-time comparisons are product-level measurements rather than compiler-only measurements.
- The execute phase is the fairest phase currently available, but it still includes each runtime's in-call ABI work.
- Exact styled-output parity passed at every reported point.

## Measurement context

- Report: `_test/pretty-reports/pretty-benchmark.json`
- Report generated: `2026-08-01T10:06:19.280Z`
- Report SHA-256: `641c38d6f7978c446ef97c1acead0af73f34abd24f358417beee77c4506101fe`
- Lean: `4.32.0` (`8c9756b28d64dab099da31a4c09229a9e6a2ef35`)
- VIR Wasm: `bdedea22f964def5e013d695c6b1fd3a3764653e5d8e6ce55fb81ccbfae9ea3d` (617,363 bytes)
- IR package: `96cff29ebd4dbbdaaf70a982e42f636248950519028c857fd6d2abba1132dd3b` (350,542 bytes)
- Browser: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.7632.6 Safari/537.36`
- VIR cold start (5 fresh contexts): 48.975 ms median / 67.675 ms p95; resource-load wall 118.780 ms median
- Correctness: `180/180` corpus scenarios passed; scaling and interaction parity passed
- Scaling protocol: 9 logical samples, 2 warm-ups, adaptive batches targeting 20 ms, capped at 512 calls

Regenerate this card after collecting a new report:

```sh
python3 scripts/generate-pretty-observation-cards.py
```
