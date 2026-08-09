# VIR panel-component experiment

This experiment asks whether VIR improves a Verso Slides component along axes
other than raw formatter speed. It is deliberately a component experiment, not
a claim that VIR already replaces the complete browser panel.

## What was separated

The production and benchmark delivery paths are now distinct:

| Path | Panel | Formatter | Raw bytes | gzip bytes |
| --- | ---: | ---: | ---: | ---: |
| ordinary slides | 658 lines | 662 lines | 48,673 | 12,084 |
| formatter lab | 2,359 lines | 2,683 lines | 190,378 | 35,904 |
| lab overhead | +1,701 lines | +2,021 lines | +141,705 | +23,820 |

The ordinary implementation is the last post-nested-tactic version before the
VIR comparison work. The full matrix panel, matrix formatter, backend adapters,
and cross-origin-isolation support now live under `demos/vir-pretty/web`; the
demo build explicitly stages them. They are no longer vendored into every deck.

Run `node scripts/panel-component-metrics.mjs` to reproduce the source and
delivery numbers. The script uses deterministic gzip settings.

## Management-facing source impact

Assuming the VIR runtime and `VersoSlides.Pretty` are shared infrastructure,
the current source comparison is:

| Boundary | JavaScript baseline | Lean/VIR pilot | Physical-line change |
| --- | ---: | ---: | ---: |
| semantic formatter/component | 662 | 248 | -62.5% |
| projected hybrid application code, before the final host bridge | 1,320 | 906 | -31.4% |

The second row retains all 658 lines of the ordinary browser panel and replaces
the 662-line JavaScript formatter with the 141-line compiler-neutral component
and 107-line VIR/React view. It is a ceiling rather than a completed reduction:
the final bridge will add code, so the pilot target is a 20--30% net reduction.

The shared Lean formatter is 526 lines and serves the formatter matrix as well
as this component. Assembly embeds that canonical source in its generated,
self-contained VIR target; the demo no longer maintains an identical tracked
copy. These figures deliberately charge the shared formatter once rather than
once per consumer.

## Experiment boundary, with source lines

The compiler-neutral Lean component is 141 lines:

- `VersoSlides/Panel/Component.lean:27-82` defines rich text, hypotheses,
  goals, content, `Model`, `Event`, `Effect`, and `Transition`.
- `VersoSlides/Panel/Component.lean:84-120` is the pure nested-selection state
  machine, including rejection of stale content replies.
- `VersoSlides/Panel/Component.lean:122-139` invokes Lean `prettyM` and resolves
  annotations into semantic render plans.

The VIR-specific React view is 107 lines:

- `experiments/vir-panel/VirPanelExperiment.lean:17-34` turns semantic render
  nodes into React text/span resources while preserving CSS classes and binding
  metadata.
- `experiments/vir-panel/VirPanelExperiment.lean:39-70` composes hypotheses,
  conclusions, goals, signatures, and empty content.
- `experiments/vir-panel/VirPanelExperiment.lean:72-80` exports typed mount and
  unmount operations.
- `experiments/vir-panel/VirPanelExperiment.lean:82-105` supplies only the
  deterministic smoke fixture.

For comparison, the remaining ordinary JavaScript responsibilities are visible
at these boundaries:

- nested DOM selection: `web-lib/panel/panel.js:386-400`;
- DOM focus, content lookup, markdown, and commit:
  `web-lib/panel/panel.js:403-489`;
- resize/reflow: `web-lib/panel/panel.js:501-546`;
- JavaScript `prettyM`: `web-lib/panel/pretty.js:451-515`;
- goal HTML composition and two-pass width measurement:
  `web-lib/panel/pretty.js:579-661`.

Neither Lean source contains a direct `window`, `document`, selector, event
listener, geometry, or `innerHTML` operation. The browser-capability boundary is
therefore explicit rather than conventional.

## Concrete VIR artifact

`lake build +VirPanelExperiment:vir` reaches:

- 289 declarations: 255 Lean IR and 34 native externs;
- 13 package-set members;
- 3 public entries (`mountModel`, `mountFixture`, and `unmount`);
- 16 JavaScript host imports.

The current standalone browser artifact costs:

| Part | Raw bytes | gzip bytes |
| --- | ---: | ---: |
| VIR runtime Wasm | 732,061 | 166,244 |
| React-enabled runtime bundle | 342,184 | 97,523 |
| 13 IR package members | 190,955 | 27,346 |
| total | 1,265,200 | 291,113 |

This is the decisive cold-delivery drawback if a deck does not already use VIR
and React. If those runtimes are already resident, the incremental component is
closer to the 27.8-KB-gzip IR package, but this experiment does not yet measure
cross-component runtime amortization.

## Runtime observations

`node experiments/vir-panel/smoke.mjs` validates the virtual React tree and
prints call phases. One observed run on this development machine was:

| Call | marshal | execute | host inside execute | decode | total |
| --- | ---: | ---: | ---: | ---: | ---: |
| first mount | 0.604 ms | 20.065 ms | 14.329 ms | 0.098 ms | 21.793 ms |
| repeated median, 30 mounts | 0.014 ms | 1.950 ms | 1.855 ms | 0.004 ms | 1.999 ms |

The useful conclusion is not the absolute Node virtual-host number. It is that
about 95% of repeated `execute` time is already attributed to React host work;
there is no obvious Lean formatter hotspot in this small component. A real
Chromium smoke also commits and queries the expected React DOM, but it is a
correctness test rather than a statistically useful browser benchmark.

## Improvements demonstrated by VIR

1. The selection policy and stale-reply behavior are pure, typed, and covered by
   ten Lean unit tests without constructing a DOM.
2. The same `Std.Format` value flows through layout, annotation resolution, goal
   composition, and React VDOM construction. There is no intermediate HTML
   string or recursive JSON VDOM inside that path.
3. React commits the same structural classes used by the existing panel,
   including token classes and `data-binding` metadata. Both the virtual host
   and Chromium verify this.
4. Compiler neutrality is retained: the model and update function import only
   Verso Slides, while the 107-line view is the only VIR-specific layer.
5. The generated package manifest makes reached declarations, host imports,
   exports, Lean version, and artifact membership inspectable.

## Drawbacks and missing parity

1. The cold payload is much larger than the 12.1-KB-gzip production
   panel-plus-formatter. VIR only becomes plausible when the runtime is reused.
2. A naïve end-to-end state-machine integration adds two host interactions per
   selection: selection emits focus/content effects, then accepted content emits
   a width request. The current DOM-local JavaScript path is synchronous.
3. Goal rendering currently needs actual `.type` cell widths. The JavaScript
   renderer constructs structure, lets CSS lay it out, measures it, and then
   formats expressions. The VIR fixture uses a supplied fixed column width; it
   has not reproduced this two-pass behavior.
4. Source discovery, focus outlines, rectangle geometry, dragging, fragment
   automation, hover-doc lookup, markdown rendering, and resize observation are
   browser work and are intentionally not implemented by the Lean component.
5. `mountModel` proves the typed surface but has not yet been exercised with a
   complete browser-originated `Std.Format` heap. A deck-resident model or
   content ID would avoid repeatedly marshaling that tree.
6. React is an additional policy/dependency for ordinary Verso Slides. The
   direct host time in repeated calls shows that changing the language of the
   view does not remove DOM/React cost.

## Current assessment

VIR is a good fit for the semantic panel component—selection policy, typed
content, Lean formatting, annotation resolution, and view composition. It is
not a compelling replacement for browser orchestration or geometry.

The next useful experiment is a hybrid integration in the real panel: keep DOM
discovery, focus/outline drawing, and width measurement in the small JavaScript
host; pass a resident content ID plus measured width to the VIR component; let
Lean/VIR own the goal/signature React subtree. Measure incremental payload when
another VIR component is already loaded, host crossings per click, first and
repeated interaction latency, and DOM parity. That will evaluate the actual
architectural trade rather than merely porting more JavaScript.

## Reproduction

```text
lake exe test-panel-component
cd experiments/vir-panel
lake build +VirPanelExperiment:vir
node smoke.mjs
cd ../..
scripts/build-vir-panel-experiment.sh
uv run --project browser-tests pytest browser-tests/test_vir_panel_experiment.py -q --browser=chromium
node scripts/panel-component-metrics.mjs
```
