# Pretty-printer experiment organization

The main view is a two-dimensional capability matrix. Rows are backend/compiler
families; columns fix the compiled pipeline breadth:

| Breadth | Endpoint |
| --- | --- |
| Layout | Low-level styled layout output |
| Semantic | Annotation-resolved sibling nodes |
| HTML | Complete escaped token HTML, before DOM commit |

Each supported cell maps to one canonical candidate. Gray cells are genuinely
unsupported and do not fall back. Pipeline total is the primary cross-backend
metric because runtimes and adapters still differ; phase tracks explain those
differences.

Custom Lab retains focused ABI and host diagnostics. A preset is an
experimental view, not a claim that every internal ABI is identical. Every
view starts from the same compact `Std.Format`, annotations, column budget, and
visible-format call sequence at the Verso panel boundary.

| Preset                     | Backends                       | Variable                                            | Held fixed                                   | Interpretation                                                    |
| -------------------------- | ------------------------------ | --------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| VIR output boundary        | VIR Format, VIR Flat           | Copied tagged segments versus text plus flat events | Typed input, VIR runtime, `prettyM`          | Cost of VIR output representation                                 |
| VIR rendering boundary     | VIR Resident, VIR Render       | JS tag resolution versus Lean-resolved semantic nodes | Resident ID, package tables, VIR runtime, `prettyM`, annotations, HTML semantics | Cost and ownership shift at the rendering endpoint                |
| VIR host materializer      | VIR Render, VIR Direct DOM     | HTML-string construction + parse versus DOM construction + fragment commit | Resident ID, package tables, VIR call, semantic render plan, columns, final populated DOM | Cost of the browser endpoint after the VIR boundary               |
| VIR input residency        | VIR Flat, VIR Resident         | Imported tree versus package-resident ID            | Flat output, VIR runtime, `prettyM`          | Cost of transferring/reconstructing a static format               |
| All backends               | All available                  | Several variables at once                           | Source format and columns only               | Exploratory overview; do not attribute a delta to one cause       |

Named diagnostics live in **Custom Lab**. Selecting one leaves the main matrix
and activates its exact concrete candidate set. The URL records matrix mode,
families, breadth, and resolved candidates—or the matching diagnostic ID—so a
view can be shared and reproduced. The historical VIR JSON transport diagnostic
has been phased out; the compatibility candidate is not part of the main matrix.

## Timing envelope

The main number is configurable, so a result must name its selected
scope. In particular, “JS time” is not one indivisible quantity:

| Phase                | JS includes                                                       | Cross-runtime meaning                                                |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Input preparation    | Compact-tree deserialization and render-context setup             | Public input converted into the backend-owned representation         |
| Backend execute      | `prettyM` plus construction through the selected JS breadth | Backend-owned computation through its declared layout, semantic, or HTML endpoint |
| Output normalization | Zero: JS already produced the shared segment form                 | Backend output validated or converted into browser-ready segments or semantic nodes                  |
| Host construction    | Layout: annotation/HTML work; semantic: HTML only; HTML: zero | Browser-ready output converted into an HTML string or detached DOM fragment when the selected breadth has not already done so |
| DOM commit           | `innerHTML` parse/replacement                                     | Detached output committed into a populated host element; fragment candidates transfer their constructed nodes |
| Host total           | Host construction + DOM commit                                    | Browser-ready semantic output through equivalent populated DOM; primary materializer metric |
| Pipeline total       | All five phases above                                             | Public compact input through equivalent populated DOM; layout and paint excluded |

Thus the default **Pipeline total (committed DOM)** includes the extended
annotation processing, host construction, and DOM commit for every backend.
**Backend execute** does not: it ends at the selected cell's declared endpoint.
For JS HTML it therefore includes annotation lookup, escaping, and span
construction; for JS Layout it ends at tagged segments. The old
pre-insertion envelope remains available as **Pipeline prepare**, but it stops at
unequal HTML-string/fragment states and is diagnostic only. Layout, paint, control
rendering, and startup are outside pipeline total.

The runtime-neutral Lean entrypoint
`VersoSlides.Pretty.formatRenderedForRuntime` has an intentionally
narrow execute envelope: `prettyM`, text collection, UTF-8 offset
tracking, style-event construction, and the final text join. Both FIR
and VIR can compile that same definition. Its output normalization and
shared HTML phases remain in JavaScript, so execute and total retain
the same interpretation across those runtimes.

## VIR semantic rendering experiment

`VIR Render` and `VIR Direct DOM` call
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
JavaScript validates the lifted nodes without copying them and resolves
the small plan-local slot. `VIR Render` escapes text and attributes and
materializes an HTML string; its commit phase parses that string with
`innerHTML`. `VIR Direct DOM` instead uses DOM properties to create a
detached `DocumentFragment`, then commits its children with
`replaceChildren`. Neither path reconstructs style events or looks annotations
up again. Both timed paths end with equivalent populated DOM. Host total is
the controlled verdict; construction and commit stay separate to explain the
tradeoff. Its guided DAW therefore shows only **Build** and **Commit**, scaled
by **Host total**; VIR execution and the full five-phase trace remain available
as diagnostics in Custom Lab. Layout and paint remain outside the timing envelope.

The semantic plan is also intentionally compatible with a future React
endpoint: its annotation entries are props-like records and its ordered
nodes map directly to string children or `span` elements. This demo does
not load React, because doing so would change the runtime under test. If
Verso adopts React, the preferred Lean VDOM target is React's element and
props model rather than a second general-purpose VDOM vocabulary.

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

## Pending FIR HTML breadth

JavaScript and VIR now both provide canonical HTML cells. Their backend execute
phase includes layout, annotation resolution, escaping, and token-span
construction; only the common DOM commit remains in the host. Exact rendered
HTML is checked before timing interpretation.

The FIR cell is activated by a separately published package satisfying
[`contracts/fir-native-html-v1.json`](contracts/fir-native-html-v1.json). It
compiles `VersoSlides.Pretty.formatHtmlForRuntime`, is staged as
`lean-native-html/`, and registers as `native-html`. The host adapter and assembly
path are already present, so the cell stays gray until the artifact is staged
and becomes selectable without a UI change afterward. See
[`handoffs/fir-wasm-html-runtime/AGENT_TASK.md`](../../handoffs/fir-wasm-html-runtime/AGENT_TASK.md).

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
