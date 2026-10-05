# Library-key carrier adoption

Executed Slides source: `4d135bc7c51c14ed0e1e4e1fa084e2a1e6c7de33`.
Baseline: reviewed `ac17787b2979bbdd74dde98999f7c92c15c34782`.
Selected public VIR: `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9` (draft PR217).
Lean4.34.0, revision293d5d0c0c3f3dded4688b3ccd6a33939ac5102b, virVersion1.

## Bounded change

The carrier uses `include_vir_library VersoSlidesVirPrettyMResources`. Slides
no longer spells the generated pack path in its Lean carrier. Owning library,
source directory, preparation prerequisite and recipe are unchanged. VIR owns
artifact location. The ignore rule covers generated directories below source
roots. Only the dependency revision, carrier expression, comment/short docs and
ignore rule change; no renderer, formatter, JS, runtime options or test source
change. No v3, budgets, retry, fallback or new shared API.

The exact dependency checkout and lakefile/manifest rev/inputRev agree. Upstream
since the older pin includes resource-path validation changes, besides carriers;
output equivalence was measured, not inferred solely from the API announcement.

## Actual local execution

- `lake update lean_vir`, then ordinary owning-library/demo/publication/native
  test-target build: success,754 Lake jobs (built and replayed jobs).
- Warm ordinary owning-library/demo build: success. All four runtime/program
  cache/stage packs preserve checksum,size,inode and mtime. Replayed producer
  stdout in warm.log is Lake replay, not evidence of new producer execution.
- Withheld only the prepared source-local program stage into owned scratch;
  ordinary build restored it byte-identically. Program cache and runtime stage/
  cache stats unchanged. New source-root stage is observed only by qualification;
  it is not renderer input or an application setup step.
- Publication's one-program/namespace-before-write/stale/partial-failure/recovery
  tests pass; native segment oracle: all7 checks pass.
- Fresh demo render: all113 production files match baseline path,size and SHA256.
  Root/nested routes retain identical relative loader URLs and resource bytes.
- Tracked default-deck copied into a fresh application directory, changing only
  the local Slides dependency path. Ordinary `lake build` with custom talk-build
  succeeds (745 jobs); native exe renders. The application declares only Slides.
  Its inherited VIR checkout is exactff65. Fresh application .lake/talk-build and
  independently acquired runtime cache/stage match832/d06; no runtime bytes or
  dependency caches were manually seeded in that application. The local Slides
  source/build cache remains shared: this is not a full anonymous cold installation.
  Normal VIR acquisition uses the committed public HTTPS runtime lock, with no
  source Wasm build/private producer command/loader workaround.
- Root/nested/downstream inventories: all16 resource files byte-identical per
  route; six envelopes/all42 payload hashes checked. Runtime832/d06 and actual
  programf8/85dd packs are unchanged; no old pack substituted.
- Focused actual-loader Chromium/Firefox/static checks:18 passed (15 primary,
  3 downstream). Full native segments/tags and DOM associations, panel reflow,
  pending/instantiation cancellation, persisted/terminal pagehide and fresh page
  initialization, plus normal downstream formatter calls/interaction.

Commands are retained in commands.txt. Browser commands (existing Playwright
Python environment on PATH, executing from Slides source):

```sh
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-library-carrier-20261005/site" \
  --junitxml=.qualification-library-carrier-20261005/browser.xml \
  browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_site.py::test_same_wrapper_native_corpus \
  browser-tests/test_vir_prettym_site.py::test_published_host_call_and_lifecycle \
  browser-tests/test_vir_prettym_site.py::test_default_panel_reflows_with_wasm \
  browser-tests/test_vir_prettym_presentation.py::test_complete_native_segments_tags_classes_and_bindings_in_dom \
  browser-tests/test_vir_prettym_lifecycle.py::test_document_termination_cancels_pending_creation_without_late_install
python -m pytest -n 2 --browser=all --vir-site-acceptance \
  --site-dir "$PWD/.qualification-library-carrier-20261005/site" \
  --junitxml=.qualification-library-carrier-20261005/downstream-browser.xml \
  browser-tests/test_vir_prettym_site.py::test_published_bundles_and_urls \
  browser-tests/test_vir_prettym_site.py::test_independent_deck_uses_published_runtime
```

Raw logs, before/after snapshots, inventories/native results and exact inherited
manifest are retained here with24 hashes in results.json. verify-site.py records
local verification against scratch layouts; it is qualification code, not a new
production publication validator. Historical broader numeric/one-shot/geometry
checks cover unchanged production/test bytes and are not relabeled as a fresh
campaign. All tested production/test files remain identical when regrouped for
three-commit review; review notes alone change. Intermediate commits unqualified.

## Gates and limits

Exact-head PR217 CI37327449728 remained pending at recorded GitHub readback;
upstream-ci.json records actual head/check state, not old-head success. Producer
owns its CI/landing. No Slides PR,CI,merge,release,cleanup or force-push.
No broad Node/browser/mobile/geometry/performance or offline matrix rerun;
no Wasm rebuild, no full anonymous-cold-install claim. Previously retained wider
qualification remains tied to its exact source/artifact scopes. Carrier adoption
adds no open API decision; future pin/ABI changes need their own explicit handoff.
