/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import Vir.Resources

namespace VersoSlides.VirResourceSite

open Vir.Resources

/-- The built-in formatter's validated site files and relative loader URLs.
The renderer writes these through its ordinary asset plan. -/
public structure PublicationPlan where
  private mk ::
  runtimeManifestUrl : String
  runtimeModuleUrl : String
  programManifestUrl : String
  files : Array File

private def manifestBytes (bundle : Bundle) : ByteArray :=
  ("{\"contentId\":\"" ++ bundle.contentId ++ "\",\"descriptor\":" ++
    String.fromUTF8! (encodeDescriptor bundle.descriptor) ++ "}").toUTF8

private def bundleUrl (bundle : Bundle) : String :=
  "lib/vir/" ++ bundle.contentId

/-- Prepare the built-in runtime and single PrettyM program before output writes.
VIR validates the resource set once; URLs and bytes reuse that result. -/
public def prepare (resources : ResourceSet) : IO PublicationPlan := do
  unless resources.programs.size == 1 do
    throw <| IO.userError "Slides PrettyM requires exactly one program bundle"
  let bundles ← match resources.bundles with
    | .ok bundles => pure bundles
    | .error error => throw <| IO.userError s!"Invalid VIR resource set: {repr error}"
  let some runtimeModule := resources.runtime.entryPath? "runtimeModule"
    | throw <| IO.userError "Validated VIR runtime is missing runtimeModule role"
  let mut files := #[]
  for bundle in bundles do
    files := files.push { path := bundleUrl bundle ++ "/bundle.json", bytes := manifestBytes bundle }
    for file in bundle.files do
      files := files.push { file with path := bundleUrl bundle ++ "/" ++ file.path }
  return ⟨bundleUrl resources.runtime ++ "/bundle.json",
    bundleUrl resources.runtime ++ "/" ++ runtimeModule,
    bundleUrl resources.programs[0]! ++ "/bundle.json", files⟩

end VersoSlides.VirResourceSite
