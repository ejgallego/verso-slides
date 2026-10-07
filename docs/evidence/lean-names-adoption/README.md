# Supplied-pack Lean-name Slides adoption

Executed source: `41b5747c722b8f7519676129e658acbe72ef68a3`, branch
`feat/vir-prettym-lean-names`. Actual production/test bytes were unchanged during
qualification; committing the source occurred during the browser run. Evidence
is retained on a separate local archive branch, outside the landing diff.

Parent public review7bee/d1cf/VIRff65/runtime832/program653 and all previous
evidence remain unchanged. This successor is not pushed, adopted publicly or
regrouped over the existing three-commit review branch.

## Change

Stock `virPrograms` owner/module target replaces the handwritten JSON recipe.
The existing typed adapter calls `VersoSlides.VirPrettyM.formatSegments` by full
Lean declaration name. Raw generated Array/Segment results retain BigInt tag IDs;
existing HTML presentation uses exact decimal strings. No producer-path locator,
new library, wrapper, alias, layout engine, lifetime or writer redesign.

Test fixtures now use BigInts. A browser test-only projection asserts raw tag
type before returning decimal strings to Python/native JSON comparisons. Repeated
calls compare raw tags against BigInt(native decimal) inside JavaScript. Tests
reject short/dependency names and prove the same program remains usable.

## Exact pair and provenance

- VIR local source: `37d2eb99f85f58b295dbf67996b0b7492366bd8e`.
- Lean4.34.0/compiler `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`.
- Descriptor schema2/domain `vir-resource-bundle-v2\n`, resource compatibility3,
  unchanged ABI4/manifest9/IR11 and framing.
- Runtime CID: `d72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c`;
  SHA256 `6127371c45aecfc4a064c993060963b78612977acf1444f74889f1ee7856f814`,
  1,115,089 bytes. JS9a17ab0c/Wasma80e04db as recorded in identities.json.
- Regenerated program CID: `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
  SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`,
  77,764 bytes. Logical identity defaults to module `VersoSlides.VirPrettyM`.
- Runtime source is `-` / available-only. Source commit was fetched locally into
  an independent consumer checkout and the verified pack copied, then acquired
  using VIR's owning native tool. The producer's source/build/stage paths are not
  read by the renderer or ordinary build. Original source/cache can be retained
  independently; the consumer owns its checkout and pack copy.
- Warm compilation caches were copied from the preceding Slides checkout, including
  dependency source checkouts. Root and ordinary downstream source/pack caches are
  therefore seeded. This is not fresh public cold installation or a cache-disabled
  campaign. No implicit Wasm source build or private loader was used.

## Actual local execution

- Node:41/41 pass. Ordinary `lake test -- --no-playwright`:41 Node checks plus
  51 fragmentize,24 render,36 comment-parser,8 formatter,17 configuration,
  publication and fixture generation pass. Playwright explicitly skipped there.
- TypeScript: pass with ES2020 module/target and DOM library. Initial invocation
  omitted --module and failed only on existing dynamic import; both logs retained.
- Ordinary default root build:742 jobs pass. Ordinary leaf default build and
  `lake exe my-talk`:742 jobs/site pass, using the existing example/path dependency.
- Root `lake exe demo-slides` and native corpus generation pass. Root output is
  copied under nested/deck to qualify URL-prefix hosting; downstream output is
  copied under downstream/custom. This is hosting of emitted ordinary output,
  not separate renderer logic or a manually manufactured resource manifest.
- Warm root build after leaf regenerates the shared program/pack, preserving exact
  bytes. A second steady-context warm root build replays without compiling or
  regenerating. Both logs retained; no general performance/cache claim.
- **55 focused Chromium145.0.7632.6/Firefox146.0.1 checks pass** in34.32s:
  full8-case native corpus at root/nested, full tags/classes/bindings/escaping,
  exact numeric admission and same-program recovery, short/dependency-name
  rejection, ordinary downstream formatting/reflow, creation/cancellation,
  one-shot failure/cleanup/pagehide/bfcache, real DOM redraw/probe regression,
  narrow/Unicode/theme/resize/native geometry and actual delayed-font reflow,
  repeated raw formatting/reflow and bounded retention observations.
- Eight observation records and twelve screenshots retained. Pixel extents,
  timings/capacities/GC wrapper counts have their existing diagnostic scope;
  no universal geometry/performance/leak-freedom claim. Mobile below Reveal's
  scroll threshold remains a separate application follow-up.
- All6 emitted resource manifests and42 payload entries verified across root,
  nested and downstream. Both identities/compatibility match the actual staged
  packs. Compared to the preceding demo, non-resource changes are index.html
  (new resource URLs) and lib/pretty.js (full-name call). All8 program payload
  entries are identical; its changed identity/size comes from its descriptor.

## Replay commands

The exact VIR source and pack must be available first. The current local-only
source/lock cannot establish anonymous public replay; publication remains separate.
With the exact dependency checked out and the retained pack copied, seed using
the existing owning tool (paths shown from the Slides root):

```sh
lake build vir_resource_pack
.lake/packages/lean_vir/.lake/build/bin/vir_resource_pack acquire \
  .lake/packages/lean_vir/vir-resources/compatibility.json \
  d72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c \
  docs/evidence/lean-names-adoption/packs/runtime.virres \
  .lake/packages/lean_vir/.lake/build/vir/resources/runtime/d72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c.virres \
  .lake/packages/lean_vir/.vir-generated/VirResourceRuntime.virres
lake build
lake test -- --no-playwright
lake exe demo-slides
lake exe test-pretty --host-abi-corpus
lake exe test-pretty --geometry-corpus
```

The acceptance site contains root output, its nested/deck copy, ordinary leaf
output at downstream/custom and those two corpus JSON files. With the pinned
browser-test environment and browsers installed:

```sh
python -m pytest browser-tests/test_vir_prettym_site.py \
  browser-tests/test_vir_prettym_presentation.py \
  browser-tests/test_vir_prettym_creation.py \
  browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_geometry.py \
  --vir-site-acceptance --site-dir /absolute/acceptance/site --browser all \
  --junitxml browser.xml -v
tsc --noEmit --allowJs --checkJs --target ES2020 --module es2020 \
  --lib ES2020,DOM web-lib/panel/*.js web-lib/panel/*.d.ts
```

No VIR campaign, anonymous cold/offline release acquisition, fresh CI, mobile
product gate, new API, upstream edits, release, merge, force-push or cleanup.
Next: immutable public producer source/runtime handoff and deliberate public
Slides review regrouping/qualification at its appropriate acquisition scope.
