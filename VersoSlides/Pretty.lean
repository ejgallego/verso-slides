/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import Lean

namespace VersoSlides.Pretty

open Std

/-!
DOM-independent support for rendering Lean's `Std.Format` values.

The browser continues to own measurement, annotation lookup, HTML construction,
and DOM updates. This module only replaces the handwritten JavaScript port of
`Std.Format.prettyM` with Lean's implementation.
-/

/-- A rendered piece of text and the active `Std.Format.tag` IDs for it. -/
public structure Segment where
  text : String
  tags : Array Nat
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
  pushOutput s :=
    if s.isEmpty then
      pure ()
    else
      modify fun st =>
        { st with
          segments := st.segments.push { text := s, tags := st.tagStack }
          column := st.column + String.Internal.length s }
  pushNewline indent :=
    modify fun st =>
      { st with
        segments := st.segments.push {
          text := String.Internal.pushn "\n" ' ' indent
          tags := #[]
        }
        column := indent }
  currColumn := return (← get).column
  startTag tag :=
    modify fun st => { st with tagStack := st.tagStack.push tag }
  endTags count :=
    modify fun st => { st with tagStack := popTags st.tagStack count }

/-- Render a `Std.Format` into text segments, preserving active tag IDs. -/
public def formatSegments (f : Std.Format) (width : Nat) (indent : Nat := 0) :
    Array Segment :=
  let act : PrettyM Unit := Std.Format.prettyM f width indent
  (act.run {}).2.segments

/-- Render a `Std.Format` to plain text. Useful for tests and non-DOM clients. -/
public def formatPlain (f : Std.Format) (width : Nat) (indent : Nat := 0) : String :=
  String.join <| (formatSegments f width indent).toList.map fun segment => segment.text

end VersoSlides.Pretty
