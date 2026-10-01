/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/
module

import VersoSlides.VirResourceSite
import VersoSlides.VirResources
import Vir.Resources.Sha256
import Lean.Data.Json.Printer
import Lean.Data.Json.Parser
import Lean.Data.Json.FromToJson.Basic

open Vir.Resources VersoSlides.VirResourceSite

private def check (condition : Bool) (message : String) : IO Unit :=
  unless condition do throw <| IO.userError message

private def sampleBundle (kind : BundleKind) (id : String)
    (files : Array File) (entries : Array FileEntry) : Bundle := Id.run do
  let descriptor : Descriptor := {
    schemaVersion := 1, logicalId := id, kind
    compatibility := { leanRevision := "synthetic", virVersion := 1 }
    files := files.map fun file => {
      path := file.path, mediaType := "application/octet-stream"
      byteLength := file.bytes.size, sha256 := sha256 file.bytes }
    fileEntries := entries, exports := #[] }
  return { contentId := descriptor.contentId, descriptor, files }

private def sampleResources : ResourceSet := {
  runtime := sampleBundle .runtime "synthetic/runtime"
    #[{ path := "runtime.js", bytes := "// runtime".toUTF8 },
      { path := "runtime.wasm", bytes := ⟨#[0, 255, 97]⟩ }]
    #[{ role := "runtimeModule", path := "runtime.js" }, { role := "wasm", path := "runtime.wasm" }]
  programs := #[sampleBundle .program "synthetic/program"
    #[{ path := "program.json", bytes := "{}".toUTF8 }]
    #[{ role := "programSet", path := "program.json" }]] }

private def expectFailure (action : IO α) : IO Unit := do
  let rejected ← try action *> pure false catch _ => pure true
  check rejected "expected rejection"

private def tests (dir : System.FilePath) : IO Unit := do
  let resources := sampleResources
  let plan ← prepare { resources with programs := resources.programs ++ resources.programs }
  check (plan.published.programManifestUrls.size == 1) "identical program was not deduplicated"
  let first := dir / "first"
  let nested := dir / "nested/deck"
  let published ← write first plan
  let again ← write nested plan
  check (published.runtimeModuleUrl == again.runtimeModuleUrl) "moving site changed URLs"
  check (published.runtimeModuleUrl == s!"lib/vir/{resources.runtime.contentId}/runtime.js")
    "runtime URL does not select the validated identity"
  check (published.programManifestUrls == again.programManifestUrls) "program URLs changed"
  let installed := first / "lib/vir"
  check ((← installed.readDir).size == 2) "unexpected installed identity count"
  for bundle in #[resources.runtime, resources.programs[0]!] do
    let manifest ← IO.FS.readFile (installed / bundle.contentId / "bundle.json")
    let json ← match Lean.Json.parse manifest with
      | .ok json => pure json
      | .error e => throw <| IO.userError e
    let identity ← IO.ofExcept (json.getObjValAs? String "contentId")
    check (identity == bundle.contentId) "manifest identity changed"
    let descriptor ← IO.ofExcept (json.getObjVal? "descriptor")
    let expected ← IO.ofExcept (Lean.Json.parse (String.fromUTF8! (encodeDescriptor bundle.descriptor)))
    check (descriptor == expected) "manifest descriptor changed"
    check (manifest == (← IO.FS.readFile (nested / "lib/vir" / bundle.contentId / "bundle.json")))
      "plan reuse changed manifest bytes"
    for file in bundle.files do
      check ((← IO.FS.readBinFile (installed / bundle.contentId / file.path)) == file.bytes)
        "publication changed binary payload"
  IO.FS.writeFile (first / "unrelated") "keep"
  IO.FS.writeFile (installed / "stale") "old inventory"
  IO.FS.createDirAll (first / "lib/.vir-stage")
  IO.FS.writeFile (first / "lib/.vir-stage/stale") "interrupted publication"
  let _ ← write first plan
  check (!(← (installed / "stale").pathExists)) "stale installed file survived"
  check (!(← (first / "lib/.vir-stage").pathExists)) "stale stage survived"
  check ((← IO.FS.readFile (first / "unrelated")) == "keep") "unrelated file changed"

  -- Independent upstream admission rejects invalid sets before a writer exists.
  let oldManifest ← IO.FS.readBinFile (first / published.runtimeManifestUrl)
  let corruptFiles := resources.runtime.files.modify 0 fun file =>
    { file with bytes := "changed".toUTF8 }
  let corrupt := { resources.runtime with files := corruptFiles }
  let wrongId := { resources.runtime with contentId := String.ofList (List.replicate 64 '0') }
  for runtime in #[corrupt, wrongId] do
    expectFailure (prepare { resources with runtime })
    check ((← IO.FS.readBinFile (first / published.runtimeManifestUrl)) == oldManifest)
      "rejected plan changed installed resources"
  let missing := dir / "invalid-plan"
  expectFailure do
    let invalid ← prepare { resources with runtime := corrupt }
    write missing invalid
  check (!(← missing.pathExists)) "invalid plan performed output writes"

  -- The selected successor's generic admission rejects conflicting shared
  -- directory spelling before the application can prepare a publication plan.
  let mixed := sampleBundle .runtime "synthetic/mixed"
    #[{ path := "Assets/runtime.js", bytes := "// runtime".toUTF8 },
      { path := "assets/runtime.wasm", bytes := ⟨#[0, 255, 97]⟩ }]
    #[{ role := "runtimeModule", path := "Assets/runtime.js" },
      { role := "wasm", path := "assets/runtime.wasm" }]
  let error ← try
    let _ ← prepare { resources with runtime := mixed }
    pure ""
  catch error => pure error.toString
  check ((error.splitOn "DIRECTORY_CASE_CONFLICT").length > 1)
    "shared directory casing was not rejected by generic admission"

  -- Check all output path types before mutating an existing site or stale stage.
  IO.FS.writeFile (first / "lib/.vir-stage") "not a directory"
  expectFailure (write first plan)
  check ((← IO.FS.readBinFile (first / published.runtimeManifestUrl)) == oldManifest)
    "staging preflight failure damaged installed resources"
  IO.FS.removeFile (first / "lib/.vir-stage")
  let wrongOutput := dir / "wrong-output"
  IO.FS.createDirAll (wrongOutput / "lib/.vir-stage")
  IO.FS.writeFile (wrongOutput / "lib/.vir-stage/sentinel") "keep stage"
  IO.FS.writeFile (wrongOutput / "lib/vir") "keep output"
  expectFailure (write wrongOutput plan)
  check ((← IO.FS.readFile (wrongOutput / "lib/.vir-stage/sentinel")) == "keep stage")
    "invalid installed output modified staging before rejection"
  check ((← IO.FS.readFile (wrongOutput / "lib/vir")) == "keep output")
    "invalid installed output was modified"
  let wrongLibrary := dir / "wrong-library"
  IO.FS.createDirAll wrongLibrary
  IO.FS.writeFile (wrongLibrary / "lib") "keep library"
  expectFailure (write wrongLibrary plan)
  check ((← IO.FS.readFile (wrongLibrary / "lib")) == "keep library") "invalid library was modified"

  -- A denied staging write preserves the installed directory. This is not a
  -- guarantee about the remove/rename gap after staging completes.
  let chmod ← IO.Process.output { cmd := "chmod", args := #["500", (first / "lib").toString] }
  check (chmod.exitCode == 0) "chmod failed"
  try expectFailure (write first plan)
  finally
    let restored ← IO.Process.output { cmd := "chmod", args := #["700", (first / "lib").toString] }
    check (restored.exitCode == 0) "permission restoration failed"
  check ((← IO.FS.readBinFile (first / published.runtimeManifestUrl)) == oldManifest)
    "denied staging write damaged installed resources"
  let _ ← write first plan

  let target := dir / "untouched-target"
  IO.FS.createDirAll target
  IO.FS.writeFile (target / "sentinel") "keep target"
  for entry in #["lib", "lib/.vir-stage", "lib/vir"] do
    let output := dir / entry.replace "/" "-"
    IO.FS.createDirAll (output / "lib")
    if entry == "lib" then IO.FS.removeDir (output / "lib")
    let link ← IO.Process.output {
      cmd := "ln"
      args := #["-s", (← IO.FS.realPath target).toString, (output / entry).toString] }
    check (link.exitCode == 0) "ln failed"
    expectFailure (write output plan)
    check ((← IO.FS.readFile (target / "sentinel")) == "keep target") "symlink target was modified"
  let broken := dir / "broken-link"
  IO.FS.createDirAll (broken / "lib")
  let link ← IO.Process.output {
    cmd := "ln"
    args := #["-s", "/not-present-verso-publication-target", (broken / "lib/vir").toString] }
  check (link.exitCode == 0) "broken ln failed"
  expectFailure (write broken plan)
  check ((← (broken / "lib/vir").symlinkMetadata).type == .symlink) "broken symlink was followed"

private def benchmark (output : System.FilePath) : IO Unit := do
  let mut preparation := #[]
  for _ in [:5] do
    let start ← IO.monoNanosNow
    let _ ← prepare VersoSlides.virResources
    preparation := preparation.push ((← IO.monoNanosNow) - start)
  let plan ← prepare VersoSlides.virResources
  let mut publication := #[]
  for _ in [:5] do
    let start ← IO.monoNanosNow
    let _ ← write output plan
    publication := publication.push ((← IO.monoNanosNow) - start)
  IO.println <| Lean.Json.compress <| Lean.Json.mkObj [
    ("prepareNanos", Lean.toJson preparation), ("writeReusedPlanNanos", Lean.toJson publication)]

public def main (args : List String) : IO UInt32 := do
  if let ["--benchmark", output] := args then
    benchmark output
    return 0
  IO.FS.createDirAll "_test"
  let temp ← IO.Process.output { cmd := "mktemp", args := #["-d", "_test/vir-publication.XXXXXX"] }
  check (temp.exitCode == 0) "mktemp failed"
  let dir := System.FilePath.mk temp.stdout.trimAscii.toString
  try
    tests dir
    IO.println "Validated publication plan tests passed (synthetic resources)."
    return 0
  finally IO.FS.removeDirAll dir
