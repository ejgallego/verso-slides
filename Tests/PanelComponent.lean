/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Panel.Component

open VersoSlides

namespace Tests.PanelComponent

private def check (name : String) (condition : Bool) : IO Bool := do
  unless condition do IO.eprintln s!"FAIL: {name}"
  return condition

def main : IO UInt32 := do
  let initial : Panel.Model := {}
  let outer := Panel.update initial (.selectCandidates #[10, 20])
  let inner := Panel.update outer.model (.selectCandidates #[10, 20])
  let wrapped := Panel.update inner.model (.selectCandidates #[10, 20])
  let stale := Panel.update inner.model (.provideContent 10 (.goals #[]))
  let current := Panel.update inner.model (.provideContent 20 (.goals #[]))
  let narrow := Panel.update current.model (.resized 0)
  let cells := Panel.update narrow.model (.resizedCells #[0, 7])
  let cleared := Panel.update cells.model .clear
  let rendered :=
    Panel.Content.renderPlans
      (.signature { format := Std.Format.group ("hello" ++ Std.Format.line ++ "world") })
      8

  let results ← #[("outermost source selected", outer.model.activeSource == some 10),
      ("selection requests browser capabilities", outer.effects == #[
        .clearSourceFocus, .focusSource 10, .requestContent 10]),
      ("second click selects inner source", inner.model.activeSource == some 20),
      ("last source wraps to outer source", wrapped.model.activeSource == some 10),
      ("stale content reply ignored", stale.effects.isEmpty),
      ("current content requests width", current.effects == #[.requestWidth]),
      ("content starts with a measurement pass", current.model.measureOnly),
      ("width is clamped", narrow.model.width == 1),
      ("uniform resize completes measurement", !narrow.model.measureOnly),
      ("uniform resize clears cell widths", narrow.model.widths.isEmpty),
      ("cell widths are clamped", cells.model.widths == #[1, 7]),
      ("cell resize updates fallback width", cells.model.width == 1),
      ("cell resize completes measurement", !cells.model.measureOnly),
      ("cell width uses measured value", cells.model.richTextWidth 1 == 7),
      ("cell width falls back", cells.model.richTextWidth 2 == 1),
      ("clear drops selection", cleared.model.activeSource.isNone),
      ("clear drops measurement state", cleared.model.widths.isEmpty && !cleared.model.measureOnly),
      ("clear requests focus cleanup", cleared.effects == #[.clearSourceFocus]),
      ("component uses Lean pretty layout",
        rendered[0]?.map (fun plan => plan.nodes.map (·.text)) == some #["hello", "\n", "world"])]
    |>.mapM fun (name, condition) => check name condition

  if results.all id then
    IO.println s!"All {results.size} panel component tests passed."
    return 0
  else
    return 1

end Tests.PanelComponent

def main : IO UInt32 :=
  Tests.PanelComponent.main
