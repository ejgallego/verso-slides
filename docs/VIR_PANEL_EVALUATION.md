# VIR panel-component evaluation

This pilot asks whether VIR improves a real Verso Slides component along
human factors, reuse, correctness, and delivery—not only formatter speed. The
result is a production-shaped hybrid: JavaScript owns browser discovery,
geometry, and lifecycle; Lean owns resident goal/signature data, `prettyM`,
annotation resolution, component policy, and React VDOM construction.

## Executive result

- The Lean semantic component is 292 physical lines versus 662 lines for the
  JavaScript formatter/goal renderer: **55.9% less component code**.
- The now-instrumented `vir-only` profile is 1,431 application-specific lines
  after charging its hook, loader, geometry measurer, cache, and adapter:
  **8.4% more** than the pinned 1,320-line pre-pilot JavaScript implementation.
  Since the Reveal policy now demonstrably shares the 109-line loader/runtime,
  the incremental panel allocation is 1,322 lines: **0.2% more**.
- Cached repeated selections spend **0.49–0.66 ms** in the complete VIR
  interaction, including a **0.30–0.38 ms** execute phase. The observation
  harness sees about **44 ms** after two settling frames, versus **30 ms** for
  JavaScript. Uncached first/resize work is dominated by the frame wait.
- Without an already resident VIR runtime, `vir-only` adds **297 KB gzip** to
  resources actually loaded by the page (+34.7%). Runtime sharing is therefore
  a prerequisite for an attractive deployment story.
- All 59 generated resident contents render through the production hook. The
  fuller differential corpus checks 472 semantic-DOM cases and 68 real-geometry
  cases. The remaining 3 narrow-layout differences are the known fractional-
  pixel versus integer-column boundary.

This is a positive component/API result and a mixed production result. VIR
makes the semantic code smaller, typed, reusable, and directly based on Lean
values. It does not make browser geometry disappear. A second real component
now amortizes the runtime, but one additional 3.2-KB-gzip IR member does not by
itself amortize the initial 244-KB-gzip runtime/Wasm base.

## Actual assembly profiles

The profiles are generated independently; the lab is no longer part of the
production measurement.

| Profile | Selected implementation | Application source | Change from 1,320-line baseline |
| --- | --- | ---: | ---: |
| `js` | ordinary panel + JavaScript formatter | 1,374 | +54 (+4.1%) |
| `vir-fallback` | VIR component + complete JS fallback | 2,043 | +723 (+54.8%) |
| `vir-only` | VIR component + geometry-only JS | 1,431 | +111 (+8.4%) |
| `vir-only`, loader shared with Reveal policy | incremental panel allocation | 1,322 | +2 (+0.2%) |

The 54-line ordinary-panel delta consists of the 53-line generic renderer
hook and a one-line readiness fix. The `vir-only` count fully charges:

- ordinary panel: 712 lines;
- geometry-only measurer: 50 lines;
- generic VIR loader: 109 lines;
- production panel adapter with phase records and width cache: 268 lines;
- compiler-neutral Lean model plus VIR/React view: 292 lines.

It excludes the canonical 526-line `VersoSlides.Pretty` module because it is
shared Lean infrastructure reused by multiple consumers. Charging it in full
raises the candidate to 1,957 lines (+48.3%). Generated registry source and
build tooling are also reported as generation cost, not handwritten component
source. Run `node scripts/panel-component-metrics.mjs` to reproduce every
source number.

## Responsibility boundary

The 156-line compiler-neutral component in
`VersoSlides/Panel/Component.lean` defines rich text, hypotheses, goals,
per-cell layout state, events/effects, stale-reply rejection, annotation
resolution, and the call to Lean `prettyM`. The 136-line
`experiments/vir-panel/VirPanelExperiment.lean` maps that model to React
resources and exports only mount/unmount operations.

The browser side remains explicit:

- `web-lib/panel/panel.js:384` selects nested source elements;
- `web-lib/panel/panel.js:403` is the optional `render`/`release` hook;
- `web-lib/panel/panel.js:432` owns discovery, focus, markdown, and fallback;
- `web-lib/panel/panel.js:550` owns resize/reflow;
- `demos/vir-pretty/web/panel-measurer.js` owns DOM geometry;
- `demos/vir-pretty/web/vir-loader.js` owns generic runtime/package bootstrap;
- `demos/vir-pretty/web/panel-component.js` owns the two-pass browser adapter.

Neither Lean source uses `window`, `document`, selectors, listeners, geometry,
or `innerHTML`. Source discovery, focus outlines, dragging, fragment
automation, hover-doc lookup, markdown, and resize observation remain ordinary
browser work.

The browser-facing ABI is deliberately small:

```text
mountContent(selector, contentId, widths, measureOnly) -> Bool
unmount(selector) -> Bool
```

No `Std.Format`, goal JSON, annotation table, or recursive VDOM crosses the
boundary. A structure-only mount establishes CSS grid geometry; JavaScript
measures each rich-text cell; the second mount supplies integer-column widths.

## Production artifact and delivery

Production generation specializes the registry to two component surfaces. It
has **15 IR members and 3 exports**, down from the lab package's 22 members and
10 exports. It contains 58 deduplicated formats and all 59 goal/signature
contents, plus the existing Lean Reveal policy planner.

| Production VIR artifact | Raw bytes | gzip bytes |
| --- | ---: | ---: |
| Wasm runtime | 636,389 | 146,610 |
| React runtime JavaScript | 342,184 | 97,523 |
| 15 IR package members | 1,252,378 | 57,610 |

The second component is actual rather than projected: the Reveal policy adapter
receives the same runtime object as the panel and calls
`VirPanelRegistry.planRevealPolicy`. Relative to the panel-only closure, this
adds one member, one export, 20,048 raw IR bytes, and 3,187 gzip bytes—no second
runtime, Wasm module, or loader.

Measured browser delivery after forced reload:

| Profile | Loaded resources gzip | Panel pipeline gzip | Published site gzip |
| --- | ---: | ---: | ---: |
| `js` | 855,770 | 21,099 | 1,826,554 |
| `vir-fallback` | 1,157,823 | 322,842 | 2,129,391 |
| `vir-only` | 1,152,621 | 317,640 | 2,124,189 |

`vir-only` saves only 5.2 KB gzip relative to retaining the fallback because
the JavaScript formatter is small beside the runtime. Relative to `js`, it
adds 296,851 loaded gzip bytes and 297,635 published-site gzip bytes. With a
shared VIR runtime the incremental component is primarily its IR closure, but
this run deliberately charges the whole cold dependency closure.

## Runtime and memory

These are local headless-Chrome measurements. The table uses the median of
three fresh campaigns for JavaScript and `vir-fallback`, with nine real
selections per campaign. Wall time includes two observation frames after the
content is ready; the interaction record stops when the final mount completes.

| Profile | VIR startup | First wall | Repeated wall | VIR execute | VIR call total | Resize wall | Used-heap delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `js` | — | 22.75 ms | 29.59 ms | — | — | 162.06 ms | +0.88 MB |
| `vir-fallback` | 341.60 ms | 77.30 ms | 44.26 ms | 0.35 ms | 0.50 ms | 195.26 ms | +1.99 MB |
| `vir-only` (one campaign) | 287.46 ms | 77.53 ms | 44.20 ms | 0.30 ms | 0.42 ms | 192.54 ms | +1.99 MB |

Cold startup varied from 273 to 445 ms across the three VIR campaigns, so it
should not be summarized from one run. The phase instrumentation is much more
diagnostic:

| Interaction | Structure call | Frame wait | Measure | Final call | Complete interaction |
| --- | ---: | ---: | ---: | ---: | ---: |
| first uncached | 8.43 ms | 25.52 ms | 1.12 ms | 1.08 ms | 36.22 ms |
| repeated cached | 0 | 0 | 0 | 0.52 ms | 0.63 ms |
| resize/re-measure | 0.42 ms | 29.69 ms | 0.91 ms | 0.49 ms | 31.61 ms |

All 27 repeated selections across the three campaigns hit the width cache.
The cache is keyed by the persistent source element, resident content ID, and
panel width; an actual width change still runs the structural/measurement
protocol. It cuts the earlier roughly 80-ms repeated wall observation to
44 ms and makes the component's own work sub-millisecond. The remaining wall
gap largely comes from the harness's settling frames and general click/panel
orchestration rather than `prettyM`.

## Generic backend and FIR measurement

`browser-backend-measure.py` now serves the lab itself and exposes aliases for
`vir`, `fir`, and `fir-all`. It discovers all 58 generated formats, interleaves
backend order at widths 20/40/80, verifies populated-DOM parity, and records
every phase. Three campaigns used seven repetitions and at least 256 source
code points per timed batch: 1,218 measured batches per backend per campaign
and no parity failures. The table takes the median campaign.

| Backend | Execute median / p90 | Marshal median | Decode median | Committed median / p90 |
| --- | ---: | ---: | ---: | ---: |
| JavaScript | 0.035 / 0.070 ms | 0.005 ms | 0 | 0.135 / 0.320 ms |
| VIR typed Format | 0.855 / 1.655 ms | 0.560 ms | 0.085 ms | 1.695 / 3.405 ms |
| FIR Wasm PrettyTrace | 0.260 / 0.495 ms | 0.215 ms | 0.265 ms | 0.880 / 1.760 ms |
| LLVM/Emscripten | 0.570 / 1.155 ms | 0.235 ms | 0.080 ms | 1.035 / 2.175 ms |

These are batch totals, not per-format single-call medians. FIR is about 3.3×
faster than VIR in execute and about 1.9× faster at the committed boundary in
this controlled layout-only surface. Its input marshal and PrettyTrace decode
together cost more than execute, reinforcing the case for the planned
resident/flat or broader FIR artifacts.

The campaign also exposes the current FIR ownership tradeoff: the documented
instance-lifetime bump arena grew from byte 1,024 to 277,828,872 across 51,360
render calls in each campaign. This is expected from the artifact capability
metadata, not a newly inferred leak. The harness launches a fresh browser and
adapter per command, reports first/last frontier and pages, and lets callers
lower `--code-points` or repetitions when memory rather than timing resolution
is the target.

## Correctness and interaction evidence

The lab differential smoke discovers all 59 dense content IDs: 17 goal states
and 42 signatures. At widths `12, 40, 80, 20, 120, 1, 240, 32`, all 472 cases
produce the same semantic DOM after coalescing adjacent text nodes. It checks
hierarchy, tags, class sets, `data-binding`, and exact text.

The real-geometry corpus tests all 17 goals at panel widths 240, 360, 520, and
760 pixels. The final VIR and JavaScript width vectors agree in all 68 cases;
semantic DOM agrees in 65. The three residual differences occur at 240 pixels
for contents 14–16, where cells expose 6.943 space widths: JavaScript uses
pixel-aware line breaking while `Std.Format` receives integer width 6.

The production smoke additionally reloads before clicking, opens a goal and a
signature, drags the divider, and disables JavaScript semantic formatter
functions while VIR is active. It found and now guards two integration bugs:

1. `panel.js` previously listened only for a future Reveal `ready` event. On a
   cached/reloaded page Reveal could already be ready, so Lean clicks did
   nothing. Initialization now checks `Reveal.isReady()` first.
2. VIR's skeleton and final React commits triggered `ResizeObserver`, which
   could restart the skeleton phase indefinitely. Per-panel in-flight and
   width state now suppress self-induced remounts while retaining real resize.

Ten consecutive reload-and-click runs passed after both fixes.

## Human-factors assessment

VIR improves the part of the panel that naturally belongs to Lean:

1. Selection policy and stale-reply behavior are pure and covered by 19 Lean
   tests without a DOM.
2. The original `Std.Format` flows through layout, annotation resolution,
   goal composition, and React construction without a JSON or HTML-string
   intermediate.
3. The model is compiler-neutral; only the 136-line view imports VIR/React.
4. The package manifest makes reached declarations, imports, exports, Lean
   version, and artifact membership inspectable.
5. The same loader/runtime now serves the formatter, panel, and Reveal policy;
   the smokes verify runtime object identity and a real policy result.

The costs are equally concrete:

1. Browser geometry remains a host capability and requires a two-pass API.
2. The current 268-line adapter is substantial because it includes the width
   cache and experiment-phase records; production extraction should separate
   diagnostics without duplicating lifecycle policy.
3. Runtime delivery and retained heap dominate a one-component deployment.
4. React becomes policy for this subtree.
5. Package generation is useful but still demo-specific build machinery.

The second-component and host-phase pilots are now complete. The next decision
is whether to extract the shared runtime-provider contract and width-cache
policy as small Verso APIs, while leaving measurement scripts in the demo. For
FIR, the new generic harness should be rerun when the flat/resident and HTML
artifacts arrive; it already selects them through `--backend fir-all`.

## Reproduction

```text
lake exe test-panel-component
scripts/build-vir-panel-experiment.sh
(cd experiments/vir-panel && node smoke.mjs)

cd demos/vir-pretty
VIR_PRETTY_PROFILE=js OUT_DIR="$PWD/_profiles/js" scripts/assemble.sh
VIR_PRETTY_PROFILE=vir-fallback OUT_DIR="$PWD/_profiles/vir-fallback" scripts/assemble.sh
VIR_PRETTY_PROFILE=vir-only OUT_DIR="$PWD/_profiles/vir-only" scripts/assemble.sh

python3 scripts/serve.py --port 18330 --directory _profiles/js
python3 scripts/serve.py --port 18331 --directory _profiles/vir-only
python3 scripts/serve.py --port 18332 --directory _profiles/vir-fallback
python3 scripts/browser-production-panel-smoke.py http://127.0.0.1:18332
python3 scripts/browser-profile-measure.py vir-fallback http://127.0.0.1:18332 _profiles/vir-fallback
python3 scripts/browser-backend-measure.py --backend js --backend vir --backend fir --backend llvm \
  --code-points 256 --output _profiles/results/backend-current.json

node ../../scripts/panel-component-metrics.mjs
```
