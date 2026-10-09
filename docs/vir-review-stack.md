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

## Explicit-assets qualification

Application/test bytes match executed source `ec267f4`; only these review notes
differ after regrouping. Intermediate commits not separately qualified.
[Actual logs/packs/oracle/JUnit/manifests](https://github.com/ejgallego/verso-slides/tree/c1f7224/docs/evidence/explicit-assets-adoption)
are outside the landing diff. Current35b/494 and all prior evidence remain preserved.

One +Module:virResourcePack need prepares the formatter. Ordinary
Vir.Resources.Assets import provides include_vir_assets and the library-owned
runtime. The asset module returns one ResourceSet, shared by renderer/tests;
self-library prerequisite, contextual include and duplicate assembly removed.
Program inputs live under normal Lean library outputs; no source-root staging
in Slides, so its obsolete .vir-generated ignore is removed. No extra library,
carrier key/recipe/alias/options or private loader. Existing writer/presentation stay.

Fresh ordinary root/downstream cold+warm builds743 jobs each pass. Owning VIR
source/runtime cache/stage initially empty, one anonymous public download each,
no supplied runtime/source Wasm build; warm pack/input bytes and metadata stable.
Unrelated dependency/toolchain caches and path-dependency parent output shared;
ordinary Lake artifact caching, not all-package unseeded/network isolation.
TypeScript and sequential native driver pass20 Node, native formatter/publication/
configuration and fixture checks. Initial overlapping shared-cache fixture failure
is retained; complete sequential rerun passes without source change.

30 fresh focused Chromium/Firefox checks pass: full native segments/BigInt tags,
FQName/no aliases, HTML/classes/bindings/escaping, numeric rejection/recovery,
root/nested/downstream, existing panel resize and slow/failing readiness.
Six manifests/42 payloads verified; entire113 root/112 downstream outputs and
actual regenerated program/runtime equal accepted35b/494 bytes.

## Exact pair

VIR `c2278f3679ceefc067b9db4c74692dca0bc43a03`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.
Root pin fields/downstream manifest agree. No exactc227 CI success/old CI reuse,
native/main/alias adoption or broader geometry/mobile/retention acceptance.
All postponed features stay after first landing. No official PR/force/merge/release.
