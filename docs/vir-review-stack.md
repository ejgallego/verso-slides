# Four-commit first Slides formatter patch

Branch: `feat/vir-prettym-assets-four-patch`.
Successor of accepted35b/494; exactly four review commits.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `127c754`: essential Lean/VIR integration, stock typed Lake registration,
   library-owned resources and basic one-shot initialization.
2. `0252626`: remove JavaScript prettyM and adapt existing panel/lightbox paths
   to asynchronous readiness and mandatory Lean formatting.
3. `71bbba7`: extract shared parsing, measurement and probe cleanup into
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

## Main / Lean 4.35 adoption

The four commits are rebased onto upstream Slides main
`682186a561a5d55116969f39bb0699986c3c7fba`. Main's Lean 4.35.0-rc4 toolchain,
Verso revision and transitive dependencies are retained. The old Demo source-line
correction is already upstream and drops out of the candidate diff. The downstream
example uses the same toolchain.

VIR PR229 is pinned consistently to public
`3e7dbcf0615305c83bdcb9aa1892ac8b22087d8e`, rebased onto VIR main
`8da385661dbed7942456aa9b96bfe14ce7981d6c`. Its public runtime lock selects
`6cddc4b897410d7524a69bdaff0327d9f07916735078a0b12d548e2f88c23d20`.
The explicit module asset API and pure formatter signature are unchanged.

The previous 08e/c227/e415/ba684 pair and its execution evidence remain preserved
as historical Lean 4.34 qualification. They do not qualify the new compiler/runtime
pair. Current local build and affected client qualification are in progress.
No merge, release, native-provider migration or cleanup is included.
