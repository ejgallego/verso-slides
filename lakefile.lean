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

@[default_target] lean_exe «demo-slides» where root := `Main

lean_lib «vir-prettym» where
  roots := #[`VersoSlides.VirPrettyM]

library_data virWebAssets : System.FilePath

/-- Build the deck using the artifact location returned by VIR. -/
target «demo-site» (pkg) : System.FilePath := do
  let some lib := pkg.findLeanLib? `«vir-prettym» | error "missing vir-prettym library"
  let assets : Job System.FilePath ← fetch <| lib.facet `virWebAssets
  let exe ← «demo-slides».fetch
  let output := pkg.dir / ((get_config? deckOutput).getD "_slides")
  assets.bindM fun manifest => exe.mapM fun executable => do
    proc { cmd := executable.toString
           args := #["--vir-manifest", manifest.toString, "--output", output.toString]
           env := ← getAugmentedEnv }
    return output / "index.html"

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
