/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Panel.Component
import Vir.Attributes
import Vir.ProofWidgets.Html

namespace VersoSlides.VirPanel

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

private def modelRichText (model : Panel.Model) (index : Nat) (value : Panel.RichText) : Html :=
  if model.measureOnly then
    Html.spanWith #[Attr.className "reflowed"] #[]
  else
    richText value (model.richTextWidth index)

private def missingFormat : Html :=
  Html.spanWith #[Attr.className "no-format"] #[Html.text "(no format data)"]

private def hypothesis (model : Panel.Model) (value : Panel.Hypothesis)
    (index : Nat) : Html × Nat :=
  let (type, nextIndex) :=
    match value.type? with
    | none => (missingFormat, index)
    | some value => (modelRichText model index value, index + 1)
  (Html.spanWith #[Attr.className "hypothesis"] #[
      Html.spanWith #[Attr.className "name"] #[Html.text (String.intercalate " " value.names.toList)],
      Html.spanWith #[Attr.className "colon"] #[Html.text ":"],
      Html.spanWith #[Attr.className "type"] #[type]
    ], nextIndex)

private def goal (model : Panel.Model) (value : Panel.Goal) (index : Nat) : Html × Nat :=
  let name := value.name.map fun name =>
    Html.spanWith #[Attr.className "goal-name"] #[Html.text name]
  let (hypothesisNodes, index) :=
    value.hypotheses.foldl (init := (#[], index)) fun (nodes, index) value =>
      let (node, index) := hypothesis model value index
      (nodes.push node, index)
  let hypotheses :=
    if hypothesisNodes.isEmpty then
      none
    else
      some <| Html.spanWith #[Attr.className "hypotheses"]
        hypothesisNodes
  let (conclusionType, index) :=
    match value.conclusion? with
    | none => (missingFormat, index)
    | some value => (modelRichText model index value, index + 1)
  let conclusion :=
    Html.spanWith #[Attr.className "conclusion"] #[
      Html.spanWith #[Attr.className "goal-vdash"] #[Html.text value.goalPrefix],
      Html.spanWith #[Attr.className "type"] #[conclusionType]
    ]
  (Html.divWith #[Attr.className "goal"] <|
      name.toArray ++ hypotheses.toArray ++ #[conclusion], index)

private def fragment (children : Array Html) : Html := do
  Lean.Vir.React.Node.fragment (← Html.children children)

private def contentView (model : Panel.Model) : Html :=
  match model.content with
  | .empty => Html.divWith #[Attr.className "panel-empty"] #[]
  | .signature value => modelRichText model 0 value
  | .goals values =>
    let (nodes, _) := values.foldl (init := (#[], 0)) fun (nodes, index) value =>
      let (node, index) := goal model value index
      (nodes.push node, index)
    fragment nodes

/-- React view for the compiler-neutral panel model. -/
public def view : Lean.Vir.React.Component Panel.Model := fun model =>
  match model.content with
  | .signature value => modelRichText model 0 value
  | _ => Html.spanWith #[Attr.className "hl lean"] #[contentView model]

/-- Unmount the component and release React-retained resources. -/
public def unmount (selector : String) : DomM Bool :=
  Lean.Vir.React.Root.unmountSelector selector

end VersoSlides.VirPanel
