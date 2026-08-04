import VirPrettyDemo.Extension

open VersoSlides

namespace VirPrettyDemo

#doc (Slides) "Lean prettyM across five WebAssembly backends" =>

# One formatter, five execution paths

The same compact `Std.Format` input is rendered with the same column budget and
compared as a tagged segment stream.

:::virPrettyDemo
:::

# What this isolates

- JavaScript is the browser reference implementation.
- VIR JSON includes the string boundary; VIR direct calls the typed format ABI.
- Native is FIR's compiler-generated Lean-to-Wasm artifact.
- LLVM is the Emscripten-produced Wasm artifact.
- Hover any timing to inspect marshal, execute, decode, render, and total time.

# Standalone by construction

This deck depends on the unmodified `v4.32.0` release of Verso Slides. Its
directive, stylesheet, application code, adapters, artifacts, benchmarks, and
charts all live in the demo package.

end VirPrettyDemo
