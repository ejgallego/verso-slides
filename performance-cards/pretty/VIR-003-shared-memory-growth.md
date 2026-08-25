# VIR-003: shared Wasm memory reaches a high-water mark that cannot yet be classified

- Audience: lean-vir runtime, allocator, and GC owners
- Status: observed; needs owner-side profiling
- Priority: performance follow-up

## Forwardable summary

> The shared VIR runtime starts with 4.00 MiB committed and ends the full suite at 65.56 MiB. In separate fresh runtimes, VIR JSON grew by 3.06 MiB over 160 calls; VIR Format grew by 0.00 MiB over 160 calls. Current telemetry exposes committed pages only, so this is a high-water/retention observation—not evidence of a live-memory leak.

## Evidence

| Observation window | Calls into shared VIR runtime | Before | After | Growth |
| --- | ---: | ---: | ---: | ---: |
| Retained one-call scaling study | 64 | 34.00 MiB | 36.19 MiB | 2.19 MiB |
| Repeated-call study | 320 | 61.62 MiB | 65.56 MiB | 3.94 MiB |
| Fresh runtime · VIR JSON | 160 | 4.00 MiB | 7.06 MiB | 3.06 MiB (growing in tail; 0.81 MiB over final 8 cycles) |
| Fresh runtime · VIR Format | 160 | 4.00 MiB | 4.00 MiB | 0.00 MiB (tail plateau; 0.00 MiB over final 8 cycles) |

- Fresh-context committed memory after initialization: 4.00 MiB.
- Committed memory after the complete benchmark sequence: 65.56 MiB.
- `VIR JSON` and `VIR Format` report the same `vir-runtime` memory group; their figures must not be added together.
- All 800 calls in the five-backend repeated study preserved output stability; the shared VIR runtime received 160 JSON calls and 160 direct-Format calls.

## Interpretation

Wasm committed memory is an allocator capacity/high-water metric. It does not show live bytes, unreachable bytes waiting for collection, fragmentation, or reusable free-list capacity. The full-suite endpoint also follows large adaptive batches, so it must not be described as the footprint of one pretty-print operation.

The repeated-call delta is worth explaining because it occurs in a bounded, rotating workload after earlier warm-up. Without allocator frontier and GC telemetry, the harness cannot distinguish expected heap expansion from retained live state or a leak.

The fresh-runtime JSON and direct-Format traces remove cross-mode contamination. Their per-cycle tail classifications report only whether committed capacity stopped growing in the observed final window.

## Requested follow-up

- Expose committed pages, allocator frontier, live/reachable bytes if available, free-list capacity, and collection count/time around each call.
- Provide a documented runtime reset/dispose operation, or state explicitly which caches and arenas are intentionally process-lifetime.
- Extend any still-growing isolated trace until it plateaus or reaches a documented bound, preserving the per-cycle series.
- Correlate growth events with JSON and direct calls using the separate fresh-runtime reports.

## Caveats

- No browser API currently exposes the VIR runtime's resident/live heap.
- The values are Wasm linear-memory capacity, not host-process RSS.
- The main five-backend study shares one VIR runtime instance; the isolated mode traces each start from a fresh runtime.

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
