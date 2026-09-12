import Lake
open System Lake DSL

require «verso-slides» from "../.."

package «my-talk» where
  requiresModuleSystem := true
  buildDir := "talk-build"

lean_lib MyTalk

lean_lib «talk-runtime» where
  roots := #[`MyTalk.Runtime]

lean_exe «my-talk» where
  root := `Main

library_data virWebAssets : System.FilePath

@[default_target] target «deck-site» (pkg) : System.FilePath := do
  let some lib := pkg.findLeanLib? `«talk-runtime» | error "missing talk-runtime"
  let assets : Job System.FilePath ← fetch <| lib.facet `virWebAssets
  let exe ← «my-talk».fetch
  let output := pkg.dir / ((get_config? deckOutput).getD "_slides")
  assets.bindM fun manifest => exe.mapM fun executable => do
    proc { cmd := executable.toString
           args := #["--vir-manifest", manifest.toString, "--output", output.toString]
           env := ← getAugmentedEnv }
    return output / "index.html"
