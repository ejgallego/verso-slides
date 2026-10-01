# Generated interface checkpoint

Executed Slides source: `679ca44ad12079a2fbd6f3f70882f0ad4ea3f7e3`.
VIR: `590be72bd91519c7beb89e105dfba498a4aff140`; Lean 4.34.0.
Full resource identities and retained-file hashes are in [results.json](results.json).

The maintainer selected the generated Lean callable metadata instead of a
separate frozen ABI snapshot. This removes that JSON file, the `expectedExports`
bootstrap/global wiring and its exclusive comparison test. VIR already supports
omitting this optional argument; its resource validation and generated metadata
remain responsible for admission and marshalling. No replacement type generator
or API was introduced. The small resource recipe remains build configuration.

## Executed locally

- 42 Node tests passed: `node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs Tests/pretty-presentation.test.cjs` ([log](node.log)).
- Warm native build passed, 763 jobs: `lake build demo-slides test-fixtures-build test-vir-publication` ([log](build.log)).
- Publication tests passed: `.lake/build/bin/test-vir-publication` ([log](publication-test.log)).
- Fresh demo rendering passed ([log](render.log)); root and nested publication
  verification matched four manifests and 30 payloads ([inventory](publication.json)).
  Root HTML shrank by 11,614 bytes compared with the preceding one-shot output.
- 32 focused Chromium/Firefox checks passed in 14.97 seconds
  ([log](browser.log), [JUnit](browser.xml)). Actual published VIR creation uses
  the generated interface without `expectedExports`. Checks retain complete
  native segment/tag comparisons, DOM classes/bindings/escaping, same-program
  recovery after expected errors, document cleanup and repeated formatting/reflow.

Browser command, with the existing Playwright environment active:

```sh
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-generated-abi-20261001/site" \
  --junitxml=.qualification-generated-abi-20261001/browser.xml \
  browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_geometry.py::test_repeated_formatting_and_reflow_retention
```

The demo executable was run in a fresh scratch directory containing the ordinary
`demo-images`; its output was copied to root and nested hosting directories.
Unchanged native/bounds/geometry oracles came from the preceding one-shot
checkpoint. Verification used the existing
`docs/evidence/asset-simplification/verify-site.py` against both directories.

## Scope

Runtime `832ab095…` and program `97b280b7…` packs were rehashed and unchanged.
Input admission, Lean bounds, typed application adapter, one-shot ownership and
asset publication remain unchanged. Historical independent-reference evidence
records the former policy; that comparison is no longer a current requirement.

No fresh full native bounds campaign, cold/offline acquisition, broad geometry
matrix or remote CI run is claimed here. The terminal browser failure case uses
a controlled dispatch error on the actual loader-owned program, not a real Wasm
trap. The deferred mobile panel restoration limitation remains open.
