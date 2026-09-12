/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

import TestFixtures.MinimalThemed

open VersoSlides

private def check (condition : Bool) (message : String) : IO Unit :=
  unless condition do throw <| IO.userError message

private def render (source output : System.FilePath) : IO Unit := do
  let rc ← slidesMain {
    outputDir := output
    extraAssets := #[{ filename := "bootstrap.js", contents := "// loader".toUTF8 }]
    extraAssetDirs := #[{ source, destination := "vir" }]
  } (%doc TestFixtures.MinimalThemed)
  check (rc == 0) "slidesMain failed"

private def testInstallation (dir : System.FilePath) : IO Unit := do
  let source := dir / "producer"
  let first := dir / "first-deck"
  let second := dir / "second-deck"
  IO.FS.createDirAll (source / "nested")
  IO.FS.createDirAll first
  let bytes : ByteArray := ⟨#[0, 97, 255]⟩
  IO.FS.writeBinFile (source / "nested/runtime.wasm") bytes
  IO.FS.writeFile (source / "old-shard") "old"
  IO.FS.writeFile (first / "unrelated.txt") "keep me"
  render source first
  render source second
  check ((← IO.FS.readBinFile (first / "vir/nested/runtime.wasm")) == bytes)
    "binary asset changed during installation"
  check ((← IO.FS.readFile (first / "bootstrap.js")) == "// loader")
    "embedded bootstrap was not installed"

  -- Re-render one deck from a new producer output, leaving the other intact.
  IO.FS.removeFile (source / "old-shard")
  IO.FS.writeFile (source / "new-shard") "new"
  render source first
  check (!(← (first / "vir/old-shard").pathExists)) "stale shard survived"
  check ((← IO.FS.readFile (first / "vir/new-shard")) == "new") "new shard missing"
  check ((← IO.FS.readFile (first / "unrelated.txt")) == "keep me")
    "installation changed unrelated site content"
  check ((← IO.FS.readFile (second / "vir/old-shard")) == "old")
    "rendering one deck changed another deck"
  check (!(← (second / "vir/new-shard").pathExists)) "deck outputs are coupled"

  -- A missing input must fail before replacing a previously rendered site.
  let previousHtml ← IO.FS.readFile (first / "index.html")
  let rejected ← try
    render (dir / "missing") first
    pure false
  catch _ => pure true
  check rejected "missing producer output was accepted"
  check ((← IO.FS.readFile (first / "index.html")) == previousHtml)
    "failed validation changed the previous deck"
  check ((← IO.FS.readFile (first / "vir/new-shard")) == "new")
    "failed validation changed the installed bundle"

  -- A pre-existing destination link is replaced; its target is never removed.
  let linkedDeck := dir / "linked-deck"
  let unrelated := dir / "unrelated-directory"
  IO.FS.createDirAll linkedDeck
  IO.FS.createDirAll unrelated
  IO.FS.writeFile (unrelated / "keep.txt") "keep target"
  let link ← IO.Process.output {
    cmd := "ln", args := #["-s", (← IO.FS.realPath unrelated).toString,
      (linkedDeck / "vir").toString]
  }
  check (link.exitCode == 0) s!"ln failed: {link.stderr}"
  render source linkedDeck
  check ((← IO.FS.readFile (unrelated / "keep.txt")) == "keep target")
    "replacing the destination symlink modified its target"
  check ((← (linkedDeck / "vir").symlinkMetadata).type == .dir)
    "destination symlink was not replaced by the bundle"

public def main : IO UInt32 := do
  -- Keep scratch output inside the checkout, isolated from other test runs.
  IO.FS.createDirAll "_test"
  let temp ← IO.Process.output {
    cmd := "mktemp", args := #["-d", "_test/asset-installation.XXXXXX"]
  }
  check (temp.exitCode == 0) s!"mktemp failed: {temp.stderr}"
  let dir := System.FilePath.mk temp.stdout.trimAscii.toString
  try
    testInstallation dir
    IO.println "Generated-asset installation tests passed."
    return 0
  finally
    IO.FS.removeDirAll dir
