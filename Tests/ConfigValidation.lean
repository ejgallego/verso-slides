/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/

module

import VersoSlides

open VersoSlides

def dummyCss (name : String) (body : String := "") : CssFile where
  filename := name
  contents := ⟨body⟩

def dummyAsset (name : String) (body : String := "") : ThemeAsset where
  filename := name
  contents := body.toUTF8

def dummyBundle (stylesheet : CssFile) (assets : Array ThemeAsset := #[]) : CustomTheme :=
  { stylesheet, assets }

def expectOk (desc : String) (cfg : Config) : IO (Except String Unit) := do
  try
    cfg.validateFilenames
    return .ok ()
  catch e =>
    return .error s!"{desc}: expected success, got {e}"

def expectFail (desc : String) (cfg : Config) : IO (Except String Unit) := do
  try
    cfg.validateFilenames
    return .error s!"{desc}: expected failure, got success"
  catch _ =>
    return .ok ()

def expectVirNamespaceFail (desc : String) (cfg : Config) : IO (Except String Unit) := do
  try
    cfg.validateFilenames
    return .error s!"{desc}: expected reserved namespace failure, got success"
  catch e =>
    if ((toString e).splitOn "reserved VIR resource namespace").length > 1 then
      return .ok ()
    else
      return .error s!"{desc}: unexpected error {e}"

def expectRejectedBeforeWrites (desc filename : String) (output : System.FilePath) :
    IO (Except String Unit) := do
  let cfg : Config := { outputDir := output, extraCss := #[dummyCss filename "conflict"] }
  let rejected ← try
    pure ((← slidesMain cfg (.mk #[] "namespace test" none #[] #[])) != 0)
  catch _ => pure true
  if !rejected then return .error s!"{desc}: renderer accepted a conflicting destination"
  if ← output.pathExists then return .error s!"{desc}: renderer wrote output before rejection"
  return .ok ()

/-- String substring check. -/
private def hasSubstr (haystack needle : String) : Bool :=
  haystack.find? needle |>.isSome

/--
Asserts that the collision error message mentions each given substring. The
README promises that collision errors name the offending filename *and both
sources* — this test pins that claim to the actual error text.
-/
def expectFailMentioning (desc : String) (cfg : Config)
    (needles : List String) : IO (Except String Unit) := do
  try
    cfg.validateFilenames
    return .error s!"{desc}: expected failure, got success"
  catch e =>
    let msg := toString e
    let missing := needles.filter (!hasSubstr msg ·)
    if missing.isEmpty then
      return .ok ()
    else
      return .error s!"{desc}: error missing substrings {missing}\n  got: {msg}"

public def main : IO UInt32 := do
  let cwd ← IO.currentDir
  let output := cwd / "_test/namespace-output"
  let assetConfig (filename : String) : Config :=
    { outputDir := output,
      theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset filename]) }
  let cases : List (IO (Except String Unit)) := [
    expectOk "builtin theme + no extraCss" { theme := "black" },
    expectOk "builtin theme + unique extraCss"
      { extraCss := #[dummyCss "a.css", dummyCss "b.css"] },
    expectOk "custom theme + unique extraCss"
      { theme := .custom (dummyCss "theme/my.css"),
        extraCss := #[dummyCss "css/a.css"] },
    expectOk "subdir filenames with shared prefix"
      { extraCss := #[dummyCss "a/x.css", dummyCss "b/x.css"] },
    expectOk "custom theme with assets all distinct"
      { theme := .custom (dummyBundle (dummyCss "theme/my.css")
                           #[dummyAsset "theme/logo.png",
                             dummyAsset "theme/fonts/body.woff2"]),
        extraCss := #[dummyCss "css/a.css"] },
    expectOk "duplicate extraCss filename with identical contents is deduped"
      { extraCss := #[dummyCss "a.css" "body", dummyCss "a.css" "body"] },
    expectFail "duplicate extraCss filename with different contents"
      { extraCss := #[dummyCss "a.css" "one", dummyCss "a.css" "two"] },
    expectOk "custom theme and extraCss with matching filename and contents"
      { theme := .custom (dummyCss "shared.css" "body"),
        extraCss := #[dummyCss "shared.css" "body"] },
    expectFail "custom theme collides with extraCss (diverging contents)"
      { theme := .custom (dummyCss "shared.css" "one"),
        extraCss := #[dummyCss "shared.css" "two"] },
    expectFailMentioning
      "error message names filename and both sources (theme vs extraCss)"
      { theme := .custom (dummyCss "shared.css" "one"),
        extraCss := #[dummyCss "shared.css" "two"] }
      ["shared.css", "theme stylesheet", "extraCss"],
    expectFailMentioning
      "error message names filename and both sources (asset vs asset)"
      { theme := .custom (dummyBundle (dummyCss "theme.css")
                           #[dummyAsset "logo.png" "a",
                             dummyAsset "logo.png" "b"]) }
      ["logo.png", "theme asset"],
    expectFailMentioning
      "error message mentions text and binary kinds on text/binary clash"
      { theme := .custom (dummyBundle (dummyCss "theme.css" "body{}")
                           #[dummyAsset "theme.css" "body{}"]) }
      ["theme.css", "text", "binary"],
    expectFail "collision only detected after nested subdir match"
      { theme := .custom (dummyCss "themes/x.css" "one"),
        extraCss := #[dummyCss "themes/x.css" "two"] },
    expectOk "identical binary asset included twice is deduped"
      { theme := .custom (dummyBundle (dummyCss "theme.css")
                           #[dummyAsset "logo.png" "PNG",
                             dummyAsset "logo.png" "PNG"]) },
    expectFail "two assets with same name differ in bytes"
      { theme := .custom (dummyBundle (dummyCss "theme.css")
                           #[dummyAsset "logo.png" "a",
                             dummyAsset "logo.png" "b"]) },
    expectFail "asset (binary) and stylesheet (text) share a name"
      { theme := .custom (dummyBundle (dummyCss "theme.css" "body{}")
                           #[dummyAsset "theme.css" "body{}"]) },
    expectFail "asset clashes with extraCss even when both are text"
      { theme := .custom (dummyBundle (dummyCss "theme.css")
                           #[dummyAsset "shared.css"]),
        extraCss := #[dummyCss "shared.css"] },
    expectVirNamespaceFail "runtime bundle asset cannot claim lib/vir"
      { theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset "lib/vir/runtime.js"]) },
    expectVirNamespaceFail "staging asset cannot claim lib/.vir-stage"
      { theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset "lib/.vir-stage/stale"]) },
    expectVirNamespaceFail "reserved resource namespace ignores casing"
      { theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset "Lib/ViR/runtime.js"]) },
    expectVirNamespaceFail "reserved staging namespace ignores casing"
      { theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset "LIB/.VIR-STAGE/stale"]) },
    expectVirNamespaceFail "file cannot replace resource library parent"
      { theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset "Lib"]) },
    expectVirNamespaceFail "reserved namespace recognizes portable separators"
      { theme := .custom (dummyBundle (dummyCss "theme.css") #[dummyAsset "LIB\\VIR\\runtime.js"]) }
  ]
  -- Only destinations owned by VIR are reserved. This deliberately does not
  -- impose the separately extracted general asset-filename policy.
  let reserved := [
    "./lib/vir/runtime.js", "lib//vir/runtime.js", "assets/../lib/vir/runtime.js",
    "lib/assets/../vir/runtime.js", "lib/vir/../.vir-stage/stale",
    "assets/../LIB/.VIR-STAGE/stale", "lib/vir/..",
    "assets\\..\\LiB\\ViR\\runtime.js",
    "./vir-bootstrap.js", "VIR-BOOTSTRAP.JS", "assets/../vir-bootstrap.js",
    "assets\\..\\vir-bootstrap.js",
    (output / "lib/vir/runtime.js").toString,
    (output / "LIB/.VIR-STAGE/stale").toString,
    (output / "lib").toString,
    (output / "vir-bootstrap.js").toString,
    "../namespace-output/lib/vir/runtime.js" ]
  let allowed := [
    "lib/viral/runtime.js", "lib/.vir-stage-extra/stale", "nested/lib/vir/runtime.js",
    "assets/../logo.png", "generated//logo.png", "../unrelated/logo.png",
    "./logo.png", (cwd / "_test/unrelated/logo.png").toString,
    "vir-bootstrap.js" ]
  let aliases := reserved.map (fun filename =>
    expectVirNamespaceFail s!"reserved destination alias {filename}" (assetConfig filename))
  let unrelated := allowed.map (fun filename =>
    expectOk s!"unrelated destination {filename}" (assetConfig filename))
  let customOutput := [
    expectVirNamespaceFail "relative output directory with lexical aliases"
      { (assetConfig "./lib//vir/runtime.js") with outputDir := "_test/other/../relative" },
    expectVirNamespaceFail "absolute alias resolves against normalized output directory"
      { (assetConfig ((cwd / "_test/relative/lib/vir/runtime.js").toString)) with
        outputDir := "_test/other/../relative" } ]
  let cases := cases ++ aliases ++ unrelated ++ customOutput
  let stamp ← IO.monoNanosNow
  let rejectedOutput := cwd / s!"_test/namespace-rejected-{stamp}"
  let cases := cases ++ [
    expectRejectedBeforeWrites "resource alias rejected before publication"
      "assets/../lib/vir/runtime.js" rejectedOutput,
    expectRejectedBeforeWrites "bootstrap alias rejected before publication"
      "assets/../vir-bootstrap.js" rejectedOutput,
    expectRejectedBeforeWrites "exact bootstrap collision rejected before publication"
      "vir-bootstrap.js" rejectedOutput ]
  let mut failed := 0
  for run in cases do
    match ← run with
    | .ok () => pure ()
    | .error msg => IO.eprintln msg; failed := failed + 1
  if failed == 0 then
    IO.println s!"All {cases.length} validation cases passed."
    return 0
  else
    IO.eprintln s!"{failed} validation case(s) FAILED."
    return 1
