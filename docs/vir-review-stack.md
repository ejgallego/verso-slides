# Four-commit first Slides formatter patch

Public-pair execution successor of `feat/vir-prettym-four-patch`.
The final review branch retains the four-commit layout below.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `b3ddb40`: essential Lean/VIR integration, stock typed Lake registration,
   library-owned resources and basic one-shot initialization.
2. `20ff316`: remove JavaScript prettyM and adapt existing panel/lightbox paths
   to asynchronous readiness and mandatory Lean formatting.
3. `7f3fbec`: extract shared parsing, measurement and probe cleanup into
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

## Public-pair qualification in progress

The only adoption changes are the exact dependency pin and manifest, the expected
runtime identity in the existing browser check, and distribution documentation.
Production formatter/presentation/lifecycle code and the program ABI are unchanged.
The historical supplied-pair source and evidence remain preserved separately.

VIR `bda79d5c4ab7d061c971fcd8917f536393ec03ee`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Regenerated program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.

Ordinary root/downstream builds each passed742 jobs with empty owned VIR runtime
cache/stage and one actual anonymous public download. Both warm builds reused the
unchanged pack. Other dependency caches and the toolchain were shared; this is
not an all-package unseeded installation. No supplied runtime or Wasm source build
was used.20 Node checks, TypeScript, and the ordinary native/publication/fixture
test driver passed. Focused emitted-page browser checks are the remaining local
checkpoint before review publication.

Upstream CI run37681767020 was independently read back at exactbda: four jobs
SUCCESS. Upstream acquisition results are separately reported evidence, not local
Slides execution. No mobile/advanced-geometry/retention gate, official Slides PR,
merge or release is claimed. Commits are unsigned; signing configuration unchanged.
