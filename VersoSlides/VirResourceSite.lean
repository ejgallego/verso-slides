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
output directories. Lean formatting through VIR is mandatory.
-/

namespace VersoSlides.VirResourceSite

open Vir.Resources

public structure PublishedResources where
  runtimeManifestUrl : String
  runtimeModuleUrl : String
  programManifestUrls : Array (String × String)
deriving Inhabited

/-- A validated inventory and its site-relative loader URLs. Only `prepare`
constructs plans; publication reuses the owned bytes without repeating admission. -/
public structure PublicationPlan where
  private mk ::
  published : PublishedResources
  private files : Array File

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

/-- Validate the complete resource set once, then prepare manifests, owned bytes
and movable site-relative URLs before any publication writes. -/
public def prepare (resources : ResourceSet) : IO PublicationPlan := do
  let bundles ← match resources.bundles with
    | .ok bundles => pure bundles
    | .error error => invalidSet error
  let some runtimeModule := resources.runtime.entryPath? "runtimeModule"
    | throw <| IO.userError "Validated VIR runtime is missing runtimeModule role"
  let mut programManifestUrls := #[]
  let mut files := #[]
  for bundle in bundles do
    if bundle.descriptor.kind == .program then
      programManifestUrls := programManifestUrls.push
        (bundle.descriptor.logicalId, bundleUrl bundle ++ "/bundle.json")
    files := files.push { path := bundle.contentId ++ "/bundle.json", bytes := manifestBytes bundle }
    for file in bundle.files do
      files := files.push { file with path := bundle.contentId ++ "/" ++ file.path }
  return ⟨{
    runtimeManifestUrl := bundleUrl resources.runtime ++ "/bundle.json"
    runtimeModuleUrl := bundleUrl resources.runtime ++ "/" ++ runtimeModule
    programManifestUrls
  }, files⟩

private def existingDirectory (path : System.FilePath) (label : String) : IO Bool := do
  let metadata ← try path.symlinkMetadata catch
    | .noFileOrDirectory .. => return false
    | error => throw error
  unless metadata.type == .dir do
    throw <| IO.userError s!"Slides {label} path is not a directory"
  return true

/--
Publish one previously validated plan into the generated site.
The returned URLs are relative to the site's `index.html`, so moving the site
under a path prefix does not change the embedded resource bytes or URLs.

This writer requires exclusive ownership of the output. It replaces a complete
staging directory and removes stale installed files. A staging failure preserves
the installed resource directory and may leave a partial stage for the next call
to remove. Installed resources are removed before the final rename: failure or
interruption in that gap can leave them absent. Other site files are written by
the renderer separately; this is not transactional old-or-new site publication.
-/
public def write (outputDir : System.FilePath) (plan : PublicationPlan) :
    IO PublishedResources := do
  let libDir := outputDir / "lib"
  let stage := libDir / ".vir-stage"
  let installed := libDir / "vir"
  -- Check every owned directory before modifying an existing output, including
  -- broken symlinks. Concurrent writers are outside this writer's contract.
  let libraryExists ← existingDirectory libDir "library output"
  let stageExists ← existingDirectory stage "VIR staging"
  let installedExists ← existingDirectory installed "VIR output"
  unless libraryExists do IO.FS.createDirAll libDir
  if stageExists then IO.FS.removeDirAll stage
  IO.FS.createDirAll stage

  for file in plan.files do
    writeBytes (stage / file.path) file.bytes

  if installedExists then IO.FS.removeDirAll installed
  IO.FS.rename stage installed
  return plan.published

end VersoSlides.VirResourceSite
