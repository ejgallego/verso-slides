# Pretty-printer experiment matrix

The demo organizes backends by the question a comparison answers. A
preset is an experimental view, not a claim that every internal ABI is
identical. Every view starts from the same compact `Std.Format`,
annotations, column budget, and visible-format call sequence at the
Verso panel boundary.

| Preset                     | Backends                     | Variable                                            | Held fixed                                   | Interpretation                                                    |
| -------------------------- | ---------------------------- | --------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| End-to-end implementations | JS, VIR Format, Native, LLVM | Complete implementation and adapter path            | Source format, columns, final HTML semantics | Product-level comparison; phase breakdown explains boundary costs |
| VIR input transport        | VIR JSON, VIR Format         | JSON/string versus typed Lean object ABI            | VIR runtime, `prettyM`, segment output       | Cost of VIR input representation                                  |
| VIR output boundary        | VIR Format, VIR Flat         | Copied tagged segments versus text plus flat events | Typed input, VIR runtime, `prettyM`          | Cost of VIR output representation                                 |
| VIR input residency        | VIR Flat, VIR Resident       | Imported tree versus package-resident ID            | Flat output, VIR runtime, `prettyM`          | Cost of transferring/reconstructing a static format               |
| All backends               | All available                | Several variables at once                           | Source format and columns only               | Exploratory overview; do not attribute a delta to one cause       |

Manually changing backend checkboxes creates a **Custom selection**.
The URL records both the resolved backend list and the matching preset
ID, so a view can be shared and reproduced.

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

When FIR publishes a direct flat-output entrypoint, register it as
`native-flat` without replacing `native`. Add a **FIR output
boundary** preset containing exactly those two backends:

```text
native       browser Format → PrettyTrace → panel segments
native-flat  browser Format → text + UTF-8 style events → panel segments
```

The input adapter, compiler/runtime, format corpus, width, and final
HTML must remain fixed. The useful result is the change in execute,
decode, payload size, and total time. Package-resident native input is
a separate later experiment; combining it with flat output would
prevent attribution.

## Artifact ownership

- Verso owns the compact input, annotations, experiment UI,
  normalization, and final HTML rendering.
- This demo owns preset definitions and artifact composition.
- VIR, FIR-native, and LLVM packages own their raw runtime boundaries
  and provenance.
- Deck-specific resident tables are generated during assembly; they
  are not a generic FIR or VIR ABI requirement.
