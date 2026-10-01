# Pure array v3 checkpoint

Executed source: `bf9bf7f32176030e6e9e295dd9959a850d6c5cb7`.
VIR `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0.

The agreed client-owned role `formatSegments` now calls the pure
`VersoSlides.VirPrettyM.formatSegments : Std.Format → Nat → Nat → Array Pretty.Segment`
under `verso-slides-format-segments-hostabi-v3`. The former native FormatError
and Except adapter are removed. Resource budgets remain deliberately deferred.

## Executed locally

- 8 native semantic cases, including empty output, nested alignment and nested tags.
- 39 Node presentation/conversion and one-shot lifecycle checks.
- Native build: 753 jobs; ordinary publication tests passed.
- 32 focused Chromium/Firefox checks passed. Direct actual program calls return
  arrays and match the native oracle for all eight cases, as does DOM presentation.
  Lifecycle, healthy-instance conversion rejection, bindings, escaping, reflow,
  terminal/persisted pagehide and repeated-formatting retention remain covered.
- Fresh root and nested output: four envelopes and all 28 payload hashes checked.

Runtime832/d06 is unchanged and was rehashed. New program65334411 has 77,910 bytes;
its checksum and full identities are in results.json and program-identity.json.
Generated-interface.json is extracted from the freshly generated program.irpkg
interface section (kind5, VIR PackageFormat directory and FNV checksum), retained
as inspected output evidence. It is not an admission reference or a build input.
The inspected export is pure; args are Std.Format/Nat/Nat; its result is an array
of structures with String text and Array Nat tags, with no Except constructor.

## Commands and environment

```sh
node --test Tests/pretty-presentation.test.cjs Tests/vir-bootstrap.test.cjs
lake build demo-slides test-pretty test-vir-publication
.lake/build/bin/test-pretty
.lake/build/bin/test-vir-publication
.lake/build/bin/test-pretty --host-abi-corpus
.lake/build/bin/test-pretty --geometry-corpus
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-array-v3-20261002/site" \
  --junitxml=.qualification-array-v3-20261002/browser.xml \
  browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_geometry.py::test_repeated_formatting_and_reflow_retention
```

Warm development cache is an independent copy of the earlier Slides checkout.
VIR's ordinary owning-library facet generated the new pack; no upstream source
or runtime change was made. The demo executable rendered in a fresh scratch
directory containing demo-images; its output was copied to root/nested routes.
Fresh native corpus files were generated from the same wrapper. Existing Python
3.10.19 / pytest9.0.2 / Playwright1.58.0 environment, Chromium145.0.7632.6 and
Firefox146.0.1 were used. JUnit retains browser retention observations.

No fresh cold/offline acquisition, full geometry campaign, mobile/product gate
or CI run is claimed. The browser terminal failure test uses controlled dispatch
on the real program, not a real Wasm trap. Unbounded inputs have no promised safe
completion. Historical bounded/v2 acceptance remains scoped to its own source.
This archive stays outside the landing diff and is not required by builds/tests.
