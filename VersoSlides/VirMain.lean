/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/
module

public import VersoSlides

namespace VersoSlides

/-- Supplied by the selected library's `slidesRuntime` Lake facet. -/
@[extern "verso_slides_runtime_manifest"]
private opaque runtimeManifest : Unit → String

/-- Presentation entry point with a Lake-linked VIR artifact. The executable
selects one runtime library through `moreLinkObjs := #[`@/LIB:slidesRuntime]`.
No build-directory layout or extra command-line handoff is needed. -/
public def virSlidesMain (config : Config := {}) (doc : Verso.Doc.Part Slides)
    (args : List String := []) : IO UInt32 :=
  slidesMain { config with virManifest := some (runtimeManifest ()) } doc args

end VersoSlides
