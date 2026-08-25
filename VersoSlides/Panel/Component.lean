/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import VersoSlides.Pretty

namespace VersoSlides.Panel

open Std

/-!
A compiler-neutral model for the semantic part of the code information panel.

The model deliberately stops at browser capabilities. Lean owns selection
policy, goal/signature composition, annotation resolution, and pretty-printing;
the host remains responsible for discovering source elements, obtaining their
payloads, measuring the available cell widths, and committing the view to the DOM.

Keeping this module independent of VIR makes the experiment useful to every
bounded Lean runtime. A VIR-specific React view lives in `experiments/vir-panel`.
-/

/-- One annotated Lean value ready for layout. -/
public structure RichText where
  format : Std.Format
  annotations : Array Pretty.TaggedAnnotation := #[]
deriving Inhabited

/-- One local declaration in a tactic state. -/
public structure Hypothesis where
  names : Array String
  type? : Option RichText := none
deriving Inhabited

/-- One goal in a tactic state. -/
public structure Goal where
  name : Option String := none
  hypotheses : Array Hypothesis := #[]
  goalPrefix : String := "⊢"
  conclusion? : Option RichText := none
deriving Inhabited

/-- Semantic content supported by the first panel-component experiment. -/
public inductive Content where
  | empty
  | goals (values : Array Goal)
  | signature (value : RichText)
deriving Inhabited

/-- State owned by the panel component rather than by DOM properties. -/
public structure Model where
  activeSource : Option Nat := none
  content : Content := .empty
  /-- Fallback expression width in monospace columns. -/
  width : Nat := 40
  /-- Optional per-rich-text widths in visual order. -/
  widths : Array Nat := #[]
  /-- Render only structural placeholders while the host measures cells. -/
  measureOnly : Bool := false
deriving Inhabited

/-- Width for one rich-text cell, falling back to the shared panel width. -/
public def Model.richTextWidth (model : Model) (index : Nat) : Nat :=
  max 1 (model.widths[index]?.getD model.width)

/-- Browser observations and user actions that can change the panel model. -/
public inductive Event where
  /-- Outermost-to-innermost clickable source IDs under one pointer event. -/
  | selectCandidates (sourceIds : Array Nat)
  | provideContent (sourceId : Nat) (content : Content)
  | resized (width : Nat)
  | resizedCells (widths : Array Nat)
  | clear
deriving Inhabited

/-- Browser capabilities requested by the pure update function. -/
public inductive Effect where
  | clearSourceFocus
  | focusSource (sourceId : Nat)
  | requestContent (sourceId : Nat)
  | requestWidth
deriving Repr, BEq, Inhabited

/-- The result of applying one event without performing browser effects. -/
public structure Transition where
  model : Model
  effects : Array Effect := #[]
deriving Inhabited

private def selectSource (active : Option Nat) (sourceIds : Array Nat) : Option Nat :=
  if sourceIds.isEmpty then
    none
  else
    match active.bind fun sourceId => sourceIds.findIdx? (· == sourceId) with
    | some index =>
      if index + 1 < sourceIds.size then sourceIds[index + 1]? else sourceIds[0]?
    | none => sourceIds[0]?

/--
Pure panel state transition.

Nested selections cycle from the outermost source toward the click target, as
the current JavaScript panel does. Content is accepted only for the source that
is still active, preventing a delayed host reply from replacing a newer click.
-/
public def update (model : Model) : Event → Transition
  | .selectCandidates sourceIds =>
    match selectSource model.activeSource sourceIds with
    | none => { model }
    | some sourceId =>
      { model := { model with activeSource := some sourceId, content := .empty }
        effects := #[
          .clearSourceFocus,
          .focusSource sourceId,
          .requestContent sourceId
        ] }
  | .provideContent sourceId content =>
    if model.activeSource == some sourceId then
      { model := { model with content, widths := #[], measureOnly := true }
        effects := #[.requestWidth] }
    else
      { model }
  | .resized width =>
    { model := { model with width := max 1 width, widths := #[], measureOnly := false } }
  | .resizedCells widths =>
    let widths := widths.map (max 1)
    { model := { model with
        width := widths[0]?.getD model.width, widths, measureOnly := false } }
  | .clear =>
    { model := { model with
        activeSource := none, content := .empty, widths := #[], measureOnly := false }
      effects := #[.clearSourceFocus] }

/-- Lay out annotated text at the width currently owned by the model. -/
public def RichText.renderPlan (value : RichText) (width : Nat) : Pretty.RenderPlan :=
  Pretty.formatRenderPlan value.format value.annotations (max 1 width)

/-- Render plans produced by the current content, in visual order. -/
public def Content.renderPlans (content : Content) (width : Nat) : Array Pretty.RenderPlan :=
  match content with
  | .empty => #[]
  | .signature value => #[value.renderPlan width]
  | .goals values =>
    values.foldl (init := #[]) fun plans goal =>
      let plans := goal.hypotheses.foldl (init := plans) fun plans hypothesis =>
        match hypothesis.type? with
        | none => plans
        | some value => plans.push (value.renderPlan width)
      match goal.conclusion? with
      | none => plans
      | some value => plans.push (value.renderPlan width)

end VersoSlides.Panel
