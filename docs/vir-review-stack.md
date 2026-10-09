# Four-commit first Slides formatter patch

Branch: `feat/vir-prettym-main435-four-patch`.
Base: upstream Slides main `682186a561a5d55116969f39bb0699986c3c7fba`.

1. `2579e88`: essential Lean/VIR integration, explicit module assets and basic
   one-shot initialization.
2. `5907a3f`: remove JavaScript prettyM and connect existing panel/lightbox paths
   to mandatory Lean formatting and asynchronous readiness.
3. `1f88a03`: share rich-format parsing, measurement and probe cleanup between
   panels and lightboxes.
4. Focused tests, ordinary downstream example and short integration docs.

Main's Lean **4.35.0-rc4**, Verso revision and transitive dependency records are
retained. The old Demo location correction is already upstream; there is no
Demo or root toolchain diff. The downstream example uses the same toolchain.
Formatting/presentation code is unchanged from the accepted 4.34 candidate;
this rebase updates the producer pin and generated artifact expectations.

VIR PR229 is pinned consistently to public
`3e7dbcf0615305c83bdcb9aa1892ac8b22087d8e`, on VIR main
`8da385661dbed7942456aa9b96bfe14ce7981d6c`. The explicit module asset API and
`Std.Format → Nat → Nat → Array Pretty.Segment` signature are unchanged.
Runtime CID: `6cddc4b897410d7524a69bdaff0327d9f07916735078a0b12d548e2f88c23d20`.
Regenerated program CID:
`00c4cc5794f68178e57d5e37d7b36889abf708abc0ac300337068930db4dd48b`.

## Executed qualification

Executed source: `99ec093deef6021960d3e7638c6a3718762d6677`. Application,
dependency and test bytes match this four-commit tree; only review notes differ.
Intermediate commits were not separately qualified.
[Retained execution evidence](https://github.com/ejgallego/verso-slides/tree/6f3653037663f529fb8ffb64ebe2cb227d0fe886/docs/evidence/main435-adoption).

- Ordinary root/downstream cold and warm builds: 620 jobs each, PASS. Fresh own
  dependency checkouts and owning resource cache/stage; public locked runtime,
  no supplied pack or Wasm source build. Existing toolchain/ordinary Lake caches
  available; no globally isolated or anonymous acquisition-count claim.
- Native driver/publication/fixtures, 20 Node checks and panel TypeScript: PASS.
  Eight fresh native corpus cases equal the retained 4.34 segment/tag results.
- 30 fresh focused Chromium/Firefox checks: PASS in 22.40s, including native
  segments, BigInt tags, annotations/bindings/escaping, numeric recovery,
  root/nested/downstream URLs, panel resize and loading/failure/lightbox readiness.
  Initial test-server setup failed without python on PATH; activated existing
  venv replay passed without source change. Both attempts are retained.
- Six published manifests and 42 payloads match descriptors and hashes.

Producer CI was still running at retained readback; this is local execution,
not a new Slides CI claim. Previous 08e/c227/e415/ba684 acceptance remains
historical 4.34 evidence and is not reused to qualify the new compiler/runtime.

All unrelated additions remain in the
[post-landing queue](https://github.com/ejgallego/verso-slides/blob/todo-after-vir-merge/TODO.md):
document teardown/cancellation, font listeners, extra lightbox reflow,
selector/class fixes, floating banner, budgets, mobile/geometry/retention and
general asset/output policy. Basic readiness/error reporting, existing panel
resize and detached-probe cleanup stay in this patch. One mandatory formatter,
no JSON protocol, recipe/export table, extra library or JS fallback.
No fresh full browser/offline/product campaign, native-provider adoption,
official PR, force-push, merge, release or cleanup.
