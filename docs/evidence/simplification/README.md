# Simplified first-client integration qualification

Executed source: `4d66d3cffe44338f6c16435737ab4c43fcff9898` on `feat/vir-prettym-simplified-integration`.
Source/test files were unchanged while the final commands ran; committing only
recorded those bytes. The review successor will regroup the same tree into three
commits; short review notes may differ. Old candidate `edf3fdb` is preserved.
No Slides PR, merge, release or CI run is asserted.

## Pair and scope

Lean4.34.0 (`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`), VIR
`ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`, public PR217.
Runtime `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`;
pack SHA256 `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`
(1,120,731 bytes), unchanged from prior qualification.
Newly regenerated program `6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995`;
pack SHA256 `cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace`
(77,910 bytes). Actual generated metadata admits one pure export
`VersoSlides.VirPrettyM.formatSegments`, role `formatSegments`, protocol
`verso-slides-format-segments-hostabi-v3`,
`Std.Format → Nat → Nat → Array Pretty.Segment`.
The inspected return descriptor is array(tag16), structure Segment(tag20),
fields text:String and tags:Array Nat. This inspection is retained evidence;
production admission uses generated metadata without a second frozen contract.

Library-key carrier moves to the package source root with default Lake module
selection. No source-dir recipe, resource wrapper module, private producer path,
namespace alias policy, result envelope or global URL object remains. The
existing writer consumes VIR SiteFiles. Initialization remains one-shot with
raw diagnostics, pending cancellation and resolved disposal. The two-library
build prerequisite is retained to compile the formatter before embedding it.

## Local executed checks

- Final ordinary demo/test-target build:757 jobs. Earlier native build:758 jobs.
- Warm independent default-deck application rebuild:743 jobs. It has its own
  dependencies/buildDir but shares the local Slides source/build cache. This is
  not fresh anonymous cold installation. No manual pack seeding, Wasm source
  build or private producer command was used for this checkpoint.
- Native formatter:8 checks; publication pass; config17 and renderer24 pass.
- Node:43 checks including raw late-disposal Error/null/undefined evidence,
  cancellation, diagnostic sink failures and persisted/terminal pagehide.
- TypeScript panel project and JS bundle coverage pass. The initialization module
  is in the existing panel project; no separate loader typecheck config.
- Focused published acceptance:45 passes in Chromium145.0.7632.6 and Firefox146.0.1.
  Root/nested/downstream URLs, direct array result including empty/tagged formats,
  complete native segments/tags/DOM classes/bindings/escaping, numeric admission
  and same-instance health, reflow, pending creation/instantiation cancellation,
  loading readiness ordering, static navigation, persisted/terminal pagehide.
- Three routes have byte-identical16 resource files; six manifests/42 payload
  hashes and compatibility fields verified. Loader URLs are relative attributes.
- Settled ordinary warm build leaves all four pack cache/stage byte/stat values
  unchanged. Withholding only the owning-library source stage is repaired by
  ordinary prerequisites; bytes match and other three pack stats stay unchanged.

## Observed failures and limits

`build.log` records the requested exact Demo rollback failing: the pinned Verso
source has withNl on line78, while original Demo requested77. The one-line78 fix
is necessary and belongs in review commit3, as the maintainer chose.
`typecheck-red.log` records missing dynamic-import module mode; ES2020 in the
existing panel config resolves it without another project.
`browser-initial.log`:44 pass, one inventory failure after overlaying the new
application output onto old output. The existing writer deliberately retains
stale files, leaving the oldf8 manifest. Re-rendering into a fresh destination
produces the final45-pass run; no production change was made for this fixture.
`warm-settling-*` records program-cache inode/mtime replacement (same bytes)
after mixed root/transitive target work. Settled warm and stage-repair results
are recorded separately; do not treat that first comparison as a no-op pass.
No broad mobile/geometry/performance/offline/cold-install rerun is claimed.
Namespace casing/aliases and resource budgets are deferred first-landing policy.
Full scripts/test.sh and unrelated native tests were not rerun.

## Independently queried upstream CI

`upstream-pr.json` records exact ff65 head, OPEN draft217, all four jobs SUCCESS
in [run37327449728](https://github.com/ejgallego/lean-vir/actions/runs/37327449728).
This is upstream CI status, not a downstream execution or another agent report.

Commands, manifests, generated interface and raw logs are retained here outside
the landing diff. `ledger.json` hashes every other retained file.
