import Lake

open Lake DSL

package vir_panel_experiment

require «verso-slides» from "../.."
require lean_vir from "../../_artifacts/lean-vir"

@[default_target]
lean_lib VirPanelExperiment where
  roots := #[`VirPanelExperiment]

lean_lib VirPanelGenerated where
  roots := #[`VirPanelRegistry, `PrettyHtmlBenchmark]
