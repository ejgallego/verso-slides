# VIR panel-component evaluation

This pilot asks whether VIR improves a real Verso Slides component along
human factors, reuse, correctness, and delivery—not only formatter speed. The
result is a production-shaped hybrid: JavaScript owns browser discovery,
geometry, and lifecycle; Lean owns resident goal/signature data, `prettyM`,
annotation resolution, component policy, and React VDOM construction.

## Executive result

- The Lean semantic component is 292 physical lines versus 662 lines for the
  JavaScript formatter/goal renderer: **55.9% less component code**.
- A deployable `vir-only` profile is 1,359 application-specific lines after
  charging its panel hook, loader, geometry measurer, and adapter: **3.0% more**
  than the pinned 1,320-line pre-pilot JavaScript implementation. If the
  generic 109-line VIR loader is shared by another component, the incremental
  result becomes **5.3% less**.
- The warmed VIR call is fast—**0.21–0.26 ms execute** and **0.34–0.44 ms total**—
  but the complete repeated selection/remount is about **80 ms**, versus
  **24 ms** for JavaScript. The dominant gap is the asynchronous two-frame,
  two-pass browser protocol, not Lean formatting.
- Without an already resident VIR runtime, `vir-only` adds **293 KB gzip** to
  resources actually loaded by the page (+34.3%). Runtime sharing is therefore
  a prerequisite for an attractive deployment story.
- All 59 generated resident contents render through the production hook. The
  fuller differential corpus checks 472 semantic-DOM cases and 68 real-geometry
  cases. The remaining 3 narrow-layout differences are the known fractional-
  pixel versus integer-column boundary.

This is a positive component/API result and a mixed production result. VIR
makes the semantic code smaller, typed, reusable, and directly based on Lean
values. It does not make browser geometry disappear, and a one-component deck
does not amortize the runtime.

## Actual assembly profiles

The profiles are generated independently; the lab is no longer part of the
production measurement.

| Profile | Selected implementation | Application source | Change from 1,320-line baseline |
| --- | --- | ---: | ---: |
| `js` | ordinary panel + JavaScript formatter | 1,374 | +54 (+4.1%) |
| `vir-fallback` | VIR component + complete JS fallback | 1,971 | +651 (+49.3%) |
| `vir-only` | VIR component + geometry-only JS | 1,359 | +39 (+3.0%) |
| `vir-only`, loader already shared | same, loader amortized | 1,250 | -70 (-5.3%) |

The 54-line ordinary-panel delta consists of the 53-line generic renderer
hook and a one-line readiness fix. The `vir-only` count fully charges:

- ordinary panel: 712 lines;
- geometry-only measurer: 50 lines;
- generic VIR loader: 109 lines;
- production panel adapter: 196 lines;
- compiler-neutral Lean model plus VIR/React view: 292 lines.

It excludes the canonical 526-line `VersoSlides.Pretty` module because it is
shared Lean infrastructure reused by multiple consumers. Charging it in full
raises the candidate to 1,885 lines (+42.8%). Generated registry source and
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

Production generation specializes the registry to the component surface. It
has **14 IR members and 2 exports**, down from the lab package's 21 members and
9 exports. It still contains 58 deduplicated formats and all 59 goal/signature
contents because those are resident component data.

| Production VIR artifact | Raw bytes | gzip bytes |
| --- | ---: | ---: |
| Wasm runtime | 636,389 | 146,610 |
| React runtime JavaScript | 342,184 | 97,523 |
| 14 IR package members | 1,232,330 | 54,423 |

Measured browser delivery after forced reload:

| Profile | Loaded resources gzip | Panel pipeline gzip | Published site gzip |
| --- | ---: | ---: | ---: |
| `js` | 855,547 | 21,099 | 1,826,331 |
| `vir-fallback` | 1,153,930 | 319,172 | 2,125,459 |
| `vir-only` | 1,148,728 | 313,970 | 2,120,257 |

`vir-only` saves only 5.2 KB gzip relative to retaining the fallback because
the JavaScript formatter is small beside the runtime. Relative to `js`, it
adds 293,181 loaded gzip bytes and 293,926 published-site gzip bytes. With a
shared VIR runtime the incremental component is primarily its IR closure, but
this run deliberately charges the whole cold dependency closure.

## Runtime and memory

These are local headless-Chrome measurements, one cold context and nine
repeated real selections per profile. Wall time includes the UI protocol;
VIR phase time is taken from `callTimed` for the final measured mount.

| Profile | VIR startup | First wall | Repeated wall median | VIR execute | VIR call total | Resize wall | Used-heap delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `js` | — | 33.70 ms | 24.36 ms | — | — | 161.95 ms | +0.90 MB |
| `vir-fallback` | 110.70 ms | 67.23 ms | 80.17 ms | 0.21 ms | 0.34 ms | 197.18 ms | +2.11 MB |
| `vir-only` | 109.86 ms | 68.11 ms | 80.20 ms | 0.26 ms | 0.44 ms | 196.98 ms | +2.11 MB |

The production-only package reduced cold VIR startup from the earlier
lab-shaped observation of roughly 392 ms to roughly 110 ms. The much larger
repeated wall time is not evidence of a compiler hotspot: the adapter first
commits a structural React tree, waits two animation frames, measures browser
geometry, then commits final content. Optimizing Lean `prettyM` would have
negligible effect on the current 56 ms wall-time gap. The next performance
experiment should instrument frame wait, structure commit, measurement, and
final commit separately, then test whether geometry can be cached safely.

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
5. The same loader and runtime can serve future VIR components.

The costs are equally concrete:

1. Browser geometry remains a host capability and requires a two-pass API.
2. The current 196-line adapter is substantial and contains measurement and
   timing policy that should be simplified before upstreaming.
3. Runtime delivery and retained heap dominate a one-component deployment.
4. React becomes policy for this subtree.
5. Package generation is useful but still demo-specific build machinery.

The right next pilot is not “more Lean at any cost.” It is a second component
using the same loader/runtime, together with phase instrumentation around the
two-pass mount. That directly tests the two assumptions on which the favorable
case rests: runtime reuse and a reusable host adapter.

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

node ../../scripts/panel-component-metrics.mjs
```
