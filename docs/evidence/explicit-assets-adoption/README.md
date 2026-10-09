# Explicit module assets: exact Slides qualification

Executed source ec267f4 (full ID and root/leaf locks in executed-source.json).
The four-commit review successor changes only short review notes. Intermediate
commits not separately qualified. Previous35b/494 and all historical evidence remain;
raw evidence is outside the landing diff.

## Integration change

Exact public VIRc2278f3679ceefc067b9db4c74692dca0bc43a03, sole494 parent.
Ordinary public import Vir.Resources.Assets provides include_vir_assets and owned
Runtime.bundle. Asset library needs one +VersoSlides.VirPrettyM:virResourcePack.
Existing public resources value returns ResourceSet; renderer and publication test
reuse it, removing repeated assembly and direct Runtime imports. No self-library
facet, bare marker, old contextual include, extra library/key/recipe/alias/options.
The source-root .vir-generated ignore is obsolete and removed: own program is
materialized in .lake/build/lib/lean/vir-assets/VersoSlides/VirPrettyM.virres.
VIR runtime source staging stays inside its ignored dependency checkout. No
application decoder/loader/path workaround or hidden build during elaboration.

## Fresh local execution

- Ordinary root/leaf public Git resolution independently selects exactc227;
  root rev/inputRev and generated leaf manifest agree. Other dependency/toolchain
  caches shared; owning runtime cache/stage and root app build output initially
  empty, no supplied runtime. Parent app output shared via ordinary path dependency,
  leaf talk-build initially absent; ordinary Lake artifact caching enabled.
  Not all-package unseeded or network/environment isolation.
- Root/downstream cold lake build743 jobs PASS each, one anonymous standard public
  runtime download per cold build. Warm builds743 jobs PASS, no further download;
  cache/stage/program input hashes/inodes/mtimes unchanged. Test-only curl observer
  logs only locked URL and disables config/netrc; no URL/payload substitution.
- Actually acquirede415/runtime and regeneratedba684/program match previous identity
  and complete descriptor/pack hashes. Public lock/source/compatibility unchanged.
  No Wasm source build. Root .vir-generated is absent after actual owning build.
- TypeScript PASS; sequential lake test -- --no-playwright PASS:20 Node,51
  fragmentize,24 rendering,36 comment-parser,8 formatter,17 configuration,
  real-renderer publication and all fixture generation. Ordinary root demo/leaf
  executable render and eight-case same-wrapper native oracle generation PASS.
- An initial root driver overlapped downstream compilation through their shared
  parent build tree and failed fixture generation on missing VersoSlidesVendored.olean.
  Raw ordinary-tests-overlap.log retained. The complete sequential rerun passed
  without source change. This is a retained failed local execution, not a claimed
  producer defect or a guarantee of concurrent Lake safety. Subsequent shared
  parent compilation/render operations were serialized.
- **30 focused Chromium/Firefox checks PASS in18.80s** against emitted root/nested/
  downstream pages and fresh code fixture: complete native segments/BigInt tags,
  FQName/no aliases, classes/bindings/escaping, numeric rejection/same-program
  recovery, ordinary downstream, existing panel resize, slow/failing initialization
  and pending lightbox readiness. New execution, not relabelled494 browser reuse.
- Six manifests/42 payloads verified. Complete113 root/112 downstream emitted files
  remain byte-identical to accepted35b/494 output. No manually authored manifests.

## Exact artifacts

Lean4.34.0/compiler293d5d0c0c3f3dded4688b3ccd6a33939ac5102b;
descriptor2/resource3/ABI4/manifest9/IR11.
Runtime e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd,
SHA3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7,
1,120,065bytes. Public anonymous source unchanged.
Program ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a,
SHA2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150,
77,764bytes. Full declaration/pure Array Segment/BigInt ABI unchanged.

## Scope and replay

Ordinary root and examples/default-deck builds, then warm builds. Serialize jobs
that share the parent build tree. lake test -- --no-playwright; TypeScript;
lake exe demo-slides and leaf lake exe my-talk. Emit oracle via
lake exe test-pretty --host-abi-corpus. Assemble ordinary emitted root output in
SITE, copy to nested/deck, leaf to downstream/custom, fresh _test/code to code,
and oracle to native-corpus.json. Existing focused pytest command:

```sh
python -m pytest browser-tests/test_vir_prettym_site.py \
 browser-tests/test_vir_prettym_presentation.py \
 browser-tests/test_vir_prettym_initialization.py \
 browser-tests/test_lightbox.py::TestLightboxReadiness \
 --vir-site-acceptance --site-dir /absolute/SITE --browser all -v
```

Producer Pack/cache/cycle/editor/transitive/quoted gates are another agent's
reported evidence, not fresh execution by Slides. No fresh exactc227 CI, old CI
reuse, generic runtime/geometry/font/retention/mobile/offline campaign, native/main/
alias composition or postponed feature work. No official PR/force-push/merge/
release/cleanup. Existing forSite/writer/bootstrap/presentation behavior preserved.
Draft-status.json records initial pre-handoff preparation, not final qualification.
ledger.json hashes every other retained file; packs are execution copies, not
supplied inputs to the cold public-source builds.
