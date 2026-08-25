/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/
import VersoSlides
import Demo
import VersoUtil.BinFiles

open VersoSlides
open Verso.BinFiles

private def virPrettyMBootstrap : Asset where
  filename := "vir-prettym-runtime.js"
  contents := include_bin "web-lib/vir-prettym/runtime.js"

private def virPrettyMConfig : Config := {
  theme := "black"
  slideNumber := true
  transition := "slide"
  extraJs := #[virPrettyMBootstrap.filename]
  extraAssets := #[virPrettyMBootstrap]
  extraAssetDirs := #[{
    source := ".lake/build/vir/browser/VirPrettyM"
    destination := "vir-prettym"
  }]
}

def main : IO UInt32 :=
  slidesMain
    (config := virPrettyMConfig)
    (doc := %doc Demo)
