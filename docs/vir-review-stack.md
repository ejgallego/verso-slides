# Four-commit first Slides formatter patch

Branch: `feat/vir-prettym-public-four-patch`.
Successor of the preserved `feat/vir-prettym-four-patch`.
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

## Qualification

Final production/test bytes match executed source `925c4b4`; only these review
notes differ after regrouping. Intermediate commits are not separately qualified.
[Immutable commands/logs/oracle/JUnit/manifests/packs](https://github.com/ejgallego/verso-slides/tree/2c06928/docs/evidence/public-pair-adoption)
are retained outside the landing diff. Historical supplied-pair branches remain.

Ordinary root/downstream cold and warm builds each pass742 jobs. Owned VIR source,
runtime cache/stage and application build output started fresh; each cold build
made one anonymous download from the public lock. Warm builds kept the same pack
hash/inode/mtime without another download. Other dependency caches and toolchain
were shared, with ordinary Lake artifact caching enabled. No supplied runtime or
Wasm source build was used; this is not an all-package unseeded installation.

20 Node checks, TypeScript and the ordinary native/publication/fixture driver pass.
30 focused Chromium/Firefox checks pass against newly emitted pages: complete
native segments/BigInt tags, exact full names, HTML/classes/bindings, numeric
rejection/recovery, ordinary downstream, existing panel resize, slow/failing
initialization and pending lightbox readiness. Six manifests/42 payloads match.

## Exact public pair

VIR `bda79d5c4ab7d061c971fcd8917f536393ec03ee`, Lean4.34.0/compiler
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CID `e415e41a43eccf298b710056efccf6c3d436d5fceb4e130fb06cb09d12d027dd`;
pack SHA256 `3910c29e40ee68c3b110355fa1d30dae3029f2b34967269642521fc8409848d7`.
Regenerated program CID `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`;
pack SHA256 `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.
Program bytes and client API are unchanged. Both dependency pin fields agree.

Upstream CI run37681767020 was independently read back at exactbda: all four
jobs SUCCESS. Other producer acquisition results are reported evidence, not local
Slides execution. No fresh Slides CI, cold-offline, mobile/advanced-geometry/
retention gate, official Slides PR, merge or release is claimed. Unsigned commits;
signing configuration unchanged. Registration/include UX remains separate VIR work.
