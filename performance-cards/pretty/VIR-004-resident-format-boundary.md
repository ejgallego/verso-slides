# VIR-004: resident Lean formats and flat output remove material boundary work

- Audience: Verso, lean-vir compiler/runtime, and artifact owners
- Status: prototype validated; reproduce in the VIR benchmark webapp
- Priority: integration candidate

## Forwardable summary

> Keeping deck formats in a package-initialized Lean table reduced median VIR input marshal time from 0.050–0.055 ms to 0.010 ms (about 5×) and total time from 0.160–0.165 ms to 0.125 ms (about 1.3×) across 56 real formats and three widths. Flat text/style-event output is most valuable for tag-heavy output: at 128 tags × 256 chunks it reduced the exported payload from 174,081 to 5,330 JSON-character equivalents and total call time from 43.305 ms to 9.000 ms (4.81×).

## Boundary

The experiment adds two independently measurable surfaces while retaining the
existing direct `Std.Format → Array Segment` control:

```text
VIR Flat:
  Std.Format × width × indent → { text, events }

VIR Resident:
  FormatId × width × indent → { found, rendered := { text, events } }
```

Style events are flat numeric records at UTF-8 byte offsets: start-tag,
end-tags, and unstyled-newline. The browser retains annotation lookup, HTML
escaping, and DOM construction.

The deck build deduplicates static rich formats and initializes one Lean
`Array Std.Format` when the VIR package loads. A plain `def` is not equivalent:
the initial prototype rebuilt the complete array on every lookup and regressed
median total time to 1.070 ms. Changing it to `initialize` removed that work.

## Representative deck evidence

Protocol: all 56 unique formats in the generated deck, widths 20/40/80, one
warm-up per case, five interleaved calls per backend (`840` samples each), and
three consecutive campaigns. The table reports the median campaign. Exact
text and styling-event projection were checked on every call.

| Boundary | Marshal median | Execute median | Decode median | Total median | Total p90 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct Format → segments | 0.055 ms | 0.090 ms | 0.010 ms | 0.160 ms | 0.665 ms |
| Direct Format → flat | 0.050 ms | 0.095 ms | 0.015 ms | 0.165 ms | 0.685 ms |
| Resident ID → flat | 0.010 ms | 0.095 ms | 0.015 ms | 0.125 ms | 0.485 ms |

On this ordinary corpus, flat output alone is effectively neutral (3% slower
in the median campaign); resident input plus flat output saves about 22%
against the segment baseline. Across the three campaigns, resident total time
was 21–29% lower even though absolute time varied by about 3× with host load.
The resident result envelope slightly increases decode work, but the avoided
format import dominates.

## Tag/chunk scaling evidence

Protocol: direct typed input, width 10,000, one warm-up, nine timed calls per
point. Payload size is the length of the JavaScript result serialized as JSON,
used only as a representation-size proxy.

| Tags × chunks | Segment total | Flat total | Speedup | Segment payload | Flat payload |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 × 64 | 1.135 ms | 0.620 ms | 1.83× | 1,473 | 87 |
| 16 × 64 | 4.615 ms | 2.940 ms | 1.57× | 5,889 | 740 |
| 64 × 64 | 9.570 ms | 3.955 ms | 2.42× | 21,249 | 2,612 |
| 64 × 256 | 25.450 ms | 8.120 ms | 3.13× | 84,993 | 2,805 |
| 128 × 256 | 43.305 ms | 9.000 ms | 4.81× | 174,081 | 5,330 |

At 64 tags × 256 chunks, result decoding fell from 19.775 ms to 0.210 ms.
At 128 × 256 it fell from 37.835 ms to 0.275 ms. This directly targets the
tag-stack-copy and nested-export behavior identified in VIR-002.

## Recommended follow-up

- Adopt text plus flat style events as the common logical output contract for
  VIR, FIR-native, and LLVM adapters.
- Preserve bulk return; do not replace it with per-event host callbacks.
- Move the focused boundary cases into the standalone VIR benchmark webapp and
  rerun its adaptive protocol before treating these prototype numbers as stable.
- Measure package startup and retained memory as the resident table grows.
- Keep the direct typed-input/segment-output implementation as a control until
  the new ABI has exact parity across the full corpus and repeated reflow.

## Caveats

- These are local Chromium measurements, not a published benchmark campaign.
- Resident lookup was measured on real deck formats; the synthetic tag/chunk
  study isolates flat output only.
- UTF-8-to-JavaScript offset projection remains Verso-owned output-adapter work
  and is included in end-to-end panel timings, but not in VIR `callTimed`.
- The resident table increases package size and startup work; this card does not
  yet quantify that tradeoff.

## Measurement context

- Measured: 2026-08-09
- Lean/VIR package toolchain: `leanprover/lean4:v4.33.0-rc2`
- lean-vir source: `d2dbb50d7c2736df840820ae2cb0ca7b8b45b4da`
- VIR Wasm: `98ade7ed39a14b593dcc8a25a2ea3cf3e4606aac74f06c8407144b2c8a8e1825` (636,389 bytes)
- IR package: `1a51c82ad02f11f9bb01a140f2e3cab9c51e218b6c361fd7f612c6dee57ff489` (1,104,079 bytes)
- Browser: Google Chrome 150.0.7871.114, headless Chromium
- Correctness: Lean unit tests, Chromium/Firefox adapter tests, actual VIR
  direct-versus-resident parity, and the seven-backend standalone smoke passed
