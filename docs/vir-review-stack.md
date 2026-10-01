# Three-patch PrettyM review

Branch: `feat/vir-prettym-three-patch`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`.

1. `561df0d`: Lean segment formatter, bounds, VIR dependency/resource wiring,
   one-shot bootstrap and typed JavaScript call adapter.
2. `4e9d8cc`: delete the handwritten JavaScript layout implementation and route
   both panels and lightboxes through shared Lean-backed presentation.
3. Tests, the ordinary downstream example and short integration documentation.

The first commit is an intermediate migration step; the final tree has one
formatter. Intermediate commits have not been separately qualified.

Production files and executable tests match
`cb9a8f8815cb4c0bb6c12fd52458cdd332e817cc` from the existing review branch.
Only documentation and commit grouping differ. Raw qualification outputs and
historical correspondence are outside this landing diff and remain in Git
history; they are not required by builds or tests.

## Executed results reused without rerunning

The executed source was `679ca44ad12079a2fbd6f3f70882f0ad4ea3f7e3`:
42 Node checks and 32 focused Chromium/Firefox checks passed, as did the warm
native build and publication tests. Root/nested publication matched four
manifests and 30 payloads. This regrouping preserves those production bytes.
[Immutable results and commands](https://github.com/ejgallego/verso-slides/blob/cb9a8f8815cb4c0bb6c12fd52458cdd332e817cc/docs/evidence/generated-interface/README.md).

VIR remains `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0.
Runtime content ID:
`832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA-256:
`d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID:
`97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58`.
Program pack SHA-256:
`c48f6857c125340a748c983635abe52e8e603fc62fc59ef5cc41746f86b953da`.

No new native/browser/cold-install campaign or CI result is claimed.
Historical qualification remains scoped to its recorded source. Generic mobile
panel restoration, general asset filename validation, output CLI, directory
assets and managed builds remain separate followups after the first patch lands.
