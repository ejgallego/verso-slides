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

## Exact dedicated-source qualification

Final application/test bytes match executed source `0fbe34c`; only these review
notes differ after four-commit regrouping. Intermediate commits not separately
qualified. [Fresh builds/actual packs/native oracle/full output comparison](https://github.com/ejgallego/verso-slides/tree/73a78d7/docs/evidence/dedicated-config-adoption)
are retained outside the landing diff.

Root/downstream ordinary cold and warm builds each pass741 jobs. Owned VIR source/
runtime cache/stage started fresh; one actual anonymous public download per cold
build, no supplied runtime or Wasm source build. Warm cache/stage/program/locator
bytes and metadata remain stable. Unrelated dependency/toolchain caches shared,
parent application output shared via ordinary path dependency, Lake artifact
caching enabled; not all-package unseeded or network-isolated/offline acceptance.
Fresh native formatter checks8/8 and ordinary renderer publication tests pass.
Root/downstream site generation and native oracle generation pass.

Compared with qualifiedcfa, exact494 differs only in two producer guide files;
application/test code is unchanged. Regeneratedba684, acquirede415 and eight-case
oracle are byte-identical. **All113 root and112 downstream emitted files match**,
including complete HTML/CSS/JS/bootstrap/annotations/fonts and resource payloads.
This supports retaining [prior qualification](https://github.com/ejgallego/verso-slides/tree/eb5163f74863eed9083104307f7355c06ed0410c/docs/evidence/small-config-adoption):
20 Node, TypeScript, ordinary native/fixture driver and30 focused Chromium/Firefox
checks, root/nested/downstream, full tags/classes/bindings, numeric rejection/
recovery and basic initialization. These checks were **not rerun at494**; full
byte/source equality justifies reuse. No new geometry/performance acceptance.

## Exact pair

VIR `49445aa0063639af99e3b820da0d4f1457b01ca6`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.
Root pin fields/downstream manifest agree. Smaller needs/fixed prerequisite/
include_vir_program retained; no extra library/key/recipe/API or native223 adoption.

No exact494 CI success, oldcfa/bda CI adoption or fresh Slides CI claimed.
Upstream217/223 source/CI remain separately owned. Historical pair/evidence and
all postponed features preserved. No official PR, force-push, merge or release.
