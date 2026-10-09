# Slides main / VIR PR229 / Lean 4.35 qualification

Executed Slides source: `99ec093deef6021960d3e7638c6a3718762d6677`.
Upstream Slides main: `682186a561a5d55116969f39bb0699986c3c7fba`.
VIR PR229: `3e7dbcf0615305c83bdcb9aa1892ac8b22087d8e`, on VIR main
`8da385661dbed7942456aa9b96bfe14ce7981d6c`.
Toolchain: `leanprover/lean4:v4.35.0-rc4`, compiler
`c29b6dda4f7c20e3eeaa717c4e565663c5cfa364`.

The four-commit review successor has the same application, dependency and test
bytes as the executed source. Only review notes change. Intermediate review
commits were not separately qualified. The old 08e/c227/e415/ba684 pair and
[its evidence](https://github.com/ejgallego/verso-slides/tree/c1f722480b7bab55c5c8ad06bc0d22e525e8134e/docs/evidence/explicit-assets-adoption)
remain historical Lean 4.34 results; none was reused as 4.35 acceptance.

## Local execution

- Fresh isolated worktree, new root and downstream dependency checkouts, empty
  owning VIR cache/stage and app outputs. Ordinary `lake build` cold and warm
  passed for root and `examples/default-deck`: 620 jobs each. Builds sharing the
  parent application tree were serialized. No supplied runtime pack, producer
  worktree symlink or Wasm source build. Existing toolchain and ordinary Lake
  artifact caches were available; no claim of globally isolated caches or
  anonymous/network-isolated acquisition counts.
- Main's exact Verso/transitive dependency records are retained. Root rev/inputRev
  and generated downstream manifest select the exact PR229 source above.
  Both owning runtime copies match the public lock, SHA256 and compiler profile.
  The formatter pack was regenerated under 4.35 and matches both builds.
- `lake test -- --no-playwright` passed: 20 Node, 51 fragmentize, 24 render,
  36 parser, 8 formatter, 17 configuration cases, ordinary publication checks and
  fixture generation. Standalone Node checks and panel TypeScript also passed.
- Root `lake exe demo-slides`, downstream `lake exe my-talk`, and fresh
  `lake exe test-pretty --host-abi-corpus` passed. All eight complete native
  segment/tag results equal the retained 4.34 corpus.
- 30 focused Chromium/Firefox checks passed in 22.40s: fresh native comparisons,
  full-name calls, raw BigInt tags, annotation classes/bindings/escaping, numeric
  rejection and recovery, panel resize, loading/failure, lightbox readiness and
  root/nested/downstream URLs. Existing Python 3.10 / Playwright 1.58 test
  environment was activated; Chromium 145 and Firefox 146 were installed.
- Initial browser invocation failed server setup because `python` was absent
  from PATH (2 static checks passed, 28 setup errors). The failed log/JUnit are
  retained. Activating the existing venv gave the complete pass with no source
  change. This was not a formatter/browser regression.
- Six emitted manifests and 42 payloads match complete descriptors and hashes.
  Inventories retain 113 root and 112 downstream emitted-file hashes. No claim
  that new 4.35 output is byte-identical to old 4.34 output.

## Exact artifacts

Runtime CID `6cddc4b897410d7524a69bdaff0327d9f07916735078a0b12d548e2f88c23d20`;
SHA256 `8fbf3dd2cc065c714ba17b7093edbcd1e285e7fc6353b7b7594c5031781dccf3`;
1,114,116 bytes. Public release URL is retained in `runtime-lock.json`.

Program CID `00c4cc5794f68178e57d5e37d7b36889abf708abc0ac300337068930db4dd48b`;
SHA256 `ba9165b0d91edb0fb3e66276daf0cde8cefc255d67f4508bcd19e72fb0e5a46a`;
77,891 bytes. Full declaration and pure Array Segment contract unchanged.
`artifacts.json` retains complete descriptors; three packs are copies of actual
execution outputs, not supplied inputs.

## Replay and limits

Run ordinary root cold/warm builds and native driver sequentially, render the
root demo, then build/render `examples/default-deck`. Emit the native corpus.
Assemble root output in SITE, its copy in nested/deck, downstream output in
downstream/custom, fixture _test/code in code, and native-corpus.json at SITE root.
In an activated pytest/Playwright environment:

```sh
python -m pytest browser-tests/test_vir_prettym_site.py \
 browser-tests/test_vir_prettym_presentation.py \
 browser-tests/test_vir_prettym_initialization.py \
 browser-tests/test_lightbox.py::TestLightboxReadiness \
 --vir-site-acceptance --site-dir /absolute/SITE --browser all -v
```

Raw logs, JUnit, manifests, inventories and packs are retained here; `ledger.json`
hashes every other evidence file. `draft-status.json` records pre-handoff state,
not current completion. Producer CI readback is separate from local execution;
it was still running when captured. No new Slides CI, full browser suite, offline,
geometry/font/retention/mobile campaign or native-provider adoption. All deferred
features remain after the first Slides landing. No official PR, force-push,
merge, release, cleanup or upstream source write.
