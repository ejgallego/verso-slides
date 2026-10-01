# Focused browser evidence

[Report and limits](../../vir-browser-acceptance.md).
Executed source: `16e748ab7978e39b30d9fe0c804882461785de6d`.

- `final.log`, `final-build.log`, `final-native.log`: actual complete short logs.
- `results.json`, `cases.tsv`, `geometry.csv`: commands, test inventory, measured
  widths/extents, exact pair, raw font/retention/timing observations.
- `published-sha256.txt`: six manifests, 45 payloads and emitted presentation JS.
- `source-sha256.txt`: frozen test sources and dependency lock.
- `raw-sha256.txt`: full local campaign logs/JUnit hashes, including unsuccessful
  harness-development runs; these were not counted as passing acceptance.
- `mobile-restore-repro.py/json`: independent diagnostic for the remaining UI case;
  success of that diagnostic means the bug reproduced, not feature acceptance.

The first test run compared JSON key order and used a transient `.present`
locator; later mobile tests encountered actual DOM replacement. Another early
comparison inferred the requested width after table content changed intrinsic
sizing. These harness errors were corrected; the final immutable-source campaign
passed all 100 checks. No failed production check was silently truncated or
replaced with a JavaScript formatter. Browser screenshots were inspected locally;
the assertions and numerical evidence retained here do not require those files.

## Replay

Use an isolated checkout of the executed source with a working Lean toolchain,
Python/uv and installed Playwright Chromium/Firefox. Native rendering still needs
its ordinary deck image inputs. Build and render normally:

```sh
lake build demo-slides test-pretty test-fixtures-build
lake exe demo-slides
lake exe test-fixtures-build
(cd examples/default-deck && lake update && lake exe my-talk)
qualification_dir=/path/to/fresh/browser-scratch
mkdir -p "$qualification_dir/site/nested/deck" "$qualification_dir/site/downstream/custom"
cp -R _slides/. "$qualification_dir/site/"
cp -R _slides/. "$qualification_dir/site/nested/deck/"
cp -R examples/default-deck/_slides/. "$qualification_dir/site/downstream/custom/"
cp -R _test/. "$qualification_dir/site/"
.lake/build/bin/test-pretty
.lake/build/bin/test-pretty --host-abi-corpus > "$qualification_dir/site/native-corpus.json"
.lake/build/bin/test-pretty --bounds-corpus > "$qualification_dir/site/bounds-corpus.json"
.lake/build/bin/test-pretty --geometry-corpus > "$qualification_dir/site/geometry-corpus.json"
uv run --frozen --project browser-tests pytest -n 2 --browser=all \
  --vir-site-acceptance --site-dir "$qualification_dir/site" \
  --junitxml="$qualification_dir/results.xml" \
  browser-tests/test_vir_prettym_site.py browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_lifecycle.py browser-tests/test_panel.py \
  browser-tests/test_lightbox.py browser-tests/test_vir_prettym_geometry.py
```

Optional `VERSO_ACCEPTANCE_ARTIFACT_DIR` selects an existing directory for geometry
screenshots. JUnit properties retain raw measured observations. The native oracle
runs the production wrapper, not a JavaScript layout oracle.

To reproduce the separate mobile UI issue, copy `mobile-restore-repro.py` into
`qualification_dir` and run it through this project's uv environment. It uses
that directory's `site/`, starts/stops its own local server, records JSON, and
asserts the currently reproduced loss of handlers. It is outside the passing
pytest suite; no production workaround or new browser runtime API is involved.
