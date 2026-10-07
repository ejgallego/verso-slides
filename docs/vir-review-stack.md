# Lean-name adoption successor

Local branch: `feat/vir-prettym-lean-names`, based on the preserved public
three-patch review `7bee77a03c60b6423ed67a3a682fa85d1eb077c0` below.

The successor replaces the handwritten recipe with the stock owner/module Lake
target, calls the full Lean declaration, and types returned tag IDs as BigInts.
No extra libraries, aliases, resource wrapper, formatter algorithm or lifetime
mechanism is added. Test-only decimal projection checks raw BigInt tags before
crossing the browser/Python JSON boundary.

Exact local VIR: `37d2eb99f85f58b295dbf67996b0b7492366bd8e`, Lean4.34.0,
descriptor schema2/resource compatibility3. Runtime source is `-`; qualification
uses an independently copied supplied pack and warm compilation caches. This is
not fresh public acquisition, CI or permission to merge/publish a runtime.

Runtime CID: `d72d5c8fb8daf0247663eb34bb30abdc2d211927e15836b633ee940830d6150c`.
Runtime pack SHA: `6127371c45aecfc4a064c993060963b78612977acf1444f74889f1ee7856f814`.
Regenerated program CID: `ba68416b65643b594d5a21cbdcf893bc41b80d0df8f2d4e5e1c60fb24145862a`.
Program pack SHA: `2516a1e9560673b45a63a61a1b6d7a8b33843e39c4331c5760ff5afc84b28150`.

Exact executed source, commands/logs, identities and observations belong to the
separate adoption checkpoint; previous results below describe their historical
pair. The public three-commit branch remains frozen until producer publication
and a review successor are deliberately sequenced.

## Historical public three-patch baseline

Branch: `feat/vir-prettym-reviewed`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `9717495`: Lean formatter and VIR dependency/resource wiring through the existing asset
   library; one-shot initialization and typed JavaScript adapter.
2. `ddf0765`: remove the handwritten JavaScript layout implementation and use shared
   Lean-backed panel/lightbox presentation, including safe measurement cleanup.
3. Tests, ordinary downstream example, short documentation and the required
   one-line Demo source-location correction for the pinned Verso version.

Intermediate commits are not independently qualified. The final tree has one
formatter and the pure Array/v3 result. Budgets and unrelated asset/mobile work
remain [separate followups](vir-followups.md).

Executed source: `d1cf6f62e01fd7d91b46b00f902d23e14a2b8fd8`. All production,
test and integration-documentation files match those qualified bytes; only these
short review notes differ. Previous public b636197 remains preserved.
[Exact commands, production red/green, logs and observations](https://github.com/ejgallego/verso-slides/tree/52241579ec6ce69ee2a86de48a2e4fddedcfb1d9/docs/evidence/review-fixes)
are retained outside this landing diff. Review commits are unsigned because
session signing failed; repository signing configuration is unchanged.

## Focused review corrections

A production-source Node regression reproduced terminal redraw detaching a DOM
measurement probe: removeChild cleanup masked the original formatting failure.
One-line container.remove cleanup preserves that failure; faithful DOM model
checks absent-child removal and HTML redraw. The existing browser dispatch test
now exercises shared rendering with active/disposed program status, checking raw
error identity, probe cleanup and one-shot ownership. It is a controlled dispatch
error using a real loader-owned instance, not a Wasm trap/quarantine campaign.

Publication tests use pinned IO.FS.withTempDir. They retain failure, obstruction,
exact bytes/collisions, stale files and repair checks without requiring partial
index.html output. Pixel extents and Wasm capacities remain observations. Native
result/column/text/tags, probe cleanup, finite font reflow and disposal checks
remain. Exclusively hostile-proxy/throwing-sink tests are removed; raw Error/null/
undefined failure and cleanup evidence is retained. No lifetime/API redesign.

Ordinary `lake test -- --no-playwright` now runs the two Node files:41 pass,
then existing native checks/publication and fixture generation; browsers skipped.
Default lake build passes:741 jobs. TypeScript passes. Focused Chromium/Firefox
interaction, semantic/font/reflow and observational retention checks:16 pass.
Only lib/pretty.js changes among113 emitted demo files; all resource files,
loader URLs, inline initialization and actual program/runtime packs are unchanged.
No broad native/browser/cold/offline/mobile campaign or new CI claim.

## Build setup and retained qualification

Existing VersoSlides owns the formatter. Existing VersoSlidesVendored embeds its
pack with one extra needs key: no added libraries/carrier modules or manual setup.
[Earlier build qualification](https://github.com/ejgallego/verso-slides/tree/cb7728af055d649ad56544ff53e9fa1f2d85d17c/docs/evidence/build-streamline)
records ordinary/warm downstream builds, cache/stage repair and113/112 output-file
identity. Those build-only gates are not rerun here; the changed cleanup bytes
have their own focused evidence. Historical broader results remain tied to their
executed source, not relabelled as fresh final-head runs.

Exact VIR: `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`, Lean4.34.0.
Runtime content ID: `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA256: `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID: `6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995`.
Program pack SHA256: `cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace`.
