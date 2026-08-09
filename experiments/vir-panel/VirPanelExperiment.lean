/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Panel.Component
import Vir.Attributes
import Vir.ProofWidgets.Html

namespace VirPanelExperiment

open Lean.Vir
open Lean.Vir.Browser (DomM)
open Lean.Vir.ProofWidgets
open VersoSlides

private def renderedNode
    (plan : Pretty.RenderPlan) (node : Pretty.RenderNode) : Html :=
  let text := Html.text node.text
  if node.annotationSlot == 0 then
    text
  else
    match plan.annotations[node.annotationSlot - 1]? with
    | none => text
    | some annotation =>
      let attrs := #[Attr.className (annotation.cssClass ++ " token")] ++
        match annotation.binding with
        | none => #[]
        | some binding => #[Attr.data "binding" binding]
      Html.spanWith attrs #[text]

private def richText (value : Panel.RichText) (width : Nat) : Html :=
  let plan := value.renderPlan width
  Html.spanWith #[Attr.className "reflowed"] (plan.nodes.map (renderedNode plan))

private def missingFormat : Html :=
  Html.spanWith #[Attr.className "no-format"] #[Html.text "(no format data)"]

private def hypothesis (value : Panel.Hypothesis) (width : Nat) : Html :=
  Html.spanWith #[Attr.className "hypothesis"] #[
    Html.spanWith #[Attr.className "name"] #[Html.text (String.intercalate " " value.names.toList)],
    Html.spanWith #[Attr.className "colon"] #[Html.text ":"],
    Html.spanWith #[Attr.className "type"] #[value.type?.map (richText · width) |>.getD missingFormat]
  ]

private def goal (value : Panel.Goal) (width : Nat) : Html :=
  let name := value.name.map fun name =>
    Html.spanWith #[Attr.className "goal-name"] #[Html.text name]
  let hypotheses :=
    if value.hypotheses.isEmpty then
      none
    else
      some <| Html.spanWith #[Attr.className "hypotheses"]
        (value.hypotheses.map (hypothesis · width))
  let conclusion := Html.spanWith #[Attr.className "conclusion"] #[
    Html.spanWith #[Attr.className "goal-vdash"] #[Html.text value.goalPrefix],
    Html.spanWith #[Attr.className "type"] #[
      value.conclusion?.map (richText · width) |>.getD missingFormat
    ]
  ]
  Html.divWith #[Attr.className "goal"] <|
    name.toArray ++ hypotheses.toArray ++ #[conclusion]

/-- React view for the compiler-neutral panel model. -/
def view : Lean.Vir.React.Component Panel.Model := fun model =>
  match model.content with
  | .empty => Html.divWith #[Attr.className "panel-empty"] #[]
  | .signature value => richText value model.width
  | .goals values => Html.divWith #[Attr.className "panel-goals"]
      (values.map (goal · model.width))

/-- Mount an arbitrary panel model supplied through VIR's typed boundary. -/
@[vir_export]
def mountModel (selector : String) (model : Panel.Model) : DomM Bool :=
  Lean.Vir.React.Root.renderComponentIntoSelector selector view model

/-- Unmount the component and release React-retained resources. -/
@[vir_export]
def unmount (selector : String) : DomM Bool :=
  Lean.Vir.React.Root.unmountSelector selector

private def fixtureModel (width : Nat) : Panel.Model :=
  let annotation : Pretty.TaggedAnnotation := {
    tag := 7
    annotation := { cssClass := "keyword", binding := some "Nat" }
  }
  let type : Panel.RichText := {
    format := Std.Format.group (Std.Format.tag 7 "Nat" ++ Std.Format.line ++ "→ Nat")
    annotations := #[annotation]
  }
  { activeSource := some 1
    width
    content := .goals #[{
      name := some "case demo"
      hypotheses := #[{ names := #["n"], type? := some type }]
      goalPrefix := "⊢"
      conclusion? := some {
        format := Std.Format.group ("n" ++ Std.Format.line ++ "+ 1 = Nat.succ n")
      }
    }] }

/-- Deterministic browser smoke fixture; only selector and layout width cross the ABI. -/
@[vir_export]
def mountFixture (selector : String) (width : Nat) : DomM Bool :=
  Lean.Vir.React.Root.renderComponentIntoSelector selector view (fixtureModel width)

end VirPanelExperiment
