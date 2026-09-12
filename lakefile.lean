/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/
import Lake

open System Lake DSL

require verso from git "https://github.com/leanprover/verso.git"@"main"
require lean_vir from git "https://github.com/ejgallego/lean-vir.git" @
  "6e68a9e7599ffb82ab198566715d345eb6c6c9ed"

package «verso-slides» where
  version := v!"0.1.0"
  requiresModuleSystem := true

input_dir vendorAssets where
  path := "vendor"

lean_lib VersoSlidesVendored where
  needs := #[vendorAssets]

input_dir webLibAssets where
  path := "web-lib"

lean_lib VersoSlides where
  needs := #[webLibAssets, `@subverso/«subverso-extract-mod»]

lean_lib Demo where
  needs := #[`@verso/+Verso.Code.External:highlighted]

@[default_target] lean_exe «demo-slides» where
  root := `Main
  moreLinkObjs := #[`@/«vir-prettym»:slidesRuntime]

lean_lib «vir-prettym» where
  roots := #[`VersoSlides.VirPrettyM]

library_data virWebAssets : System.FilePath

/-- Link the producer-returned manifest location into a presentation executable.
Registered here so downstream Lakefiles can use it before any helper is built. -/
library_facet slidesRuntime (lib) : System.FilePath := do
  let assets : Job System.FilePath ← fetch <| lib.facet `virWebAssets
  let source := lib.pkg.buildDir / "slides-runtime" / s!"{lib.name}.c"
  let sourceJob ← assets.mapM fun manifest => do
    let manifest ← IO.FS.realPath manifest
    addPureTrace manifest.toString "Slides runtime location"
    let bytes := String.intercalate "," <| manifest.toString.toUTF8.toList.map (toString ·.toNat)
    let contents := "#include <lean/lean.h>\n" ++
      "LEAN_EXPORT lean_obj_res verso_slides_runtime_manifest(lean_obj_arg unit) {\n" ++
      "  static const unsigned char path[] = {" ++ bytes ++ ",0};\n" ++
      "  return lean_mk_string((const char *)path);\n}\n"
    addPureTrace contents "Slides linked manifest"
    buildFileUnlessUpToDate' (text := true) source do
      createParentDirs source
      IO.FS.writeFile source contents
    return source
  buildLeanO (source.withExtension "o") sourceJob

/-- Content receipts cover every generated file, not just index.html. -/
private def slidesOutputReceipt (dir : System.FilePath) : IO String := do
  let paths := (← dir.walkDir fun path => return (← path.symlinkMetadata).type == .dir)
    |>.qsort (fun a b => a.toString < b.toString)
  let mut records := #[]
  for path in paths do
    let state ← match (← path.symlinkMetadata).type with
      | .file => pure s!"{← computeBinFileHash path}"
      | .dir => pure "<directory>"
      | .symlink => pure "<symlink>"
      | .other => pure "<other>"
    records := records.push s!"{path}: {state}"
  return String.intercalate "\n" records.toList

private def slidesInputReceipt (sources : Array Lean.Json) : IO String := do
  let mut records := #[]
  for source in sources do
    let .ok name := source.getStr? | throw <| IO.userError "Invalid Slides input path"
    let path := System.FilePath.mk name
    let state ← if !(← path.pathExists) then pure "<missing>"
      else if ← path.isDir then slidesOutputReceipt path
      else pure s!"{← computeBinFileHash path}"
    records := records.push s!"{name}: {state}"
  return String.intercalate "\n" records.toList

private def slidesReceiptMatches (receipt output : System.FilePath) : IO Bool := do
  unless ← (output / "index.html").pathExists do return false
  let .ok json := Lean.Json.parse (← IO.FS.readFile receipt) | return false
  let .ok files := json.getObjValAs? String "outputs" | return false
  let .ok sources := json.getObjVal? "sources" >>= Lean.Json.getArr? | return false
  let .ok inputs := json.getObjValAs? String "inputs" | return false
  return files == (← slidesOutputReceipt output) && inputs == (← slidesInputReceipt sources)

/-- Build managed sites for the package's default presentation executables. -/
package_facet slides (pkg) : Array System.FilePath := do
  let exes := pkg.defaultTargets.filterMap pkg.findLeanExe?
  if exes.isEmpty then error "The slides facet requires a default presentation executable"
  let jobs ← exes.mapM fun exe => do
    let job ← exe.fetch
    job.mapM fun executable => do
      let output := pkg.buildDir / "slides" / exe.name.toString (escape := false)
      let receipt := pkg.buildDir / "slides" / s!"{exe.name.toString (escape := false)}.receipt"
      let inputs := pkg.buildDir / "slides" / s!"{exe.name.toString (escape := false)}.inputs.json"
      addPureTrace output.toString "Slides site output"
      if ← receipt.pathExists then
        unless ← slidesReceiptMatches receipt output do IO.FS.removeFile receipt
      buildFileUnlessUpToDate' (text := true) receipt do
        proc { cmd := executable.toString, cwd := some pkg.dir
               args := #["--output", output.toString, "--build-inputs", inputs.toString]
               env := ← getAugmentedEnv }
        unless ← (output / "index.html").pathExists do
          error s!"Presentation executable did not write {output / "index.html"}"
        let .ok sources := Lean.Json.parse (← IO.FS.readFile inputs) >>= Lean.Json.getArr?
          | error "Presentation executable did not report its build inputs"
        let record := Lean.Json.mkObj [
          ("outputs", Lean.Json.str (← slidesOutputReceipt output)),
          ("sources", Lean.Json.arr sources),
          ("inputs", Lean.Json.str (← slidesInputReceipt sources))]
        IO.FS.writeFile receipt record.compress
      return output / "index.html"
  return Job.collectArray jobs

lean_exe «extract-lakefile» where
  root := `ExtractLakefile
  supportInterpreter := true

@[test_driver]
lean_exe «verso-slides-test» where root := `TestMain

lean_lib TestFixtures

lean_exe «test-fixtures-build» where
  root := `TestFixtures.Build

lean_lib TestElab where
  needs := #[`@verso/+Verso.Code.External:highlighted]

lean_exe «test-fragmentize» where
  root := `Tests.Fragmentize

lean_exe «test-render» where
  root := `Tests.Render

lean_exe «test-comment-parsers» where
  root := `Tests.CommentParsers

lean_exe «test-config-validation» where
  root := `Tests.ConfigValidation

lean_exe «test-pretty» where
  root := `Tests.Pretty

lean_exe «test-asset-installation» where
  root := `Tests.AssetInstallation
