# VIR pretty-printer demo as a Verso Slides panel extension

This is a standalone five-backend `Std.Format.prettyM` correctness and timing
demo. During development it uses the containing Verso Slides checkout through
a path dependency. Once `Config.panelPlugins` is released, `lakefile.lean` can
switch directly to that release tag without changing the demo.

## Build and serve

From this directory:

```sh
lake update
scripts/stage-artifacts.sh
scripts/assemble.sh
python3 scripts/serve.py
```

Open <http://127.0.0.1:18332>. The server supplies the COOP and COEP headers
required by the threaded LLVM artifact. A service-worker fallback and an
Apache `.htaccess` are also included for static publication.

`stage-artifacts.sh` defaults to the validated artifact bundle in
`../../_test/vir-code/lib`. An explicit seed directory may be passed as its
only argument. For safety, the seed must remain inside this workspace. The
staged binary artifacts and generated site are ignored by Git.

With Playwright available, run the browser smoke test against a served deck:

```sh
python3 scripts/browser-smoke.py http://127.0.0.1:18332
```

## Panel extension boundary

The demo uses two configuration surfaces:

- `Config.extraHead` installs runtime URLs and the cross-origin-isolation
  bootstrap before page initialization.
- `Config.panelPlugins` loads the VIR, native, and LLVM candidate adapters in
  order after the built-in formatter registry and before the panel consumer.

Verso Slides owns the JavaScript reference renderer, formatter registry, panel
comparison UI, and the generic plugin hook. The demo owns candidate adapters,
Wasm artifacts, runtime configuration, processor controls, and presentation
content. Its VIR adapter accepts both the historical single-package API and the
current package-set API. Benchmark execution and report visualization are
intentionally absent: they now belong to the standalone VIR benchmark webapp.
`scripts/assemble.sh` copies opaque artifacts after `slidesMain`; it neither
rewrites HTML nor replaces `lib/pretty.js`, `lib/panel.js`, or `lib/panel.css`.

`panelPlugins` is intentionally a narrow API: its classic scripts execute
synchronously in array order at the point where formatter registration is
valid and panel initialization has not yet begun. It avoids a generic lifecycle
framework while supporting this and other formatter/panel integrations.

## Measurements in this first extraction

The interactive comparison supplies the same compact `Std.Format` tree and
deterministic character-column budget to all five candidates:

1. JavaScript reference
2. VIR through the JSON/string boundary
3. VIR through the typed `Std.Format` boundary
4. FIR native Wasm
5. LLVM/Emscripten Wasm

The restored deck has the same functionality as the in-tree prototype:

- live Lean code panels and draggable panel sizing;
- interactive processor selection and single/compare modes;
- shared column budgets and exact tagged-segment comparison;
- selectable total/execute/marshal/decode/HTML/wall timing, plus compact
  four-lane phase tracks with the total above and complete hover detail;
- no benchmark sampler or dashboard code in the slide runtime.

The full benchmark interface is developed independently under
`benchmarks/prettyM-web/` in the VIR repository. The deck may link to recorded
results, but it does not execute the measurement harness.

## Artifact refresh contract

The seed directory has the following stable layout:

```text
lean-vir/js/vir-runtime.js
lean-vir/wasm/vir-upstream.wasm
verso-pretty.irpkg
lean-native/{BUILD.json,SHA256SUMS,prettyM-browser-adapter.mjs,
             prettyM.wasm,prettyM.wasm.json}
lean-llvm/{README.md,SHA256SUMS,emscripten-loader.mjs,
           prettyM-emscripten-adapter.mjs,prettyM.manifest.json,
           prettyM.mjs,prettyM.wasm}
```

`VirPrettyDemo/Pretty.lean` is the source target for regenerating the VIR
package. Its exported names deliberately retain the existing
`VersoSlides.Pretty.*` ABI so current artifacts remain usable while the demo is
moved out of the Verso implementation repository.

The host deck and VIR package follow this checkout's Lean toolchain. Native and
LLVM packages are self-contained bounded runtimes and retain their own Lean
version and ABI provenance in capability metadata; they need not match the host
toolchain. Refresh tooling validates each package against its declared boundary
before staging it.
