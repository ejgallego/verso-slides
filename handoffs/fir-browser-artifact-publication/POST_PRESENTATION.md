# Deferred FIR browser-artifact publication follow-up

Status: intentionally deferred until after the presentation.

The demo currently consumes explicit immutable FIR Flat and HTML
packages. A producer publishes a package, Verso copies its checksummed
browser subset into the workspace-local seed, package-specific
validators admit it, and assembly copies it into the ignored generated
site. This is reliable for the demo, but it still requires producer
coordination and prior knowledge of each package layout.

## Small next step

Add the producer-owned `browser-benchmarks/source-package/v1`
discovery layer without replacing the Flat or HTML contracts:

1. FIR publishes a checksummed `SOURCE_PACKAGE.json` sibling inside
   each new immutable package.
2. The descriptor records source and Lean toolchain identity,
   adapter/API and operation inventory, startup and per-call timing
   fields, transfer ownership, output schema, artifact
   checksums/imports/exports, and non-provisional acceptance status.
3. FIR's package verifier regenerates that projection from
   authoritative build metadata and Wasm inspection, compares it
   byte-for-byte, and requires it in `SHA256SUMS` before updating the
   `*-current` pointer.
4. Verso gains one generic discovery/catalog check, then continues
   through the existing Flat or HTML semantic validator. Discovery
   must not weaken output-specific parity, escaping, tag, or ownership
   checks.
5. A self-service refresh command accepts an explicit immutable
   package path, validates it, and updates only the workspace-local
   seed. It must not read arbitrary directories or silently select a
   producer worktree.

## Boundary decisions already made

- The bounded runtime is the artifact boundary. Its Lean version is an
  existential package witness, not a version pin inherited from the
  host deck.
- `render` is the production operation. `prepare`, `execute`, and
  `decode` are diagnostics; factories expose a separate
  startup/construction inventory.
- Operation-local phase names remain package facts, not a universal
  timing ontology. Verso owns the explicit mapping into its comparison
  envelope.
- Public JavaScript input is borrowed and immutable; encoded Lean
  graphs are fresh and transferred to the entry; decoded output is a
  JavaScript copy.
- Only accepted, non-provisional packages can enter the demo matrix.

## Acceptance test

A clean checkout with a built FIR producer should be able to:

1. generate and atomically publish new immutable Flat and HTML
   packages;
2. discover both through the generic descriptor;
3. refresh the Verso workspace seed without hand-copying files;
4. rebuild the lab from an empty staged-artifact directory; and
5. pass package smoke plus the full backend × breadth DOM-parity
   smoke.

Do not add a registry service, remote artifact store, or generalized
build orchestrator in this step. The goal is to remove mailbox
dependence while preserving the working local package boundary.
