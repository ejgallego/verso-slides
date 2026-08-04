import Lake

open Lake DSL

-- During upstream development this points at the containing checkout. Once
-- `Config.panelPlugins` is released, this becomes the corresponding git tag.
require «verso-slides» from "../.."

package «vir-pretty-demo» where
  version := v!"0.1.0"

lean_lib VirPrettyDemo

@[default_target]
lean_exe «vir-pretty-demo» where
  root := `Main
