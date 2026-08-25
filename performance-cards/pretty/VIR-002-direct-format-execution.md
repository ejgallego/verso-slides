# VIR-002: direct Format ABI is viable, with structural execution costs to profile

- Audience: lean-vir compiler and runtime owners
- Status: observed; needs owner-side profiling
- Priority: performance follow-up

## Forwardable summary

> The direct VIR `Std.Format` ABI removes most boundary overhead and keeps representative-corpus median total latency at 0.435 ms. Its measured execute phase is nevertheless 6.0×–18.3× slower than FIR-native Wasm across the six large scaling endpoints, with the largest interaction gap on nested tags and output transitions.

## Evidence

Representative corpus (1,620 timed invocations per backend):

| Backend | Execute median | Execute p95 | Total median | Total p95 |
| --- | ---: | ---: | ---: | ---: |
| VIR Format | 0.425 ms | 4.070 ms | 0.435 ms | 4.095 ms |
| Native | 0.050 ms | 0.520 ms | 0.195 ms | 1.685 ms |
| LLVM | 0.080 ms | 0.760 ms | 0.150 ms | 1.450 ms |

Largest point in each one-dimensional scaling study:

| Dimension | Endpoint | VIR execute | VIR / Native execute | VIR / LLVM execute | VIR / Native total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Text volume | 8192 code points | 0.153 ms | 7.3× | 0.6× | 2.7× |
| Format nodes | 2047 nodes | 24.495 ms | 18.3× | 4.8× | 2.7× |
| Nesting depth | 256 levels | 4.737 ms | 11.7× | 2.9× | 3.6× |
| Break opportunities | 256 lines | 26.390 ms | 16.9× | 4.9× | 4.2× |
| Tag depth | 256 tags | 4.875 ms | 11.1× | 2.0× | 2.0× |
| Width budget | 160 columns | 2.799 ms | 6.0× | 5.1× | 1.9× |

Interaction endpoints:

| Interaction | Endpoint | VIR execute | VIR / Native execute | VIR / Native total |
| --- | --- | ---: | ---: | ---: |
| Breaks × width | 256 breaks × 128 columns | 31.630 ms | 28.8× | 5.0× |
| Nodes × depth | 512 leaves × 128 levels | 18.230 ms | 30.1× | 4.6× |
| Tag depth × output transitions | 64 tags × 64 chunks | 77.110 ms | 11.3× | 2.1× |
| Input bytes × output expansion | 8192 B input × 64 columns | 0.905 ms | 2.8× | 1.1× |

The end-to-end gap is smaller than the execute-only gap because the direct VIR bridge has very low separately measured marshal/decode cost, while the native and LLVM adapters perform explicit encoding and decoding.

## Interpretation

`VIR Format` is the right path for interactive use, but its `executeMs` is still a user-visible `runtime.call` measurement. It includes importing the JavaScript `Std.Format` object, executing `formatSegmentsForVir`/`prettyM`, allocating the `StateM` arrays and strings, and exporting the segment array. The current harness cannot decide whether the gap belongs to VIR codegen, the runtime object ABI, allocation/GC, or the formatter implementation.

The 64-tag × 64-chunk endpoint is the clearest profiling target: direct VIR takes 77.110 ms execute / 78.775 ms total, versus native at 6.795 ms execute / 37.965 ms total. The total-time result also shows why optimizing only core execution is insufficient: output transport remains material for all backends.

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
- Report generated: `2026-08-04T12:42:52.505Z`
- Report SHA-256: `776f55b78fa5823e70c69719068fd659a67bc8b04aa3da9e1716ba6c1c672cdb`
- Lean: `4.32.0` (`8c9756b28d64dab099da31a4c09229a9e6a2ef35`)
- VIR Wasm: `bdedea22f964def5e013d695c6b1fd3a3764653e5d8e6ce55fb81ccbfae9ea3d` (617,363 bytes)
- IR package: `9f00af81f33e7f2fa343952c755108cc9bab2471fddf0a1b52a23d62783138ed` (352,863 bytes)
- Browser: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.7632.6 Safari/537.36`
- VIR cold start (5 fresh contexts): 211.980 ms median / 275.130 ms p95; resource-load wall 561.840 ms median
- Correctness: `180/180` corpus scenarios passed; scaling and interaction parity passed
- Scaling protocol: 9 logical samples, 2 warm-ups, adaptive batches targeting 20 ms, capped at 512 calls

Regenerate this card after collecting a new report:

```sh
python3 scripts/generate-pretty-observation-cards.py
```
