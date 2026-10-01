# One-shot first-client initialization

Executed source: `4821ba8e45c511bea94111881191899693371361`, on clean
`26a2d06e706c8ac0b4c2f191faa8e0e85c881afa`. The prior asset/adoption source
`cfe1f9f` and its evidence remain preserved.

VIR stays `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0,
runtime `832ab095…` / pack SHA-256 `d06bda0a…`, program `97b280b7…` /
pack SHA-256 `c48f6857…`. [Full identities and commands](results.json).
No upstream API, acquisition, carrier, publication or dependency change.

## Smaller application contract

The document initializes once and either becomes ready or displays unavailability
with raw diagnostics. No retry button, `versoVirRetry`, replacement generation,
automatic restart, recovery control or expression replay remains. Expected
admission/Lean Except errors preserve the same healthy program; an unexpected
dispatch failure clears the facade and disposes the owned program.

Terminal pagehide cancels pending creation or disposes the ready program once.
A late creation success is disposed and cannot install a facade. Persisted
pagehide preserves the program. Readiness is published/observed before the
loading notification. Raw primary/cause/cleanup values survive diagnostic
reporting, including nullish thrown values and reporting failures.

## Executed locally

- **42 Node checks passed**, executing the real bootstrap and typed adapter with
  controlled module/program boundaries. They cover the surviving document
  lifecycle, raw diagnostics, input/Except recovery, and terminal runtime failure
  without another initialization or call replay.
- Warm owning-library `lake build demo-slides test-fixtures-build
  test-vir-publication` passed (763 jobs). The actual renderer publication tests
  passed, including byte equality, partial failure/recovery and stale retention.
- Fresh root and nested sites were rendered from that binary. Four manifests
  and 30 payloads matched; both resource packs rehashed byte-identical.
- **32 Chromium/Firefox checks passed** against emitted HTML/JS and the real
  published loader. Slow loading keeps navigation/current selection usable;
  creation failure remains final; document termination prevents late installation.
  JS width rejection and a real Lean `Except.error outputBytes` are each followed
  by valid formatting on the identical active program and readiness promise.
- The browser terminal-policy test injects a `WebAssembly.RuntimeError` at the
  application dispatch boundary after real loader initialization. It verifies
  raw error identity, explicit actual-program disposal, facade removal and no
  recreation/replay. It is **not** a production Wasm trap/quarantine reproduction;
  generic runtime failure semantics remain VIR-owned. Node tests additionally
  model a failed program with raw Error/null/undefined failures.
- Presentation checks retain full segments/tags, escaping, classes and bindings.
  The surviving retention test exercises 640 checked calls and 64 reflows on one
  instance; its retry loop was removed. No unhandled rejection was observed.

## Deliberately withdrawn coverage

- Twelve exclusively retry/replacement Node cases: nested loading retry,
  pre-import retry, overlapping completion orders, obsolete replacement rejection,
  obsolete-success cleanup and ignored retry reporting. Creation-failure and
  ready-disposal tests were rewritten around one-shot failure and terminal cleanup.
- Browser nested-retry notification and ready-instance replacement cases were
  removed; failure/retry and pending replacement cases now test final failure and
  document termination. Eight recreation cycles in the retention test are gone.
- Sixteen generic loader-matrix browser cases were removed: shared-directory
  casing, expected-map mutations, pending phase cancellation followed by another
  independent program, and secondary-cleanup variants. These are upstream VIR
  coverage. Slides retains its independent complete
  ABI-reference check and actual-creation document-termination test.

Previous [asset checkpoint](../asset-simplification/README.md) and
[historical browser evidence](../browser-acceptance/README.md) retain their actual
source and results. The withdrawn scope is listed above; tests of the surviving
error/cleanup contract remain active.

## Evidence, reuse and limits

Complete current logs, JUnit cases, source/output hashes and inventories are
retained here. Native corpus, 101 native checks, bounds and public acquisition/
offline evidence are reused from the exact preceding checkpoint because Lean
formatter/ABI/reference, runtime and program bytes are unchanged. The test-only
native corpora were copied unchanged and are identified by hash.

No broad native/bounds/browser, fresh downstream acquisition, new CI, complete
geometry matrix or mobile product campaign was run for this bounded change.
The separate mobile DOM-restoration limitation and generic asset patches remain
scheduled after the first Slides patch lands. No upstream decision/artifact is
required for this slice.

## Replay

```sh
node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs Tests/pretty-presentation.test.cjs
lake build demo-slides test-fixtures-build test-vir-publication
.lake/build/bin/test-vir-publication
lake exe demo-slides
```

Prepare fresh root/nested sites and the unchanged native/bounds corpus using the
[existing setup](../browser-acceptance/README.md#replay). Then:

```sh
uv run --frozen --project browser-tests pytest -n 2 --browser=all \
  --vir-site-acceptance --site-dir /path/to/fresh/site \
  browser-tests/test_vir_prettym_lifecycle.py browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_geometry.py::test_repeated_formatting_and_reflow_retention
```

Execution used the already installed matching locked Python 3.10.19/
Playwright 1.58.0 environment with its `bin` directory on PATH. Browser tests
control fetch completion or application dispatch solely to test the client;
production uses the unchanged library-owned loader.
