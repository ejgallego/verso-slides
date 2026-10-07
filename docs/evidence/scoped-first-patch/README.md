# Scoped first Slides patch qualification

Executed source: `f5e59bcca34b8ec0eaff6677a139c06dc6f0f809`.
Parent review: c4c136a. Source/test bytes were unchanged during the focused browser
run. The public successor regroups three commits; only short review notes differ.
This evidence is outside the landing diff. Full postponed implementations remain
on `todo-after-vir-merge`, with stable IDs, retained sources and upstream links.

## Removed from this first patch

Pagehide/pending cancellation/late disposal, floating page banner, font listeners,
extra lightbox resize, selector/class escaping corrections, diagnostic tag spans,
extra panel/lightbox cleanup and geometry/retention infrastructure. Their exclusive
tests and native geometry-corpus mode are postponed too. Historical evidence at
f7a6b517 still belongs to that full source, not this reduced implementation.

The first patch keeps direct full-name typed VIR formatting, raw BigInt tags,
existing HTML/annotation/binding behavior, ordinary measurement/panel resize,
one-shot asynchronous readiness, expression loading/failure, and same-program
recovery for rejected requests. Failed runtime status closes formatting without
recreation or fallback. Detached-probe cleanup stays because readiness/failure
notifications can redraw during formatting. Bootstrap is55 lines.

## Executed locally

- Node20/20 pass; TypeScript pass.
- Ordinary root/default and downstream/default builds742 jobs pass; both ordinary
  executable site-generation paths pass. Warm dependency/build caches were copied
  from the preceding checkout; source/runtime caches are seeded.
- Ordinary lake test -- --no-playwright passes20 Node,51 fragmentize,24 rendering,
  36 comment-parser,8 formatter,17 configuration, publication and fixture generation.
  Both initial and final driver logs retained (final label says initialization).
- **30 Chromium145.0.7632.6/Firefox146.0.1 checks pass** in16.51s: root/nested
  eight-case same-wrapper corpus, full raw segments/tags, existing classes/bindings/
  text and binding-attribute escaping, large IDs, exact full-name inventory, numeric
  admission/recovery, ordinary downstream, panel resize and basic slow/failing
  initialization including an already-open panel/lightbox. Test-only decimal
  projection asserts actual returned tag type; no production adapter.
- All6 resource manifests and42 payloads verified across root, nested and downstream.
  Both actual staged packs exactly match the prior supplied pair; frontend changes
  have their own fresh acceptance, not recycled55-test coverage.

## Exact preserved pair

VIR37d2eb99f85f58b295dbf67996b0b7492366bd8e, Lean4.34.0/compiler
293d5d0c0c3f3dded4688b3ccd6a33939ac5102b; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CIDd72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c;
SHA6127371c45aecfc4a064c993060963b78612977acf1444f74889f1ee7856f814.
Program CIDba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a;
SHA2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150.
Actual packs/identities/native corpus/JUnit/manifests and logs are retained here.

Producer source/runtime publication remains separate (`source: -`). No upstream
edits, new shared API/pack, source Wasm build, anonymous public cold/offline install,
fresh CI, mobile product/advanced geometry/font/retention campaign, PR opening,
merge, release, force-push or branch retirement is claimed.

## Replay

With exact source and supplied runtime available, seed through the existing VIR
native acquire tool as documented in the prior lean-names-adoption evidence.
Run ordinary lake build, lake test -- --no-playwright, lake exe demo-slides and
the existing downstream example. Place emitted root output in SITE, copy it to
nested/deck, copy downstream output to downstream/custom, and copy freshly emitted
_test/code to code for the lightbox fixture. Emit native-corpus.json using
lake exe test-pretty --host-abi-corpus. This hosts ordinary emitted bytes; no custom
resource publisher/loader is used.

```sh
python -m pytest browser-tests/test_vir_prettym_site.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_initialization.py \
  browser-tests/test_lightbox.py::TestLightboxReadiness \
  --vir-site-acceptance --site-dir /absolute/SITE --browser all \
  --junitxml browser.xml -v
tsc --noEmit --allowJs --checkJs --target ES2020 --module es2020 \
  --lib ES2020,DOM web-lib/panel/*.js web-lib/panel/*.d.ts
```

ledger.json hashes every other retained file. Source/config/pack caches are warm
and supplied, so this replay is not an anonymous cold-acquisition recipe.
