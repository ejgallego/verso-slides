# Three-commit PrettyM review stack

Branch: `feat/vir-prettym-434-review`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`, the final module-system
conversion commit. The earlier module-system changes are outside this review.

## Review order

1. **Lean formatter and VIR integration** (`b3aa38a9e84bd5f4d951cb1529162cbaa9865803`).
   Bounded Lean segment formatting; immutable Lean/Verso/VIR dependencies;
   public resource carrier and library-owned Lake preparation; one validated
   publication plan; CLI/managed deck output; complete independent v2 ABI
   reference, bounded JavaScript ABI admission, and accepted lifecycle bootstrap.
   The base's existing presentation remains until the next commit. This is a
   migration step, not a supported second backend or release checkpoint.
2. **Use VIR and remove JavaScript layout** (`f121310d7a70eddd1ddccba8bb4a22d6c32d8d18`).
   Switch panels and lightboxes together; delete the handwritten layout
   implementation; retain one shared measurement, annotation and DOM
   presentation layer. There is no production formatter selector or fallback.
3. **Tests, examples and evidence** (the commit adding this guide).
   Native, Node and browser regression tests; test registrations/driver;
   downstream example; current documentation and retained qualification history.
   Production resource/build infrastructure is in commit one; test infrastructure
   is here.

## Preservation and qualification

The accepted development branch `feat/vir-prettym-434-candidate` remains at
`3f7dbc93f10f1ed2ef88ee65dda9019b5c298233`. No existing branch was rebased,
force-pushed or deleted. All 366 tracked files from that accepted checkpoint
were compared byte-for-byte with this review branch. They are unchanged; this
guide is the sole added file. The accepted source tree ID is
`6c857e136c3a434a83417d7d9c7ed806e1e8edab`.

The final runtime/program pair remains exact VIR
`af3052cac2740f41bd701de3646df348b7e2dbb3`, supplied runtime `832ab095`,
program `97b280b7`. Full identities, checksums and executed commands are in
[publication/adoption evidence](evidence/publication-adoption/README.md).
That owner-run qualification passed 46 focused Chromium/Firefox checks,
50 Node checks plus one independent emitted ABI reference, 24 native HTML
checks, 32 configuration checks, publication/installation tests and ordinary
root/downstream builds.

Module accepted the exact supplied-pack checkpoint in
`VIR-SLIDES-AF3052-QUALIFICATION-ACCEPTED-20261001-001`: its independent review
matched 50 ledger entries, six manifests and 45 declared payloads. Module did
not rerun the owner's campaigns.

This reorganization ran no new native/browser tests or builds. Historical
results keep their original commit references; they are not presented as runs
against these new commit IDs. Intermediate migration commits have not received
independent build/browser qualification. Historical comparison and long
correspondence remain available in the existing branch and retained documents.

Anonymous durable runtime acquisition and final product acceptance remain open.
Resource lock source `"-"` means supplied-pack qualification. The resource writer
remains single-writer/nontransactional. No upstream source/API/runtime bytes or
producer output changed while preparing this review stack.
