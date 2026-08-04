import VersoSlides

open Verso Output Html
open VersoSlides

namespace VirPrettyDemo

def demoCss : CssFile where
  filename := "vir-pretty/demo.css"
  contents := ⟨include_str "../web/demo.css"⟩

def config : Config := {
  theme := "black"
  transition := "slide"
  slideNumber := true
  width := 1280
  height := 800
  outputDir := "_site"
  extraCss := #[demoCss]
  extraHead := #[
    {{ <script src={{"vir-pretty/coi-register.js"}}></script> }},
    {{ <script src={{"vir-pretty/core.js"}}></script> }},
    {{ <script src={{"vir-pretty/pretty-vir.js"}}></script> }},
    {{ <script src={{"vir-pretty/pretty-native.js"}}></script> }},
    {{ <script src={{"vir-pretty/pretty-llvm.js"}}></script> }}
  ]
}

end VirPrettyDemo
