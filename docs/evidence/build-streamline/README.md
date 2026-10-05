# Reuse existing Slides libraries for resource preparation

Executed source: `521c70d3ff8a56bddc56da0007a71170611f2133` on `feat/vir-prettym-build-integration`.
Tracked source/test bytes were unchanged during final checks; the commit records
those bytes. The public review successor regroups them into three commits, with
short review notes allowed to differ. Historical `d7ed59c` and `edf3fdb` review
branches and their qualification archives remain preserved.

## Small application-owned change

- Existing `VersoSlides` owns `VersoSlides.VirPrettyM`; dedicated formatter lib removed.
- Existing `VersoSlidesVendored` gets one additional needs key for its own
  `virResourcePack`; its module embeds that library-owned pack alongside assets.
- Extra carrier library/module removed. Recipe renamed to match owning library
  `vir-resources/VersoSlidesVendored.json`, content unchanged.
- Renderer/publication test import existing asset module. Public bundle declaration,
  formatter declaration/role/interface, publication paths/writer, JS and lifetime
  code unchanged. No upstream implementation/API or dependency pin change.

This keeps the build graph acyclic: formatter compilation uses the main library's
existing asset/tool prerequisites; resource preparation and embedding belong to
its separate existing asset library. No additional libraries, private build
loader, source-root convention workaround, manual setup or Wasm source build.

## Exact immutable pair

VIR `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`, Lean4.34.0
(`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`), virVersion1.
Runtime content ID `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`,
SHA256 `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID `6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995`,
SHA256 `cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace`.
Both exact packs/ABI are unchanged. Actual generated program bytes were compared;
identity was not inferred solely from unchanged formatter source.

## Local executed evidence

- Default ordinary package build passes:741 jobs. Test targets compile:725 jobs.
- Default warm transitive deck build passes:741 jobs. Application owns independent
  dependencies/talk-build but shares local Slides source/build cache. This is not
  a fresh anonymous cold-install campaign.
- Native8 checks pass; existing ordinary publication tests pass, including exact
  resource-file collisions before writes, manifest URL attributes, all resource
  bytes, repeated/stale/unrelated writes and partial-write recovery.
- Fresh native renders: root113 and downstream112 files are byte-identical to
  preceding qualified simplification outputs; includes HTML/JS/CSS and every
  runtime/program file. Four envelope descriptors/28 payload checks verified.
  Pack bytes/checksums unchanged in actual new owning-library cache/stage.
- Settled default warm build preserves all four pack cache/stage bytes/inode/mtime.
  Withhold only `.vir-generated/VersoSlidesVendored.virres`; default ordinary build
  repairs it with identical bytes, other three pack stats unchanged.

## Retained prior execution and scope

[Earlier immutable simplification campaign](https://github.com/ejgallego/verso-slides/tree/f2e2ec9659a99bb83d36c02b1cc05ba047d8366b/docs/evidence/simplification)
ran Node43 and Chromium/Firefox/static45 checks on source4d66d3c, covering direct
array/native equality, tags/classes/bindings/escaping, numeric errors and healthy
same-instance calls, reflow and one-shot document ownership. Those suites were
not rerun here. Reuse is limited to byte-identical production files/packs; this
checkpoint separately executes affected ordinary preparation/embedding/publication.
No fresh mobile/geometry/performance/offline/cold acquisition campaign or full
scripts/test.sh is claimed. No new upstream/Slides CI query or official PR,
merge/release/cleanup/force push. Existing sources/caches/stages are retained;
old source-stage files are not application inputs.

Commands, raw logs and inventories are retained here outside the landing diff.
`ledger.json` hashes every other retained file.
