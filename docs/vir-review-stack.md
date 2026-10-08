# Four-commit first Slides formatter patch

Branch: `feat/vir-prettym-config-four-patch`.
Successor of preserved public235aac8; exactly four review commits.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `cfc442e`: essential Lean/VIR integration, stock typed Lake registration,
   library-owned resources and basic one-shot initialization.
2. `bcfc031`: remove JavaScript prettyM and adapt existing panel/lightbox paths
   to asynchronous readiness and mandatory Lean formatting.
3. `b321b79`: extract shared parsing, measurement and probe cleanup into
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

## Qualification

Final production/test bytes match executed source `0b5e4c2`; only these review
notes differ after regrouping. Intermediate commits are not independently qualified.
[Immutable logs/oracle/JUnit/manifests/packs](https://github.com/ejgallego/verso-slides/tree/3fcb265/docs/evidence/small-config-adoption)
are retained outside the landing diff. Historical235/bda and previous branches remain.

Exact public VIRcfa6ece0 uses the smaller agreed configuration: one bare formatter
Module need alongside the fixed pack prerequisite, no virPrograms, contextual
include_vir_program at the existing Bundle declaration. No extra library/key,
recipe/alias, loader/runtime option or presentation/lifecycle feature. Keep the
preparation prerequisite; inclusion reads prepared input, not current Lake config.

Ordinary root/downstream cold and warm builds each pass741 jobs. Owned VIR source/
runtime cache/stage started fresh, with one actual anonymous public download each
and no supplied runtime/source Wasm build. Warm caches and prepared input are
unchanged. Unrelated dependency/toolchain caches were shared, parent application
output reused by the ordinary path dependency, and Lake artifact caching enabled;
not an all-package unseeded installation or network-isolated/offline campaign.

20 Node checks, TypeScript and the ordinary native/publication/fixture driver pass.
30 focused Chromium/Firefox checks pass: complete native segments/BigInt tags,
FQName/no aliases, HTML/classes/bindings/escaping, numeric rejection/recovery,
ordinary downstream, existing panel resize, slow/failing initialization and pending
lightbox readiness. Six manifests/42 payload entries match. Regenerated program
and runtime packs plus selected emitted HTML/JS are byte-identical to235/bda.

## Exact selected pair and upstream CI

VIR `cfa6ece02c1d1b24cb4ee623632a560c25018d08`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.
Root pin fields/downstream manifest agree. Public494's code matches; cfa adds two
guides. Explicit selectedcfa retained; no native223 or alternative ref adoption.

Upstream run37779304197 independently read back FAILURE: Chromium did not publish
its DevTools port within30s in test:surface:browser before assertions; dependent
jobs skipped. VIR owner notified; no green claim or oldbda CI reuse. This is separate
from local Slides acceptance. No fresh Slides CI, mobile/advanced-geometry/retention
campaign, official Slides PR, merge or release claimed. Commits unsigned.
