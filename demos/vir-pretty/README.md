# VIR pretty-printer demo on vanilla Verso Slides

This is a standalone five-backend `Std.Format.prettyM` correctness and timing
demo. It depends on the unmodified `v4.32.0` release of Verso Slides; the
directive, application, adapters, artifact staging, benchmark, and chart are
owned by this package.

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

## Extension boundary

The demo uses only released extension surfaces:

- `:::virPrettyDemo` elaborates to the public `VersoSlides.BlockExt.ofHtml`.
- `Config.extraCss` bundles the stylesheet.
- `Config.extraHead` loads the demo-owned bootstrap and candidate adapters.
- Vanilla `lib/pretty.js` remains the JavaScript reference formatter.
- `scripts/assemble.sh` copies opaque artifacts after `slidesMain`; it does not
  parse or rewrite generated HTML.

The generated HTML therefore contains both the extension-provided scripts and
the stock Verso `lib/pretty.js`. No source file in the Verso dependency is
patched or shadowed.

## Measurements in this first extraction

The interactive comparison supplies the same compact `Std.Format` tree and
deterministic character-column budget to all five candidates:

1. JavaScript reference
2. VIR through the JSON/string boundary
3. VIR through the typed `Std.Format` boundary
4. FIR native Wasm
5. LLVM/Emscripten Wasm

It compares canonical tagged segment streams, exposes marshal/execute/decode/
render/total timings on hover, and plots repeated-call median timing against
text volume, format leaves, nesting, break opportunities, or tag depth.

This intentionally does not pull the full campaign runner, fresh-process
launcher, memory sampler, report archive, or performance-card machinery into
the slide package. Those remain useful headless infrastructure, but are not
needed to prove that the presentation itself works as a vanilla extension.

## Artifact refresh contract

The seed directory has the following stable layout:

```text
lean-vir/js/vir-runtime.js
lean-vir/wasm/vir-upstream.wasm
verso-pretty.irpkg
lean-native/{BUILD.json,prettyM-browser-adapter.mjs,prettyM.wasm,prettyM.wasm.json}
lean-llvm/{README.md,SHA256SUMS,emscripten-loader.mjs,
           prettyM-emscripten-adapter.mjs,prettyM.manifest.json,
           prettyM.mjs,prettyM.wasm}
```

`VirPrettyDemo/Pretty.lean` is the source target for regenerating the VIR
package. Its exported names deliberately retain the existing
`VersoSlides.Pretty.*` ABI so current artifacts remain usable while the demo is
moved out of the Verso implementation repository.

The next refresh should move the dependency, `lean-toolchain`, compact-format
ABI metadata, and all three Wasm artifact families to Lean 4.33 together. The
current 4.32 pin is deliberate: it separates the architectural extraction from
an ABI/toolchain migration and lets us compare the two changes independently.
