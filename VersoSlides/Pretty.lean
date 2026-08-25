/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import Lean

namespace VersoSlides.Pretty

open Std

/-!
Compiler-neutral rendering primitives shared by the browser panel and bounded
Lean runtimes. Browser discovery, measurement, HTML, and DOM lifecycle remain
outside this module.
-/

/-- A rendered piece of text and the active `Std.Format.tag` IDs for it. -/
public structure Segment where
  text : String
  tags : Array Nat
deriving Repr, BEq, Inhabited

/-- Browser styling metadata associated with a `Std.Format.tag` ID. -/
public structure TokenAnnotation where
  cssClass : String
  binding : Option String
deriving Repr, BEq, Inhabited

/-- One sparse tag-to-annotation entry. Tag IDs need not be dense. -/
public structure TaggedAnnotation where
  tag : Nat
  annotation : TokenAnnotation
deriving Repr, BEq, Inhabited

/-- One text node with an optional annotation-table slot. -/
public structure RenderNode where
  text : String
  /-- `0` is unstyled; `n + 1` selects `RenderPlan.annotations[n]`. -/
  annotationSlot : Nat
deriving Repr, BEq, Inhabited

/-- A flat, DOM-independent rendering plan. -/
public structure RenderPlan where
  annotations : Array TokenAnnotation
  nodes : Array RenderNode
deriving Repr, BEq, Inhabited

private structure PrettyState where
  segments : Array Segment := #[]
  column : Nat := 0
  tagStack : Array Nat := #[]
deriving Inhabited

private abbrev PrettyM := StateM PrettyState

private def popTags (tags : Array Nat) : Nat → Array Nat
  | 0 => tags
  | n + 1 => popTags tags.pop n

private instance : Std.Format.MonadPrettyFormat PrettyM where
  pushOutput text :=
    if text.isEmpty then
      pure ()
    else
      modify fun state =>
        { state with
          segments := state.segments.push { text, tags := state.tagStack }
          column := state.column + String.Internal.length text }
  pushNewline indent :=
    modify fun state =>
      { state with
        segments := state.segments.push {
          text := String.Internal.pushn "\n" ' ' indent
          tags := #[]
        }
        column := indent }
  currColumn := return (← get).column
  startTag tag :=
    modify fun state => { state with tagStack := state.tagStack.push tag }
  endTags count :=
    modify fun state => { state with tagStack := popTags state.tagStack count }

/-- Render a `Std.Format` into text segments, preserving active tag IDs. -/
public def formatSegments (format : Std.Format) (width : Nat) (indent : Nat := 0) :
    Array Segment :=
  let action : PrettyM Unit := Std.Format.prettyM format width indent
  (action.run {}).2.segments

/-- Render a `Std.Format` to plain text. Useful for tests and non-DOM clients. -/
public def formatPlain (format : Std.Format) (width : Nat) (indent : Nat := 0) : String :=
  String.join <| (formatSegments format width indent).toList.map fun segment => segment.text

private def annotationTableSorted (annotations : Array TaggedAnnotation) : Bool :=
  let rec visit : Nat → Nat → Bool
    | 0, _ => true
    | fuel + 1, index =>
      if index + 1 < annotations.size then
        if annotations[index]!.tag ≤ annotations[index + 1]!.tag then
          visit fuel (index + 1)
        else
          false
      else
        true
  visit annotations.size 0

private def sortedAnnotationSlotFor
    (annotations : Array TaggedAnnotation) (tag : Nat) : Nat :=
  let rec upper : Nat → Nat → Nat → Nat
    | 0, lo, _ => lo
    | fuel + 1, lo, hi =>
      if lo < hi then
        let mid := lo + (hi - lo) / 2
        if annotations[mid]!.tag ≤ tag then
          upper fuel (mid + 1) hi
        else
          upper fuel lo mid
      else
        lo
  let after := upper (annotations.size + 1) 0 annotations.size
  if after == 0 then
    0
  else
    let index := after - 1
    if annotations[index]!.tag == tag then index + 1 else 0

private def annotationSlotFor
    (annotations : Array TaggedAnnotation) (sorted : Bool) (tag : Nat) : Nat :=
  if sorted then
    sortedAnnotationSlotFor annotations tag
  else
    let rec visit : Nat → Nat
      | 0 => 0
      | index + 1 =>
        let entry := annotations[index]!
        if entry.tag == tag then index + 1 else visit index
    visit annotations.size

private def innermostAnnotationSlot
    (annotations : Array TaggedAnnotation) (sorted : Bool) (tags : Array Nat) : Nat :=
  let rec visit : Nat → Nat
    | 0 => 0
    | index + 1 =>
      let slot := annotationSlotFor annotations sorted tags[index]!
      if slot == 0 then visit index else slot
  visit tags.size

/-- Run `Std.Format.prettyM` and resolve tag IDs to semantic text nodes. -/
public def formatRenderPlan (format : Std.Format)
    (annotations : Array TaggedAnnotation) (width : Nat) (indent : Nat := 0) : RenderPlan :=
  let sorted := annotationTableSorted annotations
  let nodes := (formatSegments format width indent).map fun segment => {
    text := segment.text
    annotationSlot := innermostAnnotationSlot annotations sorted segment.tags
  }
  { annotations := annotations.map fun entry => entry.annotation, nodes }

end VersoSlides.Pretty
