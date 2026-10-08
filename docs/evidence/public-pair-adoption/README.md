# Exact public VIR pair adoption

Executed source: `925c4b4` (full commit in executed-source.json), based on the
four-commit576295f candidate. Production/test bytes stayed unchanged through
qualification. The review successor regroups four commits and changes only its
short review notes. Intermediate commits are not independently qualified.
Raw qualification artifacts stay outside the landing diff; history remains intact.

## Local execution

- Exact public Git dependency `bda79d5c4ab7d061c971fcd8917f536393ec03ee`
  independently cloned by root and ordinary downstream Lake resolution. Both
  root rev/inputRev and generated downstream lock select that same commit.
- Ordinary `lake build` passed742 jobs in each checkout. Owned VIR runtime
  source checkout/cache/stage and application build output were fresh, no supplied
  runtime was copied. Other dependency caches and the Lean toolchain were shared;
  Lake artifact caching was enabled. This is not an all-package unseeded install.
- Each build made one anonymous download from the public locked release URL.
  observe/curl merely counts that known URL and invokes /usr/bin/curl with local
  curl configuration/netrc disabled. It never substitutes URL or payload bytes.
  Standard VIR/Lake acquisition performs verification and installation; no private
  loader, special build command or Wasm source build is used.
- Ordinary warm root/downstream builds passed. Download counters stayed1 each;
  cache/stage SHA256, inode and nanosecond mtime remained unchanged. Before/after
  snapshots and raw logs are retained. No network isolation/offline test is claimed.
- `lake test -- --no-playwright` passes20 Node,51 fragmentize,24 rendering,
  36 comment-parser,8 formatter,17 configuration, publication and fixture generation.
  Standalone20 Node checks and TypeScript also pass.
- `lake exe demo-slides`, `lake exe my-talk`, and
  `lake exe test-pretty --host-abi-corpus` pass. The eight-case native oracle was
  compared against emitted pages, not the historical JS formatter.
- **30 focused Chromium145.0.7632.6/Firefox146.0.1 checks pass in17.21s**:
  root/nested same-wrapper complete native segments/BigInt tags; exact full-name
  calls/no aliases; classes/bindings/text and attribute escaping; numeric rejection
  and same-program recovery; ordinary downstream; existing panel resize; basic
  slow/failing initialization and pending lightbox readiness. Raw logs/JUnit retained.
- Six emitted manifests/42 payloads across root/nested/downstream match actual
  acquired packs and content identities. No hand-written manifests or publisher.

## Exact identities

Lean4.34.0/compiler293d5d0c0c3f3dded4688b3ccd6a33939ac5102b;
descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`;
1,120,065 bytes. Runtime JS is ec9a019d; Wasm a80e04db unchanged from the
historical d72 pair. Actual matching runtime pack was acquired and tested anew.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`;
77,764 bytes. Regeneration leaves program bytes/identity unchanged. Full declaration
VersoSlides.VirPrettyM.formatSegments returns Array Pretty.Segment with BigInt tags;
no aliases, recipes, extra interfaces, application budget layer or backend fallback.

## Independent upstream readback versus reported evidence

upstream-ci.json is a fresh GitHub readback: exact bda run37681767020 completed
SUCCESS, all four jobs green. Upstream anonymous/native/three-package acquisition
results in the producer PUBLIC-DELIVERY report were reported by Module, not run
by this Slides owner. No fresh Slides CI was triggered or claimed.

No cold-offline, broad generic runtime, advanced geometry/font/retention/mobile
campaign is included. Deferred work stays on todo-after-vir-merge and starts after
the first Slides patch lands. No API migration, d390/d901 adoption, producer writes,
PR opening, merge, release, force-push or cleanup is authorized or performed.

## Replay

Start from the exact executed source in a fresh worktree. Resolve dependency via
ordinary lake update/build; leave the owning runtime cache/stage empty and supply
no pack. The selected public runtime lock supplies its HTTPS release source. Root
and examples/default-deck use their ordinary default targets. Then run warm builds,
ordinary lake test -- --no-playwright, root/downstream executable site generation,
standalone Node tests and TypeScript. Copy root _slides to SITE and nested/deck,
downstream _slides to downstream/custom, fresh _test/code to code; emit the oracle
with lake exe test-pretty --host-abi-corpus to SITE/native-corpus.json. Run:

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

ledger.json hashes every other retained file. Packs are retained for review of
actual execution; acquisition qualification used the public source, not those
retained copies. Root and downstream program pack paths may share the owning
path-dependency source staging; duplicate retained packs denote installed bytes,
not independently owned formatter compilers.
