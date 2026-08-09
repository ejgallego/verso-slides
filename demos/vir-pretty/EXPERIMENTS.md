# Pretty-printer experiment matrix

The demo organizes backends by the question a comparison answers. A
preset is an experimental view, not a claim that every internal ABI is
identical. Every view starts from the same compact `Std.Format`,
annotations, column budget, and visible-format call sequence at the
Verso panel boundary.

| Preset                     | Backends                       | Variable                                            | Held fixed                                   | Interpretation                                                    |
| -------------------------- | ------------------------------ | --------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| End-to-end implementations | JS, VIR Render, FIR Wasm, LLVM | Complete implementation and adapter path            | Source format, annotations, columns, final HTML semantics | Product-level comparison; phase breakdown explains boundary costs |
| VIR input transport        | VIR JSON, VIR Format           | JSON/string versus typed Lean object ABI            | VIR runtime, `prettyM`, segment output       | Cost of VIR input representation                                  |
| VIR output boundary        | VIR Format, VIR Flat           | Copied tagged segments versus text plus flat events | Typed input, VIR runtime, `prettyM`          | Cost of VIR output representation                                 |
| VIR rendering boundary     | VIR Resident, VIR Render       | JS tag resolution versus Lean-resolved semantic nodes | Resident ID, package tables, VIR runtime, `prettyM`, annotations, HTML semantics | Cost and ownership shift at the rendering endpoint                |
| VIR input residency        | VIR Flat, VIR Resident         | Imported tree versus package-resident ID            | Flat output, VIR runtime, `prettyM`          | Cost of transferring/reconstructing a static format               |
| All backends               | All available                  | Several variables at once                           | Source format and columns only               | Exploratory overview; do not attribute a delta to one cause       |

Manually changing backend checkboxes creates a **Custom selection**.
The URL records both the resolved backend list and the matching preset
ID, so a view can be shared and reproduced.

## Timing envelope

The main number is configurable, so a result must name its selected
scope. In particular, “JS time” is not one indivisible quantity:

| Phase                | JS includes                                                       | Cross-runtime meaning                                                |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Input preparation    | Compact-tree deserialization and render-context setup             | Public input converted into the backend-owned representation         |
| Backend execute      | `prettyM`, width measurement, tagged-segment and tag-stack output | Backend-owned layout plus construction of its declared output; VIR Render also resolves annotations |
| Output normalization | Zero: JS already produced the shared segment form                 | Backend output validated or converted into browser-ready segments or semantic nodes                  |
| HTML materialization | Annotation lookup, escaping, binding attributes, and span strings | Browser-ready output converted into the final HTML string; VIR Render already resolved annotations  |
| Pipeline total       | All four phases above                                             | Public compact input through final HTML string, before DOM insertion |

Thus the default **Pipeline total (pre-DOM)** includes the extended
annotation/HTML processing for JS and every other backend. **Backend
execute** does not: JS execute ends at tagged segments. DOM
assignment, layout, paint, control rendering, and startup are outside
pipeline total.

The runtime-neutral Lean entrypoint
`VersoSlides.Pretty.formatRenderedForRuntime` has an intentionally
narrow execute envelope: `prettyM`, text collection, UTF-8 offset
tracking, style-event construction, and the final text join. Both FIR
and VIR can compile that same definition. Its output normalization and
shared HTML phases remain in JavaScript, so execute and total retain
the same interpretation across those runtimes.

## VIR semantic rendering experiment

`VIR Render` calls
`VersoSlides.PrettyRegistry.formatRenderPlanByIdForVir` with the same
numeric ID used by `VIR Resident`. The generated package contains
aligned `Std.Format` and sparse tag/annotation tables. Lean/VIR runs
`prettyM`, maintains the active tag stack, applies the existing
“innermost annotated tag wins” rule, and returns semantic text nodes.
Annotation metadata is interned once per plan; each node carries only
an already-resolved numeric slot.

This is a deliberately flat VDOM. The panel's current result consists
only of sibling text and `<span>` nodes, so a general recursive node
language would add machinery without representing any real output.
JavaScript validates the lifted nodes without copying them, escapes
text and attributes, resolves the small plan-local slot, and
materializes the final HTML string. It does
not reconstruct style events or look annotations up again. Actual DOM
insertion remains outside the measured pipeline and outside VIR, which
keeps this experiment synchronous and comparable to the other paths.

The compiler-neutral
`VersoSlides.Pretty.formatRenderPlanForRuntime` still accepts a typed
Format and annotation table directly. The demo does not use that
object ABI on each reflow: a trial showed repeated structured
annotation marshaling dominated the small formats in this deck. The
resident wrapper is therefore the product candidate; the direct
entrypoint remains useful to other bounded runtimes and focused ABI
tests.

## Measurement levels

1. **Slides:** interactive, synchronous observations on visible
   formats. Use this to inspect correctness, phase shape, and whether
   a hypothesis is worth measuring. The workload selector reduces
   timer noise but does not make the deck a benchmark harness.
2. **VIR benchmark webapp:** warmed, interleaved, adaptive
   measurements across controlled input dimensions. Use this for
   performance claims and graphs.
3. **Observation cards:** a small, forwardable conclusion with
   protocol, provenance, caveats, and owner-facing follow-up.

## Pending FIR output experiment

The current FIR control artifact, source `d4422df…`, still exposes
`fir.prettyM.browser/v1` and `PrettyTrace`; JavaScript post-processing
of that trace would not constitute this experiment.

The required candidate package is specified by
[`contracts/fir-native-flat-v1.json`](contracts/fir-native-flat-v1.json)
and checked by `scripts/validate-native-flat-package.py`. Its browser
API is `fir.prettyM.flat.browser/v1`, its public input and ownership
protocols remain the same as the native control, and its Wasm result
is `text-events-utf8/v1` directly. The artifact is staged separately
as `lean-native-flat/`; it never replaces `lean-native/`. The
preferred Lean target is the compiler-neutral
`VersoSlides.Pretty.formatRenderedForRuntime`; the historical
`formatRenderedForVir` name is only a compatibility alias. The
complete producer handoff is
[`handoffs/fir-wasm-flat-runtime/AGENT_TASK.md`](../../handoffs/fir-wasm-flat-runtime/AGENT_TASK.md).

Once such a package is present, assembly registers `native-flat` and
adds a **FIR output boundary** preset containing exactly the two FIR
backends:

```text
FIR Wasm       browser Format → PrettyTrace → panel segments
FIR Wasm Flat  browser Format → text + UTF-8 style events → panel segments
```

The input adapter, compiler/runtime, format corpus, width, and final
HTML must remain fixed. The useful result is the change in execute,
decode, payload size, and total time. Package-resident native input is
a separate later experiment; combining it with flat output would
prevent attribution.

## Artifact ownership

- Verso owns the compact input, annotations, experiment UI, output
  validation/materialization, and final DOM insertion. VIR Render owns
  annotation resolution for its candidate path.
- This demo owns preset definitions and artifact composition.
- VIR, FIR Wasm, and LLVM packages own their raw runtime boundaries
  and provenance.
- Deck-specific resident tables are generated during assembly; they
  are not a generic FIR or VIR ABI requirement.
