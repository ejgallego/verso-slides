/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/
module

import VersoSlides.VirResourceSite
import VersoSlides.VirResources
import Vir.Hash
import VersoSlides.Render
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
      byteLength := file.bytes.size, sha256 := Vir.sha256 file.bytes }
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
  let plan ← prepare resources
  check (plan.runtimeModuleUrl == s!"lib/vir/{resources.runtime.contentId}/runtime.js")
    "runtime URL does not select the validated identity"
  check (plan.programManifestUrl == s!"lib/vir/{resources.programs[0]!.contentId}/bundle.json")
    "single program URL does not select the validated identity"
  check (plan.files.size == 5) "unexpected prepared inventory"
  for bundle in #[resources.runtime, resources.programs[0]!] do
    let bundlePrefix := s!"lib/vir/{bundle.contentId}"
    let some manifest := plan.files.find? (·.path == bundlePrefix ++ "/bundle.json")
      | throw <| IO.userError "missing manifest"
    let json ← IO.ofExcept (Lean.Json.parse (String.fromUTF8! manifest.bytes))
    let identity ← IO.ofExcept (json.getObjValAs? String "contentId")
    check (identity == bundle.contentId) "manifest identity changed"
    let descriptor ← IO.ofExcept (json.getObjVal? "descriptor")
    let expected ← IO.ofExcept (Lean.Json.parse (String.fromUTF8! (encodeDescriptor bundle.descriptor)))
    check (descriptor == expected) "manifest descriptor changed"
    for file in bundle.files do
      let some prepared := plan.files.find? (·.path == bundlePrefix ++ "/" ++ file.path)
        | throw <| IO.userError "missing payload"
      check (prepared.bytes == file.bytes) "preparation changed payload bytes"
  expectFailure (prepare { resources with programs := #[] })
  expectFailure (prepare { resources with programs := resources.programs ++ resources.programs })
  let corruptFiles := resources.runtime.files.modify 0 fun file =>
    { file with bytes := "changed".toUTF8 }
  expectFailure (prepare { resources with runtime := { resources.runtime with files := corruptFiles } })
  expectFailure (prepare { resources with runtime := { resources.runtime with contentId := String.ofList (List.replicate 64 '0') } })

  -- Exercise the real renderer's ordinary asset writer. Publication writes in
  -- place, preserves unrelated/stale files, and is not whole-site transactional.
  let config : VersoSlides.Config := { outputDir := dir / "site" }
  let doc : Verso.Doc.Part VersoSlides.Slides := .mk #[] "publication" none #[] #[]
  check ((← VersoSlides.slidesMain config doc) == 0) "initial render failed"
  let builtin ← prepare VersoSlides.virResources
  for file in builtin.files do
    check ((← IO.FS.readBinFile (config.outputDir / file.path)) == file.bytes)
      "renderer changed a prepared file"
  let html ← IO.FS.readFile (config.outputDir / "index.html")
  check ((html.splitOn "window.__versoVirResourceUrls = ").length == 2)
    "inline bootstrap was not emitted once"
  check (!(← (config.outputDir / "vir-bootstrap.js").pathExists)) "external bootstrap was emitted"
  check (!(← (config.outputDir / "lib/.vir-stage").pathExists)) "staging directory was emitted"
  IO.FS.writeFile (config.outputDir / "lib/vir/stale") "keep stale"
  IO.FS.writeFile (config.outputDir / "unrelated") "keep unrelated"
  check ((← VersoSlides.slidesMain config doc) == 0) "repeat render failed"
  check ((← IO.FS.readFile (config.outputDir / "lib/vir/stale")) == "keep stale") "stale policy changed"
  check ((← IO.FS.readFile (config.outputDir / "unrelated")) == "keep unrelated") "unrelated file changed"

  -- An ordinary output error can leave index/vendor files written. Fixing the
  -- destination and rerunning must complete the inventory without a private stage.
  let broken := dir / "partial"
  IO.FS.createDirAll (broken / "lib")
  IO.FS.writeFile (broken / "lib/vir") "not a directory"
  let rejected ← try
    let _ ← VersoSlides.slidesMain { config with outputDir := broken } doc
    pure false
  catch _ => pure true
  check rejected "invalid resource output did not fail"
  check ((← IO.FS.readFile (broken / "lib/vir")) == "not a directory") "invalid output file was modified"
  check (← (broken / "index.html").pathExists) "partial-write policy was not exercised"
  IO.FS.removeFile (broken / "lib/vir")
  check ((← VersoSlides.slidesMain { config with outputDir := broken } doc) == 0) "recovery render failed"
  for file in builtin.files do
    check ((← IO.FS.readBinFile (broken / file.path)) == file.bytes) "recovery inventory differs"

public def main : IO UInt32 := do
  IO.FS.createDirAll "_test"
  let temp ← IO.Process.output { cmd := "mktemp", args := #["-d", "_test/vir-publication.XXXXXX"] }
  check (temp.exitCode == 0) "mktemp failed"
  let dir := System.FilePath.mk temp.stdout.trimAscii.toString
  try
    tests dir
    IO.println "Single-program plan and ordinary publication tests passed."
    return 0
  finally IO.FS.removeDirAll dir
