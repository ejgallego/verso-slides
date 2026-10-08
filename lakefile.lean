/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/
import Lake

open System Lake DSL

require verso from git "https://github.com/leanprover/verso.git"@
  "cad4b633e75ea769b851f12f9ca3b4f0dfcc625f"
require lean_vir from git "https://github.com/ejgallego/lean-vir.git" @
  "bda79d5c4ab7d061c971fcd8917f536393ec03ee"

package «verso-slides» where
  version := v!"0.1.0"
  requiresModuleSystem := true

input_dir vendorAssets where
  path := "vendor"

-- Prepare the formatter pack before the asset module embeds it. This belongs
-- on the asset library: the formatter cannot depend on building its own pack.
lean_lib VersoSlidesVendored where
  needs := #[vendorAssets, `@«verso-slides»/VersoSlidesVendored:virResourcePack]

-- Pair the embedding library with the program module; VIR derives callable
-- declarations from the module's Lean export attributes.
target virPrograms (_pkg) : Array (Lean.Name × Lean.Name) := do
  return Job.pure #[(`VersoSlidesVendored, `VersoSlides.VirPrettyM)]

input_dir webLibAssets where
  path := "web-lib"

lean_lib VersoSlides where
  needs := #[webLibAssets, `@subverso/«subverso-extract-mod»]

lean_lib Demo where
  needs := #[`@verso/+Verso.Code.External:highlighted]

@[default_target] lean_exe «demo-slides» where root := `Main

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
