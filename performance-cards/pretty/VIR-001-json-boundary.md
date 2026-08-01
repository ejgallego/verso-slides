# VIR-001: the JSON boundary dominates VIR pretty-print time

- Audience: lean-vir runtime and browser ABI owners
- Status: observed; needs owner-side profiling
- Priority: performance follow-up

## Forwardable summary

> With the same VIR runtime, IR package, Lean implementation, and output, the direct `Std.Format` entry point is 6.4×–165.1× faster in the measured execute phase than the JSON entry point at the six scaling endpoints. The JSON route should be treated as a compatibility path, not as the VIR compiler-performance baseline.

## Evidence

Representative corpus (1,620 timed invocations per backend):

| Metric | VIR JSON | VIR Format | JSON / Format |
| --- | ---: | ---: | ---: |
| Median execute | 1.110 ms | 0.160 ms | 6.9× |
| p95 execute | 4.385 ms | 0.620 ms | 7.1× |
| Median total | 1.115 ms | 0.165 ms | 6.8× |
| p95 total | 4.395 ms | 0.620 ms | 7.1× |

Largest point in each one-dimensional scaling study:

| Dimension | Endpoint | JSON execute | Format execute | Ratio |
| --- | ---: | ---: | ---: | ---: |
| Text volume | 8192 code points | 12.712 ms | 0.077 ms | 165.1× |
| Format nodes | 2047 nodes | 24.950 ms | 3.874 ms | 6.4× |
| Nesting depth | 256 levels | 6.217 ms | 0.786 ms | 7.9× |
| Break opportunities | 256 lines | 41.080 ms | 4.627 ms | 8.9× |
| Tag depth | 256 tags | 9.873 ms | 0.987 ms | 10.0× |
| Width budget | 160 columns | 10.538 ms | 1.100 ms | 9.6× |

The strongest interaction point was 64 nested tags × 64 output chunks: 163.070 ms through JSON versus 16.210 ms through the direct entry point.

## Interpretation

The browser's `marshalMs` includes `JSON.stringify`, and `decodeMs` includes the final `JSON.parse` and segment validation. The much larger difference is inside `executeMs`: `runtime.call` plus Lean-side JSON parsing, recursive `Std.Format` construction, `prettyM`, result JSON construction, compression, and runtime return conversion. This card does not attribute the cost to one of those operations; the current boundary does not expose that split.

## Requested follow-up

- Use the direct `Std.Format` route as the VIR performance baseline.
- Add owner-side timings or counters around argument import, JSON parsing and format construction, `prettyM`, result export, and JSON serialization.
- If JSON remains a supported route, investigate a compact binary or typed boundary and compare it against the direct-object ABI.

## Caveats

- These are warmed, adaptively batched browser medians, not pure Wasm instruction counts.
- Both VIR modes share one runtime and artifact, which makes their relative comparison strong but prevents independent memory attribution.
- Exact output parity passed at every reported scaling and interaction point.

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
