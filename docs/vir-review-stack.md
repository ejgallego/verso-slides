# Four-commit first Slides formatter patch

Branch: `feat/vir-prettym-dedicated-four-patch`.
Successor of preserved af261da/cfa and235/bda; exactly four review commits.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `a942320`: essential Lean/VIR integration, stock typed Lake registration,
   library-owned resources and basic one-shot initialization.
2. `9aaac89`: remove JavaScript prettyM and adapt existing panel/lightbox paths
   to asynchronous readiness and mandatory Lean formatting.
3. `92f8f69`: extract shared parsing, measurement and probe cleanup into
   renderRichFormat; panels and lightboxes delegate to the same implementation.
4. Focused tests, ordinary downstream example, short docs and the required
   one-line Demo source-location correction.

The candidate excludes document teardown/cancellation, font listeners, extra
lightbox resize, selector/class fixes, floating banner, DOM diagnostics and
geometry/retention infrastructure. Implementations/tests are preserved in the
[authoritative post-landing queue](https://github.com/ejgallego/verso-slides/blob/todo-after-vir-merge/TODO.md),
which also consolidates older budgets/mobile/assets/output work and upstream issues.

Basic asynchronous readiness/error reporting stays so selected panels/lightboxes
format once ready. Raw BigInt tag stacks remain exact; the existing nearest
annotation supplies HTML/classes/bindings. Detached-probe cleanup is required
when readiness/error notifications redraw during formatting. There is one
mandatory Lean formatter, no recipe/export table, extra library or JS fallback.

## Explicit-assets qualification in progress

Exact public VIRc2278f36 implements the agreed module facet and ResourceSet
include. Asset library needs +VersoSlides.VirPrettyM:virResourcePack; ordinary
Vir.Resources.Assets import supplies include_vir_assets and the owned runtime.
The renderer and publication test reuse that compiled resources value. Old
contextual include, self-library prerequisite and duplicate assembly are gone.
The obsolete root .vir-generated ignore is removed: program inputs now live
under ordinary Lean library outputs. No new library/backend or formatter change.

Root ordinary cold build passes743 jobs. Actual regeneratedba684/acquirede415
packs match the previous accepted pair. Public-Git downstream/build, native driver
and emitted-page checks complete before review publication. No supplied runtime
or source Wasm build; unrelated caches shared, ordinary Lake artifact caching.
Current35b/494 and historical candidates/evidence remain preserved.

VIR `c2278f3679ceefc067b9db4c74692dca0bc43a03`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.
No new exactc227 CI success/old CI reuse, native/main/alias adoption or broader
geometry/mobile/retention acceptance. No official PR, force-push, merge/release.
