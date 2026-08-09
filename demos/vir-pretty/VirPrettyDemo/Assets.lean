import VersoSlides

open Verso Output Html
open VersoSlides

namespace VirPrettyDemo

def runtimeConfig : Html := Html.text false <| String.intercalate "\n" [
  "<script>",
  "window.__versoPrettyConfig = { compare: true, controls: true, columns: 40 };",
  "window.__versoPrettyVirConfig = {",
  "  runtimeUrl: new URL(\"vir-pretty/lean-vir/js/vir-runtime.js\", window.location.href).href,",
  "  wasmUrl: new URL(\"vir-pretty/lean-vir/wasm/vir-upstream.wasm\", window.location.href).href,",
  "  irPackageUrl: new URL(\"vir-pretty/verso-pretty.irpkg\", window.location.href).href",
  "};",
  "window.__versoPrettyNativeConfig = {",
  "  adapterUrl: new URL(\"vir-pretty/lean-native/prettyM-browser-adapter.mjs\", window.location.href).href,",
  "  wasmUrl: new URL(\"vir-pretty/lean-native/prettyM.wasm\", window.location.href).href,",
  "  descriptorUrl: new URL(\"vir-pretty/lean-native/prettyM.wasm.json\", window.location.href).href,",
  "  buildUrl: new URL(\"vir-pretty/lean-native/BUILD.json\", window.location.href).href",
  "};",
  "window.__versoPrettyLlvmConfig = {",
  "  adapterUrl: new URL(\"vir-pretty/lean-llvm/prettyM-emscripten-adapter.mjs\", window.location.href).href,",
  "  manifestUrl: new URL(\"vir-pretty/lean-llvm/prettyM.manifest.json\", window.location.href).href",
  "};",
  "</script>"
]

def config : Config := {
  theme := "black"
  transition := "slide"
  outputDir := "_site"
  extraHead := #[
    runtimeConfig,
    {{ <script src={{"vir-pretty/coi-register.js"}}></script> }}
  ]
  panelPlugins := #[
    "vir-pretty/pretty-experiments.js",
    "vir-pretty/pretty-vir.js",
    "vir-pretty/pretty-native.js",
    "vir-pretty/pretty-llvm.js"
  ]
}

end VirPrettyDemo
