# Four-commit first Slides formatter patch

Branch: `feat/vir-prettym-four-patch`.
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

## Qualification

Executable code and tests match qualified source
`f5e59bcca34b8ec0eaff6677a139c06dc6f0f809`. Later changes explain asset
ownership/publication in source comments and ignore generated example output;
these review notes also differ. The four-commit regrouping preserves the previous
final implementation/test bytes exactly. No tests were rerun for comments/ignore
or commit regrouping; intermediate commits are not independently qualified.
[Exact commands/logs/oracle/JUnit/manifests/packs](https://github.com/ejgallego/verso-slides/tree/786dd3c6b3b15f022f2a65202967b179c230b1cc/docs/evidence/scoped-first-patch)
are retained outside the landing diff. Intermediate commits are not separately
qualified. Previous reviewed branches and full-candidate evidence are preserved.

Executed locally:20 Node checks and TypeScript pass; ordinary native/publication/
fixture test driver passes; root/downstream default builds742 jobs pass;
30 focused Chromium/Firefox checks pass, including raw native arrays/tags,
existing HTML/interaction, numeric rejection/recovery, relative resource URLs,
ordinary downstream, panel resize, slow/failing initialization and pending
lightbox readiness. Six manifests/42 payload entries match the actual packs.
The runtime/program are unchanged; changed application bytes have fresh coverage.

## Exact pair and open distribution gate

VIR37d2eb99f85f58b295dbf67996b0b7492366bd8e, Lean4.34.0/compiler
293d5d0c0c3f3dded4688b3ccd6a33939ac5102b; descriptor2/resource3/ABI4/manifest9/IR11.
Runtime CIDd72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c;
SHA6127371c45aecfc4a064c993060963b78612977acf1444f74889f1ee7856f814.
Program CIDba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a;
SHA2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150.

Producer source/runtime publication is still separate (`source: -`). Qualification
used independently retained source/supplied pack and seeded caches. No fresh public
cold/offline install, CI, mobile/advanced-geometry/retention gate, official Slides PR,
merge or release is claimed. Commits are unsigned; signing configuration unchanged.
