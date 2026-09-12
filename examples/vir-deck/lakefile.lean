import Lake
open System Lake DSL

require «verso-slides» from "../.."

package «my-talk» where
  requiresModuleSystem := true
  buildDir := "talk-build"

lean_lib MyTalk

lean_lib «talk-runtime» where
  roots := #[`MyTalk.Runtime]

@[default_target] lean_exe «my-talk» where
  root := `Main
  moreLinkObjs := #[`@/«talk-runtime»:slidesRuntime]
