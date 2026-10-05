# Three-patch PrettyM review

Branch: `feat/vir-prettym-carrier-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `439297a`: Lean segment formatter, VIR dependency/resource wiring,
   library-key carrier, one-shot bootstrap and typed JavaScript call adapter.
2. `c554077`: delete the handwritten JavaScript layout implementation and route
   both panels and lightboxes through shared Lean-backed presentation.
3. Tests, the ordinary downstream example and short integration documentation.

The first commit is an intermediate migration step; the final tree has one
formatter. Intermediate commits have not been separately qualified.
The first landing retains budget-free Except/v2. Budgets, the agreed array/v3
migration and unrelated asset/mobile work remain [separate followups](vir-followups.md).

## Qualification

Executed source: `4d135bc7c51c14ed0e1e4e1fa084e2a1e6c7de33`.
All production/test files in this regrouped candidate are byte-identical to that
source. Only short review documentation differs. The reviewed ac177 candidate
and its earlier source/pins/evidence remain preserved.

The carrier uses `include_vir_library VersoSlidesVirPrettyMResources`; VIR owns
the generated artifact location. The owning library, source directory,
preparation prerequisite and recipe remain unchanged. Slides consumes SiteFiles
and its existing writer; no private artifact paths enter renderer code.

Ordinary owning-library/demo/test-target build succeeds (754 Lake jobs), as does
an ordinary transitive default-deck build (745 jobs). Warm stage/cache content,
inode and mtime are unchanged; missing program-stage repair succeeds through
normal prerequisites. Native formatter:7 checks pass; publication tests pass.
The fresh application has independent dependency/runtime directories, but shares
the local Slides source/build cache; this is not a full anonymous cold install.
No manual supplied pack, source Wasm build or private producer command is used.

All113 demo production files match the preceding reviewed output byte-for-byte.
Root/nested/downstream loader URLs and all16 resource files match; six manifests
and42 payloads are checked. All18 focused Chromium/Firefox/static checks pass,
including full segments/tags/DOM, proof-panel reflow, actual-loader pending and
instantiation cancellation, persisted/terminal pagehide, and downstream calls.
Broader unchanged JS/formatter/lifetime evidence is retained historically, not
claimed as a fresh campaign. No broad mobile/geometry/performance/offline rerun.

[Immutable commands, hashes, inventories and retained logs](https://github.com/ejgallego/verso-slides/tree/43368ef14ec66411655c93e950cfea86f433716a/docs/evidence/library-carrier)
remain outside this landing diff. Exact-head [VIR CI37327449728](https://github.com/ejgallego/lean-vir/actions/runs/37327449728)
was pending at recorded readback; producer CI/landing remains separate. No Slides
PR, CI, merge or release is claimed.

Exact VIR: `ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9`, Lean4.34.0.
Runtime content ID: `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA256: `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID: `f8c7b00eb26eb097f7894d13abb2a6198ff827b0fb09deffd3b86cedf475aede`.
Program pack SHA256: `85dd8d25261b5da8e807b4d373dd5db885a5b24480c24d1310525895ad308c3f`.
