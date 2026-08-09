# VIR pretty-printer demo as a Verso Slides panel extension

This is a standalone seven-backend `Std.Format.prettyM` correctness
and timing demo. During development it uses the containing Verso
Slides checkout through a path dependency. Once `Config.panelPlugins`
is released, `lakefile.lean` can switch directly to that release tag
without changing the demo.

The named comparisons and their controlled variables are listed in
[EXPERIMENTS.md](EXPERIMENTS.md). Prefer a named experiment over an
arbitrary collection of panes when drawing a performance conclusion.
The initial view is **End-to-end implementations**; **All backends**
remains available for exploration.

## Build and serve

From this directory:

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

## Panel extension boundary

The demo uses two configuration surfaces:

- `Config.extraHead` installs runtime URLs and the
  cross-origin-isolation bootstrap before page initialization.
- `Config.panelPlugins` loads the VIR, native, and LLVM candidate
  adapters in order after the built-in formatter registry and before
  the panel consumer.

Verso Slides owns the JavaScript reference renderer, formatter
registry, panel comparison UI, and the generic plugin hook. The demo
owns candidate adapters, Wasm artifacts, runtime configuration,
processor controls, and presentation content. Its VIR adapter accepts
both the historical single-package API and the current package-set
API. Benchmark execution and report visualization are intentionally
absent: they now belong to the standalone VIR benchmark webapp. After
`slidesMain`, `scripts/assemble.sh` assigns resident format IDs in the
generated deck and builds the matching VIR package. It then copies
opaque runtime/native/LLVM artifacts; it neither replaces
`lib/pretty.js`, `lib/panel.js`, nor `lib/panel.css`.

`panelPlugins` is intentionally a narrow API: its classic scripts
execute synchronously in array order at the point where formatter
registration is valid and panel initialization has not yet begun. It
avoids a generic lifecycle framework while supporting this and other
formatter/panel integrations.

## Measurements in this first extraction

The interactive comparison supplies the same format semantics and
deterministic character-column budget to all seven candidates:

1. JavaScript reference
2. VIR through the JSON/string boundary
3. VIR through the typed `Std.Format` boundary
4. VIR typed input with flat text/style-event output
5. VIR package-resident `Std.Format` selected by numeric ID, with flat
   output
6. FIR native Wasm
7. LLVM/Emscripten Wasm

The two new VIR candidates isolate the boundary experiment. `VIR Flat`
removes per-segment tag-stack copies while preserving the direct typed
input control. `VIR Resident` keeps deck formats in a
package-initialized Lean array, so a reflow transfers only the format
ID, width, and indent. The generated metadata records the table size
and `text-events-utf8/v1` output contract. UTF-8 offsets are converted
to JavaScript string boundaries before the existing segment/HTML
renderer runs.

The restored deck has the same functionality as the in-tree prototype:

- live Lean code panels and draggable panel sizing;
- interactive processor selection and single/compare modes;
- named end-to-end, VIR transport, VIR output, and VIR residency
  experiments, with a visible statement of the question each answers;
- shared column budgets and exact tagged-segment comparison;
- selectable timed workload volume (one pass or at least 256/2K/8K
  source code points), repeating the complete visible format set
  identically for every backend;
- selectable total/execute/marshal/decode/HTML/wall timing, plus
  compact four-lane phase tracks with the total above and complete
  hover detail;
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
lean-llvm/{README.md,SHA256SUMS,emscripten-loader.mjs,
           prettyM-emscripten-adapter.mjs,prettyM.manifest.json,
           prettyM.mjs,prettyM.wasm}
```

`scripts/assemble.sh` generates `verso-pretty.irpkg` for the assembled
deck from `VirPrettyDemo/Pretty.lean` plus its deduplicated resident
table. Set `LEAN_VIR_DIR` to a built VIR checkout when it is not
available at `../../_artifacts/lean-vir`. The exported names
deliberately retain the existing `VersoSlides.Pretty.*` ABI so current
artifacts remain usable while the demo is moved out of the Verso
implementation repository.

The host deck, VIR package generator, FIR-native package, and LLVM
package may use different Lean versions: each artifact is a
self-contained bounded runtime and carries its own toolchain/ABI
provenance. Refresh tooling validates each package against its
declared boundary before staging it. The optional native-flat
directory must satisfy
[`contracts/fir-native-flat-v1.json`](contracts/fir-native-flat-v1.json).
Without it, neither the backend nor the FIR output experiment appears
in the deck.
