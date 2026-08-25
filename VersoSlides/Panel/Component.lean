/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import VersoSlides.Pretty

namespace VersoSlides.Panel

/-!
Compiler-neutral data model for the semantic portion of the code information
panel. A bounded runtime owns these values and formatting; the browser host
retains discovery, measurement, focus, and lifecycle.
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

/-- Semantic content supported by the panel component. -/
public inductive Content where
  | empty
  | goals (values : Array Goal)
  | signature (value : RichText)
deriving Inhabited

/-- Per-mount panel state supplied to the runtime-owned view. -/
public structure Model where
  content : Content := .empty
  /-- Fallback expression width in monospace columns. -/
  width : Nat := 40
  /-- Optional per-rich-text widths in visual order. -/
  widths : Array Nat := #[]
  /-- Render structural placeholders while the browser measures cells. -/
  measureOnly : Bool := false
deriving Inhabited

/-- Width for one rich-text cell, falling back to the shared panel width. -/
public def Model.richTextWidth (model : Model) (index : Nat) : Nat :=
  max 1 (model.widths[index]?.getD model.width)

/-- Lay out annotated text at a specific monospace-column width. -/
public def RichText.renderPlan (value : RichText) (width : Nat) : Pretty.RenderPlan :=
  Pretty.formatRenderPlan value.format value.annotations (max 1 width)

end VersoSlides.Panel
