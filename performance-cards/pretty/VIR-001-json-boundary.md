# VIR-001: the JSON boundary dominates VIR pretty-print time

- Audience: lean-vir runtime and browser ABI owners
- Status: observed; needs owner-side profiling
- Priority: performance follow-up

## Forwardable summary

> With the same VIR runtime, IR package, Lean implementation, and output, the direct `Std.Format` entry point is 5.3×–358.3× faster in the measured execute phase than the JSON entry point at the six scaling endpoints. The JSON route should be treated as a compatibility path, not as the VIR compiler-performance baseline.

## Evidence

Representative corpus (1,620 timed invocations per backend):

| Metric | VIR JSON | VIR Format | JSON / Format |
| --- | ---: | ---: | ---: |
| Median execute | 2.485 ms | 0.425 ms | 5.8× |
| p95 execute | 23.655 ms | 4.070 ms | 5.8× |
| Median total | 2.508 ms | 0.435 ms | 5.8× |
| p95 total | 23.930 ms | 4.095 ms | 5.8× |

Largest point in each one-dimensional scaling study:

| Dimension | Endpoint | JSON execute | Format execute | Ratio |
| --- | ---: | ---: | ---: | ---: |
| Text volume | 8192 code points | 54.915 ms | 0.153 ms | 358.3× |
| Format nodes | 2047 nodes | 129.950 ms | 24.495 ms | 5.3× |
| Nesting depth | 256 levels | 28.755 ms | 4.737 ms | 6.1× |
| Break opportunities | 256 lines | 213.590 ms | 26.390 ms | 8.1× |
| Tag depth | 256 tags | 59.950 ms | 4.875 ms | 12.3× |
| Width budget | 160 columns | 22.285 ms | 2.799 ms | 8.0× |

The strongest interaction point was 64 nested tags × 64 output chunks: 756.505 ms through JSON versus 77.110 ms through the direct entry point.

Independent JSON parse-and-compact control (no `Std.Format` construction or `prettyM`):

| Payload | Bytes | JS execute | VIR execute | VIR / JS |
| ---: | ---: | ---: | ---: | ---: |
| 1 item | 51 | 0.005 ms | 1.950 ms | 390.0× |
| 8 items | 336 | 0.005 ms | 3.790 ms | 758.0× |
| 64 items | 2,691 | 0.040 ms | 33.990 ms | 849.8× |
| 512 items | 21,938 | 0.190 ms | 217.925 ms | 1147.0× |
| 4096 items | 179,295 | 1.625 ms | 1877.985 ms | 1155.7× |

This control passed exact semantic parity at 7/7 points.

## Interpretation

The browser's `marshalMs` includes `JSON.stringify`, and `decodeMs` includes the final `JSON.parse` and segment validation. The much larger difference is inside `executeMs`: `runtime.call` plus Lean-side JSON parsing, recursive `Std.Format` construction, `prettyM`, result JSON construction, compression, and runtime return conversion. This card does not attribute the cost to one of those operations; the current boundary does not expose that split.

The independent JSON control removes format decoding, `prettyM`, and segment construction. Its remaining execute phase is the string ABI, Lean `Json.parse`/`Json.compress`, envelope construction, and VIR execution. The persistent gap therefore is not specific to the pretty printer.

## Requested follow-up

- Use the direct `Std.Format` route as the VIR performance baseline.
- Profile the independent JSON round-trip control first; it is the smallest reproduction and removes pretty-printer work.
- Add owner-side timings or counters around argument import, JSON parsing and format construction, `prettyM`, result export, and JSON serialization.
- If JSON remains a supported route, investigate a compact binary or typed boundary and compare it against the direct-object ABI.

## Caveats

- These are warmed, adaptively batched browser medians, not pure Wasm instruction counts.
- The independent JSON control uses 9 logical samples and 2 warm-ups with batching disabled; its sub-millisecond JavaScript medians are timer-resolution-sensitive.
- Both VIR modes share one runtime and artifact, which makes their relative comparison strong but prevents independent memory attribution.
- Exact output parity passed at every reported scaling and interaction point.

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
