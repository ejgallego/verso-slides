# Numeric input delegation checkpoint

Executed final source: `71eddc1c15aa74737210f72e6a786913a08329c2`.
Earlier build/publication/initial browser source:
`93a611febd1b19b91bcbec471f7b38f68df8779e`.
Only browser lifecycle assertions differ between these sources; production,
native/Node tests and build inputs are identical. Final Node/native and browser
runs use71eddc1. Baseline: fa731b6. VIR590, Lean4.34, runtime832/programf8 unchanged;
full identities/checksums and retained-file ledger are in results.json.

## Change and local acceptance

Slides removes formatScalar and checkFormatDimensions. Compact constructor
shape and pixel measurement remain application concerns; numeric values pass
unchanged to VIR's existing Nat/Int marshaller, which admits safe numbers,
BigInts and decimal strings and rejects invalid representations.

Request failure recovery uses the existing Program.status. Active instances
remain owned/usable, with untouched errors reported and rethrown. Failed/disposed
instances close formatting for the document. There is no error-message parsing,
exception-class guess, wrapper that loses the primary error, recreation or replay.
This explicitly broadens the former PrettyFormatError-only recoverability rule:
a controlled application dispatch error with an active program is recoverable,
including a synthetic WebAssembly.RuntimeError thrown outside the runtime.
Actual runtime failure status still closes formatting. No VIR error/API contract
was changed or guessed.

- Four new Node regressions fail against actual baseline fa731b6 adapter/bootstrap;
  all43 final Node checks pass. Tests cover unchanged scalars/dimensions, raw
  Error/null/undefined recovery and terminal failure/disposal behavior.
- Native build753 jobs and ordinary publication passed; all7 native cases pass.
- Initial browser run:30 passed/4 failed. Two legacy assertions in each browser
  assumed a local numeric error code or disposal from exception class despite
  active runtime status. Retained initial logs show this openly. Compact shape
  rejection still has the local error code; the dispatch test now covers both
  actual active and explicitly disposed instances.
- Final36 Chromium/Firefox checks pass. Seven actual VIR numeric rejections
  preserve one instance, then number/negative Int/exact decimal/BigInt inputs and
  a valid followup call succeed. Existing full text/tags/DOM, binding/escaping,
  lifecycle/persisted-pagehide/reflow/retention checks remain covered.
- Runtime and program packs rehashed byte-identical; four root/nested manifests
  and all28 payload hashes verified.

## Commands and scope

```sh
node --test Tests/pretty-presentation.test.cjs Tests/vir-bootstrap.test.cjs
lake build demo-slides test-pretty test-vir-publication
.lake/build/bin/test-pretty
.lake/build/bin/test-vir-publication
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-numeric-input-20261002/site" \
  --junitxml=.qualification-numeric-input-20261002/browser.xml \
  browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_geometry.py::test_repeated_formatting_and_reflow_retention
```

For the Node red, current tests were copied into a scratch tree with actual
fa731b6 pretty.js/bootstrap.js and run with test-name-pattern selecting the four
new cases. The existing independent warm Slides Lake cache was used; ordinary
VIR facets prepared identical v2/runtime packs. The demo rendered into a fresh
scratch directory with demo-images; output copied to root/nested routes; native
and geometry corpora came from test-pretty. Existing Python3.10.19/pytest9.0.2/
Playwright1.58.0, Chromium145.0.7632.6 and Firefox146.0.1 environment.

Terminal browser dispatch is controlled disposal, not a real Wasm trap; Node
fixtures separately cover failed status. No fresh cold/offline acquisition, broad
geometry, mobile/product gate or CI run claimed. The v3 migration and local
forSite helper are not adopted. Raw evidence stays outside the landing diff.
