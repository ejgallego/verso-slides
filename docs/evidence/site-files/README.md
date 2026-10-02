# Direct VIR site-files adoption

Executed source: a92d77b736ac42b6f186690bbe927f051f867fc3.
Baseline: b367e3d0f53b7e094d166ae5543e195aec2233e7.
Exact public VIR7d69b9a09b0c946333d1b6358341be251306f161 (draft PR213),
Lean4.34.0/compiler293d5d0c0c3f3dded4688b3ccd6a33939ac5102b.
Lakefile, manifest rev/inputRev and independent owning dependency checkout agree.
Runtime832/d06 and v2 programf8/85dd are byte-identical; full ledger in results.json.

## Implementation

Deleted the complete49-line VirResourceSite module and its generic envelope,
content-path and PublicationPlan machinery. Render consumes VIR SiteFiles
without a second wrapper type. Its small prepareVirSite helper only enforces
Slides' one-program policy and translates ResourceError into an IO diagnostic.
The ordinary asset writer, namespace reservation, relative loader URLs and
nontransactional/stale-file/partial-output semantics remain unchanged.

Removed duplicated generic manifest/integrity tests from Slides; VIR owns those.
Kept application one-program and actual writer tests, adding bootstrap path checks
and a real reserved-namespace rejection that leaves the output directory absent.
No JavaScript/formatter/numeric/lifecycle/recipe/carrier source changed.
No carrier-key/v3/runtime-build expansion.

## Actually executed locally

- lake update lean_vir selected exact public7d69; no toolchain or unrelated
  dependency revision changed (manifest only rev/inputRev for lean_vir).
- lake build demo-slides test-vir-publication test-config-validation:751 jobs,
  success. Subsequent focused test-vir-publication rebuild includes the added
  before-write namespace test; success.
- test-vir-publication: single-program/writer/bootstrap URL/stale-file/partial
  failure/recovery and namespace-before-writes cases pass.
- test-config-validation: all46 filename/namespace cases pass.
- Ordinary demo rendered fresh. All113 production file paths, sizes and SHA256s
  match previous baseline output byte-for-byte. Root/nested copies use identical
  returned loader URLs; four manifests/all28 payload hashes checked. Runtime and
  program packs independently rehashed unchanged.
- Focused Playwright: all12 Chromium/Firefox/static checks pass. Actual typed
  formatter calls at root/nested match native corpus; full segments/tags and DOM
  associations match; numeric rejection leaves the same program usable; ordinary
  proof panel reflows through the actual published loader. Only published output
  is served; no producer-path/runtime-cache browser dependency.

Commands:

```sh
lake update lean_vir
lake build demo-slides test-vir-publication test-config-validation
lake build test-vir-publication
.lake/build/bin/test-vir-publication
.lake/build/bin/test-config-validation
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-site-files-20261002/site" \
  --junitxml=.qualification-site-files-20261002/browser.xml \
  browser-tests/test_vir_prettym_creation.py::test_exact_pair_published_bytes \
  browser-tests/test_vir_prettym_presentation.py::test_published_formatter_has_one_mandatory_path \
  browser-tests/test_vir_prettym_site.py::test_same_wrapper_native_corpus \
  browser-tests/test_vir_prettym_presentation.py::test_complete_native_segments_tags_classes_and_bindings_in_dom \
  browser-tests/test_vir_prettym_presentation.py::test_vir_numeric_admission_keeps_the_same_program_usable \
  browser-tests/test_vir_prettym_site.py::test_default_panel_reflows_with_wasm
```

Existing independent warm development cache; ordinary owning-library facets,
without supplied/manual producer command or Wasm source build. Fresh scratch
demo-images render, copied root/nested routes; native corpus produced by unchanged
test-pretty binary/code from qualified numeric baseline. All formatter/JS/lifetime
and corresponding tests are Git-byte-identical to that checkpoint, whose7 native/
43 Node/36 broader browser results remain evidence of those unchanged bytes.
They are not claimed as a new campaign at this source. Playwright environment
unchanged: Python3.10.19/pytest9.0.2/Playwright1.58.0/Chromium145/Firefox146.

## CI and limits

Independent GitHub readback: PR213 exacthead7d69, open/draft. Its run36989194732
completed FAILURE in runtime-lean's resource cache gate (cache.mjs285,3 !==5).
Retained raw failed-step log. This is not a local consumer failure or green CI;
producer owner must resolve/review it. No Slides PR, merge or release requested.
No new cold/offline acquisition, full upstream lifetime, broad geometry/mobile,
performance campaign or Slides CI run. Local qualification does not close the
upstream CI/product/publication gates. Evidence remains outside the landing diff.
