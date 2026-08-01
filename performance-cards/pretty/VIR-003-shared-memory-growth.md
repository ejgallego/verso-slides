# VIR-003: shared Wasm memory reaches a high-water mark that cannot yet be classified

- Audience: lean-vir runtime, allocator, and GC owners
- Status: observed; needs owner-side profiling
- Priority: performance follow-up

## Forwardable summary

> The shared VIR runtime starts with 4.00 MiB committed and ends the full suite at 91.94 MiB. It grew by 2.19 MiB during the retained one-call scaling study and by 3.88 MiB during 320 repeated VIR calls. Current telemetry exposes committed pages only, so this is a high-water/retention observation—not evidence of a live-memory leak.

## Evidence

| Observation window | Calls into shared VIR runtime | Before | After | Growth |
| --- | ---: | ---: | ---: | ---: |
| Retained one-call scaling study | 64 | 50.38 MiB | 52.56 MiB | 2.19 MiB |
| Repeated-call study | 320 | 88.06 MiB | 91.94 MiB | 3.88 MiB |

- Fresh-context committed memory after initialization: 4.00 MiB.
- Committed memory after the complete benchmark sequence: 91.94 MiB.
- `VIR JSON` and `VIR Format` report the same `vir-runtime` memory group; their figures must not be added together.
- All 800 calls in the five-backend repeated study preserved output stability; the shared VIR runtime received 160 JSON calls and 160 direct-Format calls.

## Interpretation

Wasm committed memory is an allocator capacity/high-water metric. It does not show live bytes, unreachable bytes waiting for collection, fragmentation, or reusable free-list capacity. The full-suite endpoint also follows large adaptive batches, so it must not be described as the footprint of one pretty-print operation.

The repeated-call delta is worth explaining because it occurs in a bounded, rotating workload after earlier warm-up. Without allocator frontier and GC telemetry, the harness cannot distinguish expected heap expansion from retained live state or a leak.

## Requested follow-up

- Expose committed pages, allocator frontier, live/reachable bytes if available, free-list capacity, and collection count/time around each call.
- Provide a documented runtime reset/dispose operation, or state explicitly which caches and arenas are intentionally process-lifetime.
- Rerun the repeated workload for more cycles and record memory after each cycle to determine whether growth plateaus.
- Attribute memory to JSON and direct calls with separate fresh-runtime runs; the current shared instance cannot do so.

## Caveats

- No browser API currently exposes the VIR runtime's resident/live heap.
- The values are Wasm linear-memory capacity, not host-process RSS.
- The two VIR modes intentionally share the same runtime instance.

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
