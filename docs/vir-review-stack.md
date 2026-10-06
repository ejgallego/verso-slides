# Three-patch PrettyM review

Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. Lean formatter and VIR dependency/resource wiring through the existing asset
   library; one-shot initialization and typed JavaScript adapter.
2. Remove the handwritten JavaScript layout implementation and use shared
   Lean-backed panel/lightbox presentation, including safe measurement cleanup.
3. Tests, ordinary downstream example, short documentation and the required
   one-line Demo source-location correction for the pinned Verso version.

Intermediate commits are not independently qualified. The final tree has one
formatter and the pure Array/v3 result. Budgets and unrelated asset/mobile work
remain [separate followups](vir-followups.md).

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
