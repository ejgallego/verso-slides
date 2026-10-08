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

## Dedicated-source qualification in progress

The latest selection pins exact public VIR49445aa0 consistently in Lake and the
manifest. Compared with qualifiedcfa, only two producer guides differ; production
code, runtime lock, smaller configuration/include and application source/tests
are unchanged. Previous235/bda and af261da/cfa remain historical candidates.

Fresh root ordinary build passes741 jobs. Its actually regeneratedba684 program
and anonymously acquirede415 runtime match the preceding qualified bytes exactly.
The actual prepared locator selects the root pack. Downstream/build/publication/
native oracle and full emitted-site comparisons are in progress. Matching emitted
bytes will retain the existing30-browser/20-Node/TypeScript/native-driver evidence;
no repeat browser or generic runtime campaign is requested for a guide-only
producer difference. This is evidence reuse, not new execution at494.

VIR `49445aa0063639af99e3b820da0d4f1457b01ca6`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.

No exact494 CI success or oldcfa/bda CI adoption claimed. Upstream217/223 and
CI remain separately owned; no native/layout/alias/runtime adoption. No fresh
Slides CI, offline/mobile/advanced geometry/retention, official PR, force-push,
merge or release. Keep every postponed feature deferred after first Slides landing.
