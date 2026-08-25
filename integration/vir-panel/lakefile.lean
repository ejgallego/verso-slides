import Lake

open Lake DSL

package vir_panel_integration

require «verso-slides» from "../.."
require lean_vir from git "https://github.com/ejgallego/lean-vir.git" @
  "a7a54ce4ecea986bca899ec7ee6ebe5cd0781ffb"

@[default_target]
lean_lib VirPanel where
  roots := #[`VirPanel]

lean_lib VirPanelGenerated where
  roots := #[`VirPanelRegistry]
