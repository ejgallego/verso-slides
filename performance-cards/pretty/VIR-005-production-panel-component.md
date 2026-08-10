# VIR-005: a production-shaped panel isolates runtime cost from component cost

- Audience: Verso, lean-vir runtime, and UI integration owners
- Status: production-hook pilot validated locally
- Priority: evaluate runtime reuse and two-pass host protocol

## Forwardable summary

> A production-shaped Lean/VIR panel component reduces semantic component source from 662 to 292 lines (-55.9%), but the fully charged `vir-only` application is 1,359 lines, 3.0% above the 1,320-line pre-pilot JavaScript baseline. With the generic 109-line VIR loader already shared, it is 1,250 lines (-5.3%). Warm VIR execution is only 0.21–0.26 ms, while a real repeated selection takes about 80 ms versus 24 ms in JavaScript because the hybrid performs a structural mount, waits two frames, measures DOM cells, and remounts. A cold one-component deployment adds 293 KB gzip and about 1.21 MB of used heap over the JavaScript profile. The next useful test is a second component sharing the runtime plus finer instrumentation/caching of the two-pass browser protocol.

## Boundary tested

JavaScript retains source discovery, focus, hover lookup, divider/resize
observation, DOM geometry, and fallback. Lean retains resident goal/signature
data, `Std.Format.prettyM`, annotation resolution, component state, and React
VDOM construction. The complete browser ABI is:

```text
mountContent(selector, contentId, widths, measureOnly) -> Bool
unmount(selector) -> Bool
```

The production registry is specialized to those two exports: 14 IR members,
down from the comparison lab's 21 members and nine exports.

## Local evidence

Protocol: separate `js`, `vir-fallback`, and `vir-only` assemblies; forced
reload in a fresh browser context; one first render, nine real release/click
rerenders, one divider resize, explicit browser GC before/after the interaction
sequence, and resource accounting from the files actually requested.

| Profile | First wall | Repeated wall median | VIR execute | VIR call total | Loaded gzip | Used-heap delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| JavaScript | 33.70 ms | 24.36 ms | — | — | 855,547 B | +900,964 B |
| VIR + JS fallback | 67.23 ms | 80.17 ms | 0.21 ms | 0.34 ms | 1,153,930 B | +2,110,604 B |
| VIR only | 68.11 ms | 80.20 ms | 0.26 ms | 0.44 ms | 1,148,728 B | +2,110,232 B |

The production-only package initializes in 109.86–110.70 ms in these runs,
substantially below the earlier roughly 392-ms lab-shaped package. Removing
the JavaScript fallback saves only 5.2 KB gzip because runtime/IR delivery
dominates.

## Interpretation

- There is no formatter/compiler hotspot visible at this scale. At most
  0.44 ms of an 80-ms interaction is inside the measured VIR call.
- The current performance target is the host protocol: two animation-frame
  waits, structural React commit, DOM measurement, and final commit.
- The favorable source result depends on real reuse. The VIR loader must serve
  another component before its amortized -5.3% result becomes actual.
- Fully charging the shared 526-line Lean `VersoSlides.Pretty` module makes
  the candidate 1,885 lines (+42.8%); its value is reuse of canonical Lean
  behavior, not deletion of all physical source in the repository.
- Without a resident runtime, payload and memory make the JavaScript component
  the better isolated deployment.

## Recommended follow-up

1. Instrument structure commit, frame wait, geometry measurement, and final
   commit separately; test safe width-vector caching on repeated content.
2. Pilot a second Verso Slides component on the same loader/runtime and report
   incremental IR, source, startup, and heap rather than charging runtime twice.
3. Trim lab-only call logging from the 196-line production adapter only where
   it preserves one shared protocol implementation.
4. Keep the ordinary JavaScript profile as the production control until the
   shared-runtime case is demonstrated.

## Correctness and integration notes

The broader differential corpus passes 472/472 semantic-DOM cases. Real
browser geometry passes width-vector parity in 68/68 cases and semantic parity
in 65/68; the three narrow cases are the documented fractional-pixel versus
integer-column boundary. Production reload/click testing found and fixed a
Reveal-ready initialization race and a self-induced `ResizeObserver` remount
loop. Ten consecutive reload/click attempts passed after the fixes.

## Measurement context

- Measured: 2026-08-10
- Lean: `leanprover/lean4:v4.33.0-rc2`
- lean-vir source: `062fc8f4c24c1f35c43d92c38beb0782976c7e03`
- VIR Wasm: `98ade7ed39a14b593dcc8a25a2ea3cf3e4606aac74f06c8407144b2c8a8e1825` (636,389 bytes)
- Production root IR: `e978549ae9eed5408b9ee34774e9031fc264a5345917f763232ca2d1ae707138`
- Browser: Google Chrome 150.0.7871.114, headless
- Detailed note: `docs/VIR_PANEL_EVALUATION.md`
