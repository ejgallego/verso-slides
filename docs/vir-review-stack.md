# Four-commit first Slides formatter patch

Execution successor of preserved public235aac8.
The final review successor retains the four-commit layout below.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `cb45212`: essential Lean/VIR integration, stock typed Lake registration,
   library-owned resources and basic one-shot initialization.
2. `11a7a96`: remove JavaScript prettyM and adapt existing panel/lightbox paths
   to asynchronous readiness and mandatory Lean formatting.
3. `9234664`: extract shared parsing, measurement and probe cleanup into
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

## Smaller configuration qualification in progress

The adoption selects exact public VIRcfa6ece0, removes virPrograms, adds one bare
formatter Module key to the existing asset library needs, and uses contextual
include_vir_program at the existing Bundle declaration. No extra library, recipe,
key, alias, loader/runtime option, formatting/presentation/lifecycle change.
Private preparation remains owned by VIR; its fixed prerequisite stays required.

Ordinary root/downstream cold builds pass741 jobs each. Owned VIR source/runtime
cache/stage started fresh with no supplied runtime; each acquired publice415 once.
Other dependency/toolchain caches were shared and Lake artifact caching remained
ordinary. Root warm reuse and20 Node/TypeScript pass; remaining focused native/
browser/publication and downstream warm checks are in progress before publication.
The actual regeneratedba684 program and selectede415 pack are byte-identical to
previous qualified235/bda. Its history and evidence remain preserved separately.

VIR `cfa6ece02c1d1b24cb4ee623632a560c25018d08`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.
Both root pin fields and downstream manifest agree. No native223 adoption.

Exact upstream CI37779304197 finished FAILURE: Chromium did not publish its
DevTools port within30s in test:surface:browser, before assertions; dependent jobs
were skipped. That result is separate from local Slides qualification, and no
upstream green claim is made. Existing VIR owner retains CI diagnostics/retry.
No fresh Slides CI, network-isolated/offline, mobile/advanced geometry/retention,
official Slides PR, merge or release claimed. Commits unsigned; config unchanged.
