/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/
import VersoSlides
import Demo

open VersoSlides

private def virPanelConfig : Config := {
  theme := "black"
  slideNumber := true
  transition := "slide"
  extraJs := #[
    "vir-panel/runtime.js",
    "vir-panel/component.js"
  ]
}

def main : IO UInt32 :=
  slidesMain
    (config := virPanelConfig)
    (doc := %doc Demo)
