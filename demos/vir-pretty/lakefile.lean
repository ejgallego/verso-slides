import Lake

open Lake DSL

require «verso-slides» from git
  "https://github.com/leanprover/verso-slides.git" @ "v4.32.0"

package «vir-pretty-demo» where
  version := v!"0.1.0"

lean_lib VirPrettyDemo

@[default_target]
lean_exe «vir-pretty-demo» where
  root := `Main
