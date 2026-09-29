/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import Vir.Resources

/-!
Slides-owned publication of complete VIR resource values. This module uses the
real VIR bundle/validation types. It deliberately has no producer path, SDK
selection, acquisition, or browser runtime implementation.

The owning deck generator will call this after its carrier prerequisites have
prepared both embedded bundles. `lib/vir` and `lib/.vir-stage` are Slides-owned
output directories. The ordinary pixel-based panel remains independent.
-/

namespace VersoSlides.VirResourceSite

open Vir.Resources

public structure PublishedResources where
  runtimeManifestUrl : String
  runtimeModuleUrl : String
  programManifestUrls : Array (String × String)
deriving Inhabited

private def invalidSet (error : ResourceError) : IO α :=
  throw <| IO.userError s!"Invalid VIR resource set: {repr error}"

private def writeBytes (path : System.FilePath) (bytes : ByteArray) : IO Unit := do
  IO.FS.createDirAll (path.parent.getD ".")
  IO.FS.writeBinFile path bytes

private def manifestBytes (bundle : Bundle) : ByteArray :=
  ("{\"contentId\":\"" ++ bundle.contentId ++ "\",\"descriptor\":" ++
    String.fromUTF8! (encodeDescriptor bundle.descriptor) ++ "}").toUTF8

private def bundleUrl (bundle : Bundle) : String :=
  "lib/vir/" ++ bundle.contentId

/-- Validate embedded resources and compute movable site-relative loader URLs. -/
public def describe (resources : ResourceSet) : IO PublishedResources := do
  let bundles ← match resources.bundles with
    | .ok bundles => pure bundles
    | .error error => invalidSet error
  let some runtimeModule := resources.runtime.entryPath? "runtimeModule"
    | throw <| IO.userError "Validated VIR runtime is missing runtimeModule role"
  let mut programManifestUrls := #[]
  for bundle in bundles do
    if bundle.descriptor.kind == .program then
      programManifestUrls := programManifestUrls.push
        (bundle.descriptor.logicalId, bundleUrl bundle ++ "/bundle.json")
  return {
    runtimeManifestUrl := bundleUrl resources.runtime ++ "/bundle.json"
    runtimeModuleUrl := bundleUrl resources.runtime ++ "/" ++ runtimeModule
    programManifestUrls
  }

/--
Validate and publish all selected, complete bundles into the generated site.
The returned URLs are relative to the site's `index.html`, so moving the site
under a path prefix does not change the embedded resource bytes or URLs.
-/
public def write (outputDir : System.FilePath) (resources : ResourceSet) :
    IO PublishedResources := do
  let published ← describe resources
  let bundles ← match resources.bundles with
    | .ok bundles => pure bundles
    | .error error => invalidSet error

  let libDir := outputDir / "lib"
  let stage := libDir / ".vir-stage"
  let installed := libDir / "vir"
  if ← libDir.pathExists then
    unless (← libDir.symlinkMetadata).type == .dir do
      throw <| IO.userError "Slides library output path is not a directory"
  else
    IO.FS.createDirAll libDir
  if ← stage.pathExists then
    unless (← stage.symlinkMetadata).type == .dir do
      throw <| IO.userError "Slides VIR staging path is not a directory"
    IO.FS.removeDirAll stage
  IO.FS.createDirAll stage

  for bundle in bundles do
    let bundleDir := stage / bundle.contentId
    writeBytes (bundleDir / "bundle.json") (manifestBytes bundle)
    for file in bundle.files do
      writeBytes (bundleDir / file.path) file.bytes

  if ← installed.pathExists then
    unless (← installed.symlinkMetadata).type == .dir do
      throw <| IO.userError "Slides VIR output path is not a directory"
    IO.FS.removeDirAll installed
  IO.FS.rename stage installed
  return published

end VersoSlides.VirResourceSite
