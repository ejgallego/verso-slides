# VIR panel-component experiment

This experiment asks whether VIR improves a Verso Slides component along axes
other than raw formatter speed. It is deliberately a component experiment, not
a claim that VIR already replaces the complete browser panel.

## What was separated

The production and benchmark delivery paths are now distinct:

| Path | Panel | Formatter | Raw bytes | gzip bytes |
| --- | ---: | ---: | ---: | ---: |
| ordinary slides | 658 lines | 662 lines | 48,673 | 12,084 |
| formatter lab | 2,501 lines | 2,551 lines | 191,561 | 36,726 |
| lab overhead | +1,843 lines | +1,889 lines | +142,888 | +24,642 |

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
| semantic formatter/component | 662 | 255 | -61.5% |
| projected hybrid application code, before the host adapter | 1,320 | 913 | -30.8% |
| projected hybrid including the 95-line instrumented host adapter, before panel hooks | 1,320 | 1,008 | -23.6% |

The projections retain all 658 lines of the ordinary browser panel and replace
the 662-line JavaScript formatter with the 141-line compiler-neutral component,
114-line VIR/React view, and then the shared-runtime host adapter. The opt-in lab
currently adds a further 142 net lines to its panel for the toggle, fallback,
two-pass measurement, and instrumentation. Charging all of that experimental
UI as production code yields a conservative 12.9% reduction; a production hook
should target roughly 20% rather than preserve the lab controls and call log.

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

The VIR-specific React view is 114 lines:

- `experiments/vir-panel/VirPanelExperiment.lean:17-34` turns semantic render
  nodes into React text/span resources while preserving CSS classes and binding
  metadata.
- `experiments/vir-panel/VirPanelExperiment.lean:39-77` composes hypotheses,
  conclusions, goals, signatures, fragments, and empty content.
- `experiments/vir-panel/VirPanelExperiment.lean:79-87` exports typed mount and
  unmount operations.
- `experiments/vir-panel/VirPanelExperiment.lean:89-112` supplies only the
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

- 295 declarations: 261 Lean IR and 34 native externs;
- 13 package-set members;
- 3 public entries (`mountModel`, `mountFixture`, and `unmount`);
- 17 JavaScript host imports.

The current standalone browser artifact costs:

| Part | Raw bytes | gzip bytes |
| --- | ---: | ---: |
| VIR runtime Wasm | 732,061 | 166,244 |
| React-enabled runtime bundle | 342,184 | 97,523 |
| 13 IR package members | 196,740 | 27,935 |
| total | 1,270,985 | 291,702 |

This is the decisive cold-delivery drawback if a deck does not already use VIR
and React. If those runtimes are already resident, the incremental component is
closer to the 27.4-KB-gzip IR package, but this experiment does not yet measure
cross-component runtime amortization.

The real-content hybrid builds `VirPanelRegistry` after the deck is assembled.
The generated package contains 58 deduplicated formats and 59 complete
goal/signature contents. Its single shared table serves the formatter matrix
and the React component. The package reaches 21 members and exposes nine calls:
the four nonresident formatter surfaces, format count, two resident formatter
surfaces, and the two component operations:

- `mountContent(selector, contentId, width)`;
- `unmount(selector)`.

No `Std.Format`, goal JSON, annotation table, or recursive VDOM crosses the
component boundary. The same generated metadata records both format and
content counts. The 21 IR members are 1,448,208 raw bytes and 82,976 bytes
gzip. The broader reach than the old panel-only package is expected: this one
package now includes every formatter ABI that was previously supplied by a
separate artifact.

The consolidation result is measurable:

| Browser delivery, excluding shared Wasm | Separate formatter + panel | Unified | Change |
| --- | ---: | ---: | ---: |
| IR, raw | 2,716,854 | 1,448,208 | -46.7% |
| IR, gzip | 153,523 | 82,976 | -46.0% |
| runtime JavaScript + IR, raw | 3,174,807 | 1,790,392 | -43.6% |
| runtime JavaScript + IR, gzip | 279,824 | 180,499 | -35.5% |
| live VIR runtime instances | 2 | 1 | -50.0% |

The browser test checks object identity between the formatter and component
bridges, so the one-runtime claim is no longer an amortization assumption.

## Runtime observations

`node experiments/vir-panel/smoke.mjs` validates the virtual React tree and
prints call phases. One observed run on this development machine was:

| Call | marshal | execute | host inside execute | decode | total |
| --- | ---: | ---: | ---: | ---: | ---: |
| first mount | 0.201 ms | 7.735 ms | 5.737 ms | 0.043 ms | 8.313 ms |
| repeated median, 30 mounts | 0.006 ms | 0.893 ms | 0.857 ms | 0.002 ms | 0.905 ms |

The useful conclusion is not the absolute Node virtual-host number. It is that
about 95% of repeated `execute` time is already attributed to React host work;
there is no obvious Lean formatter hotspot in this small component. A real
Chromium smoke now exercises real resident goal and signature contents. Across
several warmed-runtime runs, the first real resident goal render took 3.7--8.6 ms,
the measured-width remount took 0.65--4.1 ms, and thirty same-content remounts
had 0.045--0.10-ms medians. The repeated figure is useful as a repeated-call and
React-reconciliation check, not an end-to-end selection benchmark: identical
content can take the React no-op path.

After consolidation, three fresh Chromium processes using the already-ready
shared formatter runtime measured 1.91--2.30 ms for the first component mount,
0.53--0.77 ms for its measured-width remount, and 0.020--0.025-ms repeated
medians. This is evidence that sharing does not introduce a regression, not a
causal speedup claim; the package shape and runtime warm-up sequence both
changed.

## Full-content parity

The browser smoke now discovers every generated resident fixture from the deck
and hover-document payload instead of maintaining a synthetic example list. It
finds all 59 dense content IDs: 17 goal states and 42 signatures. Each is
rendered by both the production JavaScript path and the resident VIR/React path
at the expand/shrink sequence `12, 40, 80, 20, 120, 1, 240, 32`, for 472
differential cases.

All 472 cases produce the same semantic DOM. The comparison checks element
hierarchy, tag names, class sets, `data-binding` values, and exact text. It only
coalesces adjacent text nodes, whose chunk boundaries differ between an HTML
parse and React but are not observable panel semantics. The corpus exposed two
real contract gaps before passing: an extra VIR-only goal wrapper and an extra
signature wrapper. It also showed that a React mount may require two animation
frames before a deterministic snapshot.

The smoke additionally drags the production divider and waits for its real
`ResizeObserver` path. It verifies that the CSS resize changes the measured
column budget, triggers a new VIR mount at exactly that width, and preserves a
rendered goal. This covers the browser-to-component geometry seam without
moving geometry into Lean.

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
   Verso Slides, while the 114-line view is the only VIR-specific layer.
5. The generated package manifest makes reached declarations, host imports,
   exports, Lean version, and artifact membership inspectable.

## Drawbacks and residual work

1. The cold payload is much larger than the 12.1-KB-gzip production
   panel-plus-formatter. VIR only becomes plausible when the runtime is reused.
2. Resident and unified-export generation adds 204 lines to the existing
   Python registry tool and emits a large generated Lean module. It removes
   runtime JSON conversion but introduces build-time machinery that should
   eventually become a reusable Verso/VIR facility rather than remain
   demo-specific.
3. The hybrid performs the real two-pass layout: render the structure, measure
   a `.type` cell in JavaScript, convert pixels to monospace columns, and
   remount. Full fixture parity confirms both renderers when given the same
   column budget at eight deterministic widths, while one live divider case
   covers the actual `ResizeObserver` seam. Unlike the JavaScript goal path,
   which may measure each `.type` cell separately, the current React model
   shares the first measured budget across a goal. Pixel-font, per-cell, and
   browser-engine variation therefore remain host-boundary questions.
4. Source discovery, focus outlines, rectangle geometry, dragging, fragment
   automation, hover-doc lookup, markdown rendering, and resize observation are
   browser work and are intentionally not implemented by the Lean component.
5. The opt-in lab hook is intentionally instrumented and adds 142 net lines to
   `panel-lab.js`; it is evidence for the boundary, not yet the minimal API we
   would ship in the ordinary panel.
6. React is an additional policy/dependency for ordinary Verso Slides. The
   direct host time in repeated calls shows that changing the language of the
   view does not remove DOM/React cost.
7. The unified package still has 21 members because it retains all four typed
   formatter output variants. A production-selected capability subset may be
   smaller, but splitting the experimental matrix again would defeat this
   consolidation test.
8. `Vir.ProofWidgets.Html` does not currently expose a fragment constructor, so
   matching the existing wrapper-free goal DOM requires a four-line local
   helper over `Lean.Vir.React.Node.fragment`. Exposing `Html.fragment` would
   remove this abstraction leak from component code.

## Current assessment

VIR is a good fit for the semantic panel component—selection policy, typed
content, Lean formatting, annotation resolution, and view composition. It is
not a compelling replacement for browser orchestration or geometry.

That hybrid now exists behind the **VIR panel component** control in the real
demo. It keeps DOM discovery, focus/outline drawing, width measurement, dragging,
and fallback in JavaScript while Lean/VIR owns the resident goal/signature React
subtree.

The next decision point is maintainability rather than feasibility. Full
fixed-budget fixture parity and the live resize seam are now established, so
the next useful experiment is to reduce the demo-specific generator and hook
surface into a small production integration candidate. If that hook cannot
remain near the 20--25% net source-reduction target, the formatter-only VIR
boundary is the better maintenance trade.

## Reproduction

```text
lake exe test-panel-component
scripts/build-vir-panel-experiment.sh
(cd experiments/vir-panel && node smoke.mjs)
demos/vir-pretty/scripts/assemble.sh
python3 demos/vir-pretty/scripts/serve.py
uv run --with playwright python demos/vir-pretty/scripts/browser-smoke.py http://127.0.0.1:18332
node scripts/panel-component-metrics.mjs
```
