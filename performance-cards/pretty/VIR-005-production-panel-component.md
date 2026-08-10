# VIR-005: a production-shaped panel isolates runtime cost from component cost

- Audience: Verso, lean-vir runtime, and UI integration owners
- Status: production hook, shared-runtime consumer, and cache pilot validated locally
- Priority: extract the reusable host/runtime boundary

## Forwardable summary

> A production-shaped Lean/VIR panel reduces semantic component source from 662 to 292 lines (-55.9%). After fully charging the instrumented cache/adapter it is 1,431 lines, 8.4% above the 1,320-line pre-pilot JavaScript baseline; because the Reveal policy now demonstrably shares the loader/runtime, the incremental panel allocation is 1,322 lines (+0.2%). Width caching removes the structural mount, two-frame wait, and DOM measurement from repeated same-width selections: all 27 repeated cases hit the cache and complete the VIR interaction in 0.49–0.66 ms, down from the earlier roughly 80-ms two-pass wall observation. The second component adds one IR member and 3.2 KB gzip without another runtime. Cold runtime payload remains the principal deployment cost.

## Boundary tested

JavaScript retains source discovery, focus, hover lookup, divider/resize
observation, DOM geometry, and fallback. Lean retains resident goal/signature
data, `Std.Format.prettyM`, annotation resolution, component state, and React
VDOM construction. The complete browser ABI is:

```text
mountContent(selector, contentId, widths, measureOnly) -> Bool
unmount(selector) -> Bool
```

The production registry has 15 IR members and three exports: panel mount,
panel unmount, and Reveal policy planning. The lab has 22 members and ten
exports. Browser tests assert that the policy and panel hold the same runtime
object and execute a real policy case.

## Local evidence

Protocol: separate `js`, `vir-fallback`, and `vir-only` assemblies; forced
reload in a fresh browser context; one first render, nine real release/click
rerenders, one divider resize, explicit browser GC before/after the interaction
sequence, and resource accounting from the files actually requested.

| Profile | First wall | Repeated wall median | VIR execute | VIR call total | Loaded gzip | Used-heap delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| JavaScript | 22.75 ms | 29.59 ms | — | — | 855,770 B | +880,432 B |
| VIR + JS fallback | 77.30 ms | 44.26 ms | 0.35 ms | 0.50 ms | 1,157,823 B | +1,985,348 B |
| VIR only (one campaign) | 77.53 ms | 44.20 ms | 0.30 ms | 0.42 ms | 1,152,621 B | +1,990,812 B |

JavaScript and VIR-fallback values are campaign medians. VIR startup varied
from 273 to 445 ms, so a single cold number is not promoted. Removing the
JavaScript fallback still saves only 5.2 KB gzip because runtime/IR delivery
dominates.

## Interpretation

- There is no formatter/compiler hotspot visible at this scale. The cached
  interaction is sub-millisecond, and 0.30–0.38 ms is VIR execute.
- Uncached first/resize interactions attribute roughly 20–33 ms to the frame
  wait and roughly 1 ms to DOM measurement. The cache targets the right phase.
- Runtime reuse is now real: Reveal policy adds one member, one export,
  20,048 raw IR bytes, and 3,187 gzip bytes, with no second runtime or loader.
- Fully charging the shared 526-line Lean `VersoSlides.Pretty` module makes
  the candidate 1,957 lines (+48.3%); its value is reuse of canonical Lean
  behavior, not deletion of all physical source in the repository.
- Without a resident runtime, payload and memory make the JavaScript component
  the better isolated deployment.

## Recommended follow-up

1. Extract the runtime-provider contract used by the Reveal policy as a small
   Verso API, retaining standalone-runtime compatibility.
2. Separate diagnostic phase recording from the 268-line adapter without
   duplicating its width-cache/lifecycle policy.
3. Stress cache invalidation across font/style changes in addition to the
   already tested content ID and panel-width changes.
4. Keep the ordinary JavaScript profile as the production control while cold
   runtime delivery remains material.

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
- Production root IR: `d40b19103c65dadf20f1f0179212a9c83758f42d86736a0ca2e84a1b185cd358`
- Browser: Google Chrome 150.0.7871.114, headless
- Detailed note: `docs/VIR_PANEL_EVALUATION.md`
