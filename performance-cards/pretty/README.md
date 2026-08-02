# Pretty-printer performance observation cards

These self-contained Markdown cards turn benchmark observations into forwardable owner reports. Each card separates measured evidence, interpretation, requested follow-up, and caveats.

| Card | Intended owner | Observation |
| --- | --- | --- |
| [VIR-001](VIR-001-json-boundary.md) | Runtime / browser ABI | JSON boundary dominates VIR time |
| [VIR-002](VIR-002-direct-format-execution.md) | Compiler / runtime | Direct ABI is viable; structural execution needs profiling |
| [VIR-003](VIR-003-shared-memory-growth.md) | Runtime / allocator / GC | Shared linear-memory high-water needs attribution |

The numbers are generated, not hand-maintained. After refreshing an artifact and collecting a new benchmark report, run:

```sh
python3 scripts/generate-pretty-observation-cards.py
python3 scripts/generate-pretty-observation-cards.py --check
```

`--check` is suitable for review or CI: it fails if any card is missing or stale. Both report and output paths are restricted to this workspace.

## Current source

- Report: `_test/pretty-reports/pretty-benchmark.json`
- Report generated: `2026-08-02T08:12:50.674Z`
- Report SHA-256: `d6dcd8587f5061a7175641b9f68dd438f28e1a90b5e4fa7cbd9e7f1168825bf1`
- Lean: `4.32.0` (`8c9756b28d64dab099da31a4c09229a9e6a2ef35`)
- VIR Wasm: `bdedea22f964def5e013d695c6b1fd3a3764653e5d8e6ce55fb81ccbfae9ea3d` (617,363 bytes)
- IR package: `96cff29ebd4dbbdaaf70a982e42f636248950519028c857fd6d2abba1132dd3b` (350,542 bytes)
- Browser: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.7632.6 Safari/537.36`
- VIR cold start (5 fresh contexts): 44.280 ms median / 52.985 ms p95; resource-load wall 126.605 ms median
- Correctness: `180/180` corpus scenarios passed; scaling and interaction parity passed
