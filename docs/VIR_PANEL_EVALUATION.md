# VIR panel-component experiment

This experiment asks whether VIR improves a Verso Slides component
along axes other than raw formatter speed. It is deliberately a
component experiment, not a claim that VIR already replaces the
complete browser panel.

## What was separated

The production and benchmark delivery paths are now distinct:

| Path                       |        Panel |    Formatter | Raw bytes | gzip bytes |
| -------------------------- | -----------: | -----------: | --------: | ---------: |
| pre-pilot ordinary slides  |    658 lines |    662 lines |    48,673 |     12,084 |
| ordinary + renderer hook   |    711 lines |    662 lines |    50,901 |     12,451 |
| formatter lab              |  2,507 lines |  2,551 lines |   191,847 |     36,801 |
| lab over current ordinary  | +1,796 lines | +1,889 lines |  +140,946 |    +24,350 |

The pinned baseline is the last post-nested-tactic version before the
VIR comparison work. The current ordinary panel adds one optional
53-line renderer boundary; without a registered renderer it follows
the original JavaScript path. The full matrix panel, matrix formatter,
backend adapters, and cross-origin-isolation support remain under
`demos/vir-pretty/web`; they are not vendored into every deck.

Run `node scripts/panel-component-metrics.mjs` to reproduce the source
and delivery numbers. The script uses deterministic gzip settings.

## Management-facing source impact

Assuming the VIR runtime, browser DOM measurer, and
`VersoSlides.Pretty` are shared infrastructure, the current source
comparison is:

| Boundary                                                        | JavaScript baseline | Lean/VIR candidate | Physical-line change |
| --------------------------------------------------------------- | ------------------: | -----------------: | -------------------: |
| semantic formatter/component                                    |                 662 |                292 |               -55.9% |
| production panel + Lean component, before adapter               |               1,320 |              1,003 |               -24.0% |
| hook-and-adapter production projection                          |               1,320 |              1,185 |               -10.2% |

The projection retains the 711-line ordinary browser panel, including
its new 53-line generic hook, and replaces the 662-line
JavaScript formatter with the 156-line compiler-neutral component and
136-line VIR/React view. It then fully charges the current 182-line
host adapter. That adapter owns the two-pass browser measurement
protocol and still contains the experiment's timed-call log, so 10.2%
is deliberately conservative rather than a projection that excludes
integration code. This is a source-boundary projection rather than a
fully stripped production bundle: the demo assembly deliberately keeps
the formatter lab to provide the shared VIR loader, processor registry,
and JavaScript fallback. The adapter could be trimmed for shipping, but
a second production-only protocol implementation would be a worse
maintenance result than this pilot is meant to demonstrate.

The typed per-cell measurement protocol accounts for 37 of the
additional Lean lines relative to the scalar-width pilot. Its
production integration is only the `render`/`release` slot: no lab
toggle, matrix controls, or panel-specific lifecycle framework moved
into Verso Slides.

The shared Lean formatter is 526 lines and serves the formatter matrix
as well as this component. Assembly embeds that canonical source in
its generated, self-contained VIR target; the demo no longer maintains
an identical tracked copy. These figures deliberately charge the
shared formatter once rather than once per consumer.

## Experiment boundary, with source lines

The compiler-neutral Lean component is 156 lines:

- `VersoSlides/Panel/Component.lean:27-91` defines rich text,
  hypotheses, goals, content, per-cell layout state, `Event`,
  `Effect`, and `Transition`.
- `VersoSlides/Panel/Component.lean:93-135` is the pure
  nested-selection and measurement state machine, including rejection
  of stale content replies.
- `VersoSlides/Panel/Component.lean:137-154` invokes Lean `prettyM`
  and resolves annotations into semantic render plans.

The VIR-specific React view is 136 lines:

- `experiments/vir-panel/VirPanelExperiment.lean:17-43` turns semantic
  render nodes and measurement placeholders into React resources while
  preserving CSS classes and binding metadata.
- `experiments/vir-panel/VirPanelExperiment.lean:45-99` composes
  hypotheses, conclusions, goals, signatures, fragments, and per-cell
  width indices.
- `experiments/vir-panel/VirPanelExperiment.lean:101-109` exports
  typed mount and unmount operations.
- `experiments/vir-panel/VirPanelExperiment.lean:111-134` supplies
  only the deterministic smoke fixture.

For comparison, the remaining ordinary JavaScript responsibilities are
visible at these boundaries:

- nested DOM selection: `web-lib/panel/panel.js:384-399`;
- optional production renderer boundary: `web-lib/panel/panel.js:403-425`;
- DOM focus, content lookup, markdown, and commit:
  `web-lib/panel/panel.js:432-535`;
- resize/reflow: `web-lib/panel/panel.js:550-580`;
- JavaScript `prettyM`: `web-lib/panel/pretty.js:451-515`;
- goal HTML composition and two-pass width measurement:
  `web-lib/panel/pretty.js:579-661`.

Neither Lean source contains a direct `window`, `document`, selector,
event listener, geometry, or `innerHTML` operation. The
browser-capability boundary is therefore explicit rather than
conventional.

## Concrete VIR artifact

`lake build +VirPanelExperiment:vir` reaches:

- 294 declarations: 260 Lean IR and 34 native externs;
- 13 package-set members;
- 3 public entries (`mountModel`, `mountFixture`, and `unmount`);
- 17 JavaScript host imports.

The current standalone browser artifact costs:

| Part                         | Raw bytes | gzip bytes |
| ---------------------------- | --------: | ---------: |
| VIR runtime Wasm             |   732,061 |    166,244 |
| React-enabled runtime bundle |   342,184 |     97,523 |
| 13 IR package members        |   199,485 |     28,576 |
| total                        | 1,273,730 |    292,343 |

This is the decisive cold-delivery drawback if a deck does not already
use VIR and React. If those runtimes are already resident, the
incremental component is closer to the 28.6-KB-gzip IR package, but
this experiment does not yet measure cross-component runtime
amortization.

The real-content hybrid builds `VirPanelRegistry` after the deck is
assembled. The generated package contains 58 deduplicated formats and
59 complete goal/signature contents. Its single shared table serves
the formatter matrix and the React component. The package reaches 21
members and exposes nine calls: the four nonresident formatter
surfaces, format count, two resident formatter surfaces, and the two
component operations:

- `mountContent(selector, contentId, widths, measureOnly)`;
- `unmount(selector)`.

No `Std.Format`, goal JSON, annotation table, or recursive VDOM
crosses the component boundary. The first mount requests only
structural placeholders; the browser measures every `.type` cell and
passes its integer-column width in visual order for the second mount.
The same generated metadata records both format and content counts.
The 21 IR members are 1,451,004 raw bytes and 83,687 bytes gzip. The
broader reach than the old panel-only package is expected: this one
package now includes every formatter ABI that was previously supplied
by a separate artifact.

The consolidation result is measurable:

| Browser delivery, excluding shared Wasm | Separate formatter + panel |   Unified | Change |
| --------------------------------------- | -------------------------: | --------: | -----: |
| IR, raw                                 |                  2,716,854 | 1,451,004 | -46.6% |
| IR, gzip                                |                    153,523 |    83,687 | -45.5% |
| runtime JavaScript + IR, raw            |                  3,174,807 | 1,793,188 | -43.5% |
| runtime JavaScript + IR, gzip           |                    279,824 |   181,210 | -35.2% |
| live VIR runtime instances              |                          2 |         1 | -50.0% |

The browser test checks object identity between the formatter and
component bridges, so the one-runtime claim is no longer an
amortization assumption.

## Runtime observations

`node experiments/vir-panel/smoke.mjs` validates the virtual React
tree and prints call phases. One observed run on this development
machine was:

| Call                       |  marshal |   execute | host inside execute |   decode |     total |
| -------------------------- | -------: | --------: | ------------------: | -------: | --------: |
| first mount                | 0.476 ms | 13.838 ms |           10.106 ms | 0.107 ms | 15.100 ms |
| repeated median, 30 mounts | 0.012 ms |  1.893 ms |            1.788 ms | 0.004 ms |  1.925 ms |

The useful conclusion is not the absolute Node virtual-host number. It
is that about 95% of repeated `execute` time is already attributed to
React host work; there is no obvious Lean formatter hotspot in this
small component. A real Chromium smoke exercises resident goal and
signature contents through the shared formatter runtime. One warmed
run of the current protocol measured 0.895 ms for the structure-only
mount, 0.330 ms for the measured formatted remount, and a 0.040-ms
repeated median. The repeated figure is useful as a repeated-call and
React-reconciliation check, not an end-to-end selection benchmark:
identical content can take the React no-op path. The structure-only
first call also makes these figures incomparable with the old scalar
protocol's first full-content mount.

## Full-content parity

The browser smoke now discovers every generated resident fixture from
the deck and hover-document payload instead of maintaining a synthetic
example list. It finds all 59 dense content IDs: 17 goal states and 42
signatures. Each is rendered by both the production JavaScript path
and the resident VIR/React path at the expand/shrink sequence
`12, 40, 80, 20, 120, 1, 240, 32`, for 472 differential cases.

All 472 cases produce the same semantic DOM. The comparison checks
element hierarchy, tag names, class sets, `data-binding` values, and
exact text. It only coalesces adjacent text nodes, whose chunk
boundaries differ between an HTML parse and React but are not
observable panel semantics. The corpus exposed two real contract gaps
before passing: an extra VIR-only goal wrapper and an extra signature
wrapper. It also showed that a React mount may require two animation
frames before a deterministic snapshot.

A second corpus uses the production panel CSS and real browser
geometry for all 17 goal contents at panel widths 240, 360, 520, and
760 pixels: 68 cases. In 64 cases, the rich-text cells do not share a
width; the largest spread is six monospace columns. It reproduces the
protocol refinement on every run:

| VIR measurement protocol                         | semantic DOM differences | share of cases |
| ------------------------------------------------ | -----------------------: | -------------: |
| one measured width for every cell                |                  14 / 68 |          20.6% |
| per-cell widths measured after rendering content |                   7 / 68 |          10.3% |
| structural placeholders, then per-cell widths    |                   3 / 68 |           4.4% |

The final VIR and JavaScript width vectors are identical in all 68
cases. The three residual differences are the narrowest 240-pixel
layouts, content IDs 14--16. Their cells expose 6.943 space widths:
JavaScript makes pixel-aware line-breaking decisions while
`Std.Format` accepts an integer width of six and breaks slightly
earlier. Rounding all widths up is not a solution: that creates 14
differences elsewhere. This is an explicit semantic boundary between
pixel layout and integer-column pretty-printing, not missing width
transport.

The smoke additionally drags the production divider and waits for its
real `ResizeObserver` path. It verifies that the CSS resize changes
the measured column budget, triggers a new VIR mount at exactly that
width, and preserves a rendered goal. This covers the
browser-to-component geometry seam without moving geometry into Lean.

## Improvements demonstrated by VIR

1. The selection policy and stale-reply behavior are pure, typed, and
   covered by nineteen Lean unit tests without constructing a DOM.
2. The same `Std.Format` value flows through layout, annotation
   resolution, goal composition, and React VDOM construction. There is
   no intermediate HTML string or recursive JSON VDOM inside that
   path.
3. React commits the same structural classes used by the existing
   panel, including token classes and `data-binding` metadata. Both
   the virtual host and Chromium verify this.
4. Compiler neutrality is retained: the model and update function
   import only Verso Slides, while the 136-line view is the only
   VIR-specific layer.
5. The generated package manifest makes reached declarations, host
   imports, exports, Lean version, and artifact membership
   inspectable.

## Drawbacks and residual work

1. The cold payload is much larger than the 12.1-KB-gzip production
   panel-plus-formatter. VIR only becomes plausible when the runtime
   is reused.
2. Resident and unified-export generation adds 206 lines to the
   existing Python registry tool and emits a large generated Lean
   module. It removes runtime JSON conversion but introduces
   build-time machinery that should eventually become a reusable
   Verso/VIR facility rather than remain demo-specific.
3. The hybrid performs the real two-pass layout: render structural
   placeholders, measure every `.type` cell in JavaScript, convert
   pixels to monospace columns, and remount. This removes 11 of the
   scalar protocol's 14 real-geometry differences. The remaining three
   expose the approximation when pixel-aware JavaScript layout is
   compared with integer-column `Std.Format`; browser engine and font
   variation therefore remain host-boundary questions.
4. Source discovery, focus outlines, rectangle geometry, dragging,
   fragment automation, hover-doc lookup, markdown rendering, and
   resize observation are browser work and are intentionally not
   implemented by the Lean component.
5. The ordinary production hook adds 53 lines, while the current host
   adapter is 182 lines and still records the lab's per-call timings.
   The resulting fully charged source projection is 10.2%, so adapter
   simplification—not a larger Verso lifecycle API—is the remaining
   human-factors opportunity.
6. React is an additional policy/dependency for ordinary Verso Slides.
   The direct host time in repeated calls shows that changing the
   language of the view does not remove DOM/React cost.
7. The unified package still has 21 members because it retains all
   four typed formatter output variants. A production-selected
   capability subset may be smaller, but splitting the experimental
   matrix again would defeat this consolidation test.
8. `Vir.ProofWidgets.Html` does not currently expose a fragment
   constructor, so matching the existing wrapper-free goal DOM
   requires a four-line local helper over
   `Lean.Vir.React.Node.fragment`. Exposing `Html.fragment` would
   remove this abstraction leak from component code.

## Current assessment

VIR is a good fit for the semantic panel component—selection policy,
typed content, Lean formatting, annotation resolution, and view
composition. It is not a compelling replacement for browser
orchestration or geometry.

That hybrid now exists both behind the **VIR panel component** lab
control and as a production-panel assembly mode. The production mode
uses the ordinary panel, automatically selects the VIR renderer for
resident content, remeasures it after divider changes, and falls back
to the built-in JavaScript renderer if the optional renderer is absent
or declines the content. DOM discovery, focus/outline drawing, width
measurement, dragging, and fallback stay in JavaScript while Lean/VIR
owns the resident goal/signature React subtree.

The production prototype establishes feasibility without adding a
generic lifecycle framework: the shipped surface is two operations and
the original behavior remains the fallback. The source result is more
modest than the earlier before-hook projection: 55.9% less semantic
component code becomes 10.2% less application-specific source after
charging the browser seam. That is useful management data by itself.

The next decision point is whether the existing adapter can lose its
lab instrumentation and become shared VIR integration code without
duplicating the two-pass protocol. Exact pixel parity would require
changing the JavaScript semantics, enriching `Std.Format` with
fractional/font-aware layout, or moving more layout policy into the
browser host; none is justified by three extremely narrow cases.

## Reproduction

```text
lake exe test-panel-component
scripts/build-vir-panel-experiment.sh
(cd experiments/vir-panel && node smoke.mjs)
demos/vir-pretty/scripts/assemble.sh
python3 demos/vir-pretty/scripts/serve.py
uv run --with playwright python demos/vir-pretty/scripts/browser-smoke.py http://127.0.0.1:18332
VIR_PRETTY_PANEL_IMPL=production demos/vir-pretty/scripts/assemble.sh
uv run --with playwright python demos/vir-pretty/scripts/browser-production-panel-smoke.py http://127.0.0.1:18332
node scripts/panel-component-metrics.mjs
```
