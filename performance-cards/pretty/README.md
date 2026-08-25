# Pretty-printer performance observation cards

These self-contained Markdown cards turn benchmark observations into forwardable owner reports. Each card separates measured evidence, interpretation, requested follow-up, and caveats.

| Card | Intended owner | Observation |
| --- | --- | --- |
| [FIR-001](FIR-001-browser-layout-corpus.md) | FIR compiler / artifact / adapter | FIR layout is fast; ABI and arena ownership now have a reproducible browser control |
| [FIR-002](FIR-002-browser-html-corpus.md) | FIR / VIR / Verso runtime owners | Complete HTML gives FIR a current three-way control; residency and reclamation remain open |
| [VIR-001](VIR-001-json-boundary.md) | Runtime / browser ABI | JSON boundary dominates VIR time |
| [VIR-002](VIR-002-direct-format-execution.md) | Compiler / runtime | Direct ABI is viable; structural execution needs profiling |
| [VIR-003](VIR-003-shared-memory-growth.md) | Runtime / allocator / GC | Shared linear-memory high-water needs attribution |
| [VIR-004](VIR-004-resident-format-boundary.md) | Verso / runtime / artifact | Resident input and flat output remove boundary work |
| [VIR-005](VIR-005-production-panel-component.md) | Verso / runtime / UI integration | Production panel separates fast VIR calls from host and runtime costs |
| [VIR-006](VIR-006-complete-html-scaling.md) | VIR / FIR / Verso runtime owners | Resident input saves transfer; breadth and repeated transitions dominate HTML scaling |
| [VERSO-001](VERSO-001-annotation-lookup.md) | Verso / FIR artifact / VIR runtime owners | Sorted annotation lookup removes the shared renderer's quadratic case |

VIR-001 through VIR-003 are generated from the archived benchmark report, not
hand-maintained. After refreshing those artifacts and collecting a new report,
run:

```sh
python3 scripts/generate-pretty-observation-cards.py
python3 scripts/generate-pretty-observation-cards.py --check
```

`--check` is suitable for review or CI: it fails if any card is missing or stale. Both report and output paths are restricted to this workspace.

FIR-001, FIR-002, VIR-004 through VIR-006, and VERSO-001 record newer focused
prototypes separately. Their cases should move into the standalone VIR
benchmark webapp before they join the generated campaign.

## Current source

- Report: `_test/pretty-reports/pretty-benchmark.json`
- Report generated: `2026-08-04T12:42:52.505Z`
- Report SHA-256: `776f55b78fa5823e70c69719068fd659a67bc8b04aa3da9e1716ba6c1c672cdb`
- Lean: `4.32.0` (`8c9756b28d64dab099da31a4c09229a9e6a2ef35`)
- VIR Wasm: `bdedea22f964def5e013d695c6b1fd3a3764653e5d8e6ce55fb81ccbfae9ea3d` (617,363 bytes)
- IR package: `9f00af81f33e7f2fa343952c755108cc9bab2471fddf0a1b52a23d62783138ed` (352,863 bytes)
- Browser: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.7632.6 Safari/537.36`
- VIR cold start (5 fresh contexts): 211.980 ms median / 275.130 ms p95; resource-load wall 561.840 ms median
- Correctness: `180/180` corpus scenarios passed; scaling and interaction parity passed
