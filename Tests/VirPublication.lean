/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/
module

import VersoSlides.VirResources
import VersoSlides.Render
import Lean.Data.Json.Parser
import Lean.Data.Json.FromToJson.Basic

open Vir.Resources

private def check (condition : Bool) (message : String) : IO Unit :=
  unless condition do throw <| IO.userError message

private def expectFailure (action : IO α) : IO Unit := do
  let rejected ← try action *> pure false catch _ => pure true
  check rejected "expected rejection"

private def tests (dir : System.FilePath) : IO Unit := do
  -- The generic inventory/manifest validation belongs to VIR's own tests.
  -- Slides retains only its one-program requirement and real writer behavior.
  expectFailure (VersoSlides.prepareVirSite { VersoSlides.virResources with programs := #[] })
  expectFailure (VersoSlides.prepareVirSite { VersoSlides.virResources with
    programs := VersoSlides.virResources.programs ++ VersoSlides.virResources.programs })

  -- Exercise the real renderer's ordinary asset writer. Publication writes in
  -- place, preserves unrelated/stale files, and is not whole-site transactional.
  let config : VersoSlides.Config := { outputDir := dir / "site" }
  let doc : Verso.Doc.Part VersoSlides.Slides := .mk #[] "publication" none #[] #[]
  let blocked := dir / "namespace"
  let forbidden : VersoSlides.CssFile := {
    filename := "LiB/VIR/clobber.css", contents := ⟨"body {}"⟩ }
  expectFailure (VersoSlides.slidesMain { config with
    outputDir := blocked, extraCss := #[forbidden] } doc)
  check (!(← blocked.pathExists)) "namespace rejection wrote output"
  check ((← VersoSlides.slidesMain config doc) == 0) "initial render failed"
  let builtin ← VersoSlides.prepareVirSite VersoSlides.virResources
  for file in builtin.files do
    check ((← IO.FS.readBinFile (config.outputDir / file.path)) == file.bytes)
      "renderer changed a prepared file"
  let html ← IO.FS.readFile (config.outputDir / "index.html")
  check ((html.splitOn "window.__versoVirResourceUrls = ").length == 2)
    "inline bootstrap was not emitted once"
  let urlsText := ((html.splitOn "window.__versoVirResourceUrls = ")[1]!.splitOn ";\n").head!
  let urls ← IO.ofExcept (Lean.Json.parse urlsText)
  for (key, expected) in [("runtimeModule", builtin.runtimeModule),
      ("runtimeManifest", builtin.runtimeManifest), ("programManifest", builtin.programManifests[0]!)] do
    check ((← IO.ofExcept (urls.getObjValAs? String key)) == expected)
      s!"bootstrap changed the library-owned {key} path"
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
