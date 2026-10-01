# Formatter budget deferral checkpoint

Executed source: `141161a5910bc6a3d895dc87a7136c1d31e8c898`.
VIR `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0.

The maintainer deferred JS/Lean application resource budgets and their exclusive
checks to a later PR. The wrapper now calls Std.Format.prettyM directly. Exact
compact constructor/scalar conversion and the existing pure Except/v2 ABI remain;
the simpler array-result proposal is a separate coordination item.

Executed locally: 39 Node checks, seven native semantic checks, native build
753 jobs, publication tests, and 32 focused Chromium/Firefox checks all passed.
Fresh root/nested output inventories were verified. Full identities and raw
log/JUnit hashes are in results.json. The program pack changed to f8c7b00e;
runtime832/d06 remained unchanged. Historical bounded results do not qualify it.

Commands:

```sh
node --test Tests/pretty-presentation.test.cjs Tests/vir-bootstrap.test.cjs
lake build demo-slides test-pretty test-vir-publication
.lake/build/bin/test-pretty
.lake/build/bin/test-vir-publication
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-minimal-20261002/site" \
  --junitxml=.qualification-minimal-20261002/browser.xml \
  browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_geometry.py::test_repeated_formatting_and_reflow_retention
```

The existing Playwright environment was used. Warm development cache bytes were
copied from the independent Slides first-landing checkout; VIR's ordinary facet
prepared the new program pack. The demo executable rendered in a scratch
directory with demo-images, and output was copied to root/nested routes.
Fresh native/geometry oracles came from test-pretty's corpus options.

No fresh acquisition/offline, broad geometry or CI campaign was run. The terminal
browser failure is controlled dispatch on the actual program, not a real Wasm
trap. The generic mobile panel restoration limitation remains deferred.
This archive is outside the landing diff and not required by builds or tests.
