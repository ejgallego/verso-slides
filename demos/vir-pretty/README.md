# VIR pretty-printer demo as a Verso Slides panel extension

This is a standalone `Std.Format.prettyM` correctness and timing demo
organized as a **backend × compiled-pipeline-breadth** capability
matrix. During development it uses the containing Verso Slides
checkout through a path dependency. Once `Config.panelPlugins` is
released, `lakefile.lean` can switch directly to that release tag
without changing the demo.

The initial view selects **HTML rendering**. JavaScript and VIR are
runnable; FIR and LLVM remain visibly disabled at that breadth until
matching artifacts exist. ABI/transport diagnostics and their
controlled variables are listed in [EXPERIMENTS.md](EXPERIMENTS.md)
and remain in **Custom Lab**.

## Build and serve

From this directory, the comparison lab remains the default:

```sh
lake update
scripts/stage-artifacts.sh
scripts/assemble.sh
python3 scripts/serve.py
```

Open <http://127.0.0.1:18332>. The server supplies the COOP and COEP
headers required by the threaded LLVM artifact. A service-worker
fallback and an Apache `.htaccess` are also included for static
publication.

`stage-artifacts.sh` defaults to the validated artifact bundle in
`../../_test/vir-code/lib`. An explicit seed directory may be passed
as its only argument. For safety, the seed must remain inside this
workspace. The staged binary artifacts and generated site are ignored
by Git.

With Playwright available, run the browser smoke test against a served
deck:

```sh
python3 scripts/browser-smoke.py http://127.0.0.1:18332
```

The smoke discovers all generated resident goal/signature contents and
compares the JavaScript and VIR/React semantic DOM at eight
expand/shrink widths. It also drags the real panel divider and
verifies the `ResizeObserver`-driven VIR remount.

The assembly also exposes three production-shaped profiles. Keep their
outputs separate so they can be compared without rebuilding:

```sh
VIR_PRETTY_PROFILE=js OUT_DIR="$PWD/_profiles/js" scripts/assemble.sh
VIR_PRETTY_PROFILE=vir-fallback OUT_DIR="$PWD/_profiles/vir-fallback" scripts/assemble.sh
VIR_PRETTY_PROFILE=vir-only OUT_DIR="$PWD/_profiles/vir-only" scripts/assemble.sh
python3 scripts/serve.py --directory _profiles/vir-fallback
python3 scripts/browser-production-panel-smoke.py http://127.0.0.1:18332
```

`js` is the ordinary JavaScript panel, `vir-fallback` adds VIR while
retaining the complete JavaScript renderer, and `vir-only` keeps only
the small JavaScript geometry measurer needed by the Lean/VIR component.
These paths have no lab controls. The focused smoke reloads the page,
opens Lean goals and signatures, exercises the real divider/reflow seam,
and checks the appropriate fallback behavior. The reload is intentional:
it covers the case where Reveal becomes ready before the panel script is
evaluated. The legacy `VIR_PRETTY_PANEL_IMPL=production` spelling maps to
`vir-fallback`.

To collect the same cold-start, render, memory, and delivered-resource
measurements used by the evaluation note:

```sh
python3 scripts/browser-profile-measure.py js http://127.0.0.1:18330 _profiles/js
python3 scripts/browser-profile-measure.py vir-fallback http://127.0.0.1:18332 _profiles/vir-fallback
python3 scripts/browser-profile-measure.py vir-only http://127.0.0.1:18331 _profiles/vir-only
```

## Panel extension boundary

The demo uses two configuration surfaces:

- `Config.extraHead` installs runtime URLs and the
  cross-origin-isolation bootstrap before page initialization.
- `Config.panelPlugins` loads the VIR, native, and LLVM candidate
  adapters in order after the built-in formatter registry and before
  the panel consumer.

Verso Slides owns the compact JavaScript reference renderer, ordinary
panel, and the generic plugin hook. The demo owns the expanded
formatter registry, comparison panel, candidate adapters, Wasm
artifacts, runtime configuration, processor controls, and presentation
content. A shared `vir-loader.js` owns package-set/runtime bootstrap;
the formatter lab and production component are independent clients of
that bridge. The demo loads one React-capable runtime. Lab mode generates
one package containing every formatter and panel-component export;
production VIR profiles generate a two-export panel-only package.
Benchmark execution and report
visualization are intentionally absent: they now belong to the
standalone VIR benchmark webapp. After `slidesMain`,
`scripts/assemble.sh` assigns resident format IDs in the generated
deck and builds the matching VIR package. Lab mode then copies opaque
runtime/native/LLVM artifacts and deliberately replaces generated
`lib/pretty.js` with `web/formatter-lab.js`. In that mode it
also replaces `lib/panel.js` with `web/panel-lab.js`; production mode
keeps the generated ordinary panel. `vir-only` replaces the formatter
with the geometry-only `panel-measurer.js`; `js` copies no VIR assets.
No profile replaces `lib/panel.css`.

`panelPlugins` is intentionally a narrow API: its classic scripts
execute synchronously in array order at the point where formatter
registration is valid and panel initialization has not yet begun. It
avoids a generic lifecycle framework while supporting this and other
formatter/panel integrations. The VIR panel adapter is the last plugin
and optionally installs `window.__versoPanelRenderer`, whose complete
contract is `render(panel, source, target)` plus `release(panel)`.

## Main capability matrix

The first UI axis selects JavaScript, VIR, FIR Wasm, and LLVM. The
second fixes how much code the backend owns:

| Breadth            | Backend-owned endpoint                                         | Common host work                                 |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------ |
| Layout             | `prettyM` plus low-level styled output                         | Annotation lookup, HTML construction, DOM commit |
| Semantic rendering | Layout plus innermost annotation resolution into sibling nodes | HTML construction and DOM commit                 |
| HTML rendering     | Layout, annotation resolution, escaping, and span construction | DOM commit only                                  |

Every cell resolves to one explicit primary registered candidate.
Unsupported cells are gray and never fall back to a narrower
candidate. When several implementations share that compiled boundary,
the cell reports the number of variants and its tooltip names them;
Custom Lab selects those variants directly. The registry classifies
VIR flat and resident output as layout variants, VIR resident
render-plan and direct-DOM materialization as semantic variants, and
the optional FIR flat adapter as a layout variant. They vary an ABI or
host endpoint, not compiled breadth, so they do not become additional
matrix columns. The historical VIR JSON path has been removed from
both the matrix and Custom Lab; the typed `Std.Format` boundary is the
narrowest VIR input surface kept by the demo.

The specialized VIR candidates isolate separate boundary experiments.
`VIR Flat` removes per-segment tag-stack copies while preserving the
direct typed input control. `VIR Resident` keeps deck formats in a
package-initialized Lean array, so a reflow transfers only the format
ID, width, and indent. The generated metadata records the table size
and `text-events-utf8/v1` output contract. UTF-8 offsets are converted
to JavaScript string boundaries before the existing segment/HTML
renderer runs.

`VIR Render` moves the next meaningful boundary into Lean: the same
numeric ID addresses aligned package-resident Format and sparse
annotation tables, Lean resolves the innermost active annotation
during `prettyM`, interns annotation metadata once, and returns a flat
semantic render plan whose nodes carry resolved slots. JavaScript only
validates and materializes those sibling text/span nodes. `VIR Render`
constructs an escaped HTML string and commits it through `innerHTML`;
`VIR Direct DOM` constructs a detached `DocumentFragment` through DOM
properties and commits it through `replaceChildren`. Both candidates
therefore end with equivalent populated DOM. Host construction and
commit remain separate timing lanes, and their sum is the primary
materializer metric. This is intentionally not a general recursive
VDOM, because the panel output has no nested element structure today.
Layout and paint remain excluded. The plan remains directly mappable
to React string children and `span` elements, so a future Lean VDOM
should target React's element/props model rather than introduce an
unrelated tree vocabulary here.

The restored deck has the same functionality as the in-tree prototype:

- live Lean code panels and draggable panel sizing;
- an opt-in **VIR panel component** control that mounts complete
  generated goal/signature content by resident ID, first mounts
  structural placeholders, then remounts with every measured type-cell
  width, and falls back to the JavaScript panel path when disabled;
- a two-dimensional backend × compiled-breadth selector plus an
  expandable Custom Lab for ABI diagnostics, arbitrary processor
  selection, raw timing displays, and single/compare modes;
- named VIR output, rendering, materializer, and residency diagnostics
  with explicit changed/held-fixed/measures/excludes descriptions;
- shared column budgets and a visible exact-output equivalence
  verdict;
- selectable timed workload volume (one pass or at least 256/2K/8K
  source code points), repeating the complete visible format set
  identically for every backend;
- selectable
  committed-total/prepare/execute/marshal/decode/build/commit/host/wall
  timing, plus compact experiment-specific phase tracks with the
  primary metric above and complete hover detail; the controls state
  the selected timing envelope and distinguish backend-owned output
  construction from host materialization;
- no benchmark sampler or dashboard code in the slide runtime.

The full benchmark interface is developed independently under
`benchmarks/prettyM-web/` in the VIR repository. The deck may link to
recorded results, but it does not execute the measurement harness.

## Artifact refresh contract

The seed directory has the following stable layout:

```text
lean-vir/js/vir-runtime.js
lean-vir/wasm/vir-upstream.wasm
lean-native/{BUILD.json,SHA256SUMS,prettyM-browser-adapter.mjs,
             prettyM.wasm,prettyM.wasm.json}
lean-native-flat/{BUILD.json,SHA256SUMS,prettyM-browser-adapter.mjs,
                  prettyM.wasm,prettyM.wasm.json}  # optional
lean-native-html/{BUILD.json,SHA256SUMS,prettyM-browser-adapter.mjs,
                  prettyM.wasm,prettyM.wasm.json}  # optional
lean-llvm/{README.md,SHA256SUMS,emscripten-loader.mjs,
           prettyM-emscripten-adapter.mjs,prettyM.manifest.json,
           prettyM.mjs,prettyM.wasm}
```

`scripts/assemble.sh` generates a `VirPanelRegistry` package set from
the assembled deck. Lab mode closes the canonical `VersoSlides.Pretty`
operations, deduplicated format/annotation table, and complete resident
panel contents over one shared table. Production VIR profiles retain the
same resident contents but expose only `mountContent` and `unmount`;
the current result is 14 package members and two exports rather than the
lab package's 21 members and nine exports. The React-capable runtime
serves both formatter and component clients in lab mode, and the browser
smoke asserts that both bridges hold the same runtime object. Set
`LEAN_VIR_DIR` to a built VIR checkout
when it is not available at `../../_artifacts/lean-vir`.

The formatter ABI retains the existing typed, flat, semantic, HTML,
and resident-ID surfaces under `VirPanelRegistry.*`. The
browser-facing component ABI remains only
`mountContent(selector, contentId, widths, measureOnly)` plus
`unmount(selector)`. The structure-only first mount lets CSS establish
the goal grid; the second supplies integer-column widths in rich-text
visual order. Format, annotation, and goal data stay resident in that
same package.

The host deck, VIR package generator, FIR Wasm package, and LLVM
package may use different Lean versions: each artifact is a
self-contained bounded runtime and carries its own toolchain/ABI
provenance. Refresh tooling validates each package against its
declared boundary before staging it. The optional native-flat
directory must satisfy
[`contracts/fir-native-flat-v1.json`](contracts/fir-native-flat-v1.json).
Without it, neither the backend nor the FIR output experiment appears
in the deck.

The optional native-HTML directory must satisfy
[`contracts/fir-native-html-v1.json`](contracts/fir-native-html-v1.json).
Assembly registers it as `native-html` and activates the FIR × HTML
matrix cell; without it, that cell remains gray. The producer handoff
is
[`handoffs/fir-wasm-html-runtime/AGENT_TASK.md`](../../handoffs/fir-wasm-html-runtime/AGENT_TASK.md).

Both optional FIR packages retain the existing
`fir-prettyM-package-metadata-v2` BUILD envelope. Their distinct
`fir.prettyM.flat.browser/v1` and `fir.prettyM.html.browser/v1`
identifiers version different browser result surfaces; they are not
revisions of the package metadata schema.
