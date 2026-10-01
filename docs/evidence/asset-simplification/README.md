# Asset simplification and VIR successor

Executed Slides source: `cfe1f9f2c7b9d7ffe9174daf879bff8f327d2a71`.
VIR: `590be72bd91519c7beb89e105dfba498a4aff140`, verified as the public
PR #207 head before adoption and again after local qualification.
Lean 4.34.0; runtime `832ab095…`, program `97b280b7…`.
[Full identities, commands and results](results.json).

## Application change

- One program manifest URL replaces the multi-program map and logical-ID search.
- The renderer receives its bootstrap internally and emits it inline. There is
  no generated `vir-bootstrap.js` and no mutation of `Config.extraJs`.
- One validated resource plan supplies URLs and files to the existing asset
  writer. The separate staged directory writer is removed. `lib/vir` and its
  `lib` parent remain protected against configured asset collisions and aliases.
- Publication writes in place, retains stale/unrelated files, and may leave
  partial output after failure. It requires one writer. This is not transactional
  site deployment; generic asset APIs and deployment management remain separate.

Source inspection confirms one `ResourceSet.bundles` call during preparation,
which performs the upstream integrity validation once. The renderer reuses that
plan and does not validate/enumerate bundles again while writing. Browser resource
validation remains a separate trust boundary. No speculative caching was added.

## Local execution

- Owning-library build passed: `lake build demo-slides test-config-validation
  test-vir-publication test-pretty test-fixtures-build` (771 jobs).
- 46 configuration/namespace cases, all 101 native formatter cases and 50 Node
  admission/presentation/bootstrap tests passed.
- Publication tests cover invalid single-program plans, descriptor/payload byte
  equality, actual renderer output, one inline bootstrap, absence of the private
  stage, repeated writes, stale-file retention, partial failure and recovery.
- A fresh source archive and empty artifact/runtime caches passed ordinary
  `lake update`, `lake build`, `lake exe my-talk`, and a warm `lake build`.
  Artifact-cache reads/writes were explicitly enabled; no `--no-cache`, supplied
  bytes, implicit Wasm source build, special producer command or retry was used.
  One anonymous public runtime download occurred and 3,184 cache files were
  populated. Build/render/warm-build times were 192.316/1.619/1.599 seconds; these
  include Lake work and are not isolated publisher timings or comparative claims.
- Warm offline render and restored warm render passed with no transport calls.
  Native empty-cache `--offline` failed with `RESOURCE_OFFLINE_MISS` and no
  writes/transport. Ordinary empty-runtime build under transport denial failed
  with `RESOURCE_DOWNLOAD_FAILED`; packs were restored afterward. These offline
  checks use `--no-cache` and a curl/wget observer, not an OS airgap.
- Fresh root, nested and independent downstream sites have six exact manifests
  and 45 payloads. Both pack hashes match the historical accepted pair.
- All **119 Chromium/Firefox checks passed**, including inline startup, strict
  creation, cancellation/disposal/retry, static navigation, native segment/tag
  equality, escaping/bindings, panel/lightbox interaction, font-loading/resize,
  480/800/1280px geometry, repeated formatting and bounded retention.
  [Full JUnit cases and measurements](browser.xml) retain the actual observations.

The first native build had a test-only reserved-keyword error, corrected before
the executed source commit. An isolated fixture render initially lacked image
inputs. The first browser invocation lacked `python` on PATH for its HTTP server;
the corrected environment reran all 119 checks. These failed setup runs are
retained and are not counted as passing acceptance.

## Evidence and limits

`logs/` retains complete native/build/browser/offline logs, including the
compressed repetitive browser setup failure (`gzip -dc` to inspect).
`source-sha256.txt`, `raw-sha256.txt` and `published-sha256.txt` identify inputs
and outputs. `publication.json`, `online-transport.jsonl` and
`offline-results.json` retain byte inventories and acquisition observations.

Upstream CI at exact `590be72b` was inspected through GitHub: all checks in
[runtime CI](https://github.com/ejgallego/lean-vir/actions/runs/36890158682) and
[candidate CI](https://github.com/ejgallego/lean-vir/actions/runs/36890158674)
succeeded. These are upstream results, not local execution or Slides CI.

The historical `c7f9c2d`/`87d7646d` evidence remains unchanged. Fresh default-cache
mode and the broader Wasm bounds campaign were not repeated here. This checkpoint
does not close the separately reproduced mobile DOM-restoration product gate;
its correction remains scheduled after the first Slides patch lands.

## Replay

From this branch with Lean and Playwright browsers installed:

```sh
lake build demo-slides test-config-validation test-vir-publication test-pretty test-fixtures-build
.lake/build/bin/test-config-validation
.lake/build/bin/test-vir-publication
.lake/build/bin/test-pretty
node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs Tests/pretty-presentation.test.cjs
python3 docs/evidence/landing-qualification/ordinary-downstream.py \
  . cfe1f9f2c7b9d7ffe9174daf879bff8f327d2a71 /path/to/fresh/scratch enabled
python3 docs/evidence/asset-simplification/offline-checks.py /path/to/fresh/scratch
python3 docs/evidence/asset-simplification/verify-site.py \
  /path/to/fresh/scratch/source/examples/default-deck/_slides
```

For browser replay, follow the [existing site/fixture/corpus setup](../browser-acceptance/README.md#replay)
using the current renderer and freshly built downstream site. Add
`browser-tests/test_vir_prettym_creation.py` to that six-file pytest command.
The execution here used the already installed, matching locked Python environment
(Python 3.10.19, Playwright 1.58.0), with its `bin` directory on PATH; test sources
and lock are retained by hash. Replay tools are test orchestration, not production
build requirements or private acquisition APIs.
