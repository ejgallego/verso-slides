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

/-- Recoverable application failures; none of these invalidates a VIR program. -/
public inductive FormatError where
  | invalidInput | inputNodes | inputDepth | inputBytes | textBytes | hardLines
  | tagValue | width | indentation | outputBytes | outputSegments | outputTags
deriving Repr, BEq, Inhabited

/-- Inclusive limits. Depth counts the root as one; text limits count UTF-8 bytes. -/
public structure Limits where
  maxNodes : Nat := 10000
  maxDepth : Nat := 128
  maxInputBytes : Nat := 65536
  maxTextBytes : Nat := 16384
  maxHardLines : Nat := 4096
  maxColumns : Nat := 4096
  maxIndent : Nat := 4096
  maxTag : Nat := 99999999999999999999
  maxOutputBytes : Nat := 1048576
  maxSegments : Nat := 10000
  maxTagEntries : Nat := 65536
deriving Repr, Inhabited

public def limits : Limits := {}

-- A fuelled worklist checks the complete input before prettyM starts. Bounding
-- every cumulative signed nest also bounds prettyM's internal align allocation,
-- which happens before it calls pushOutput. Negative indentation keeps Lean's
-- toNat/clamping semantics; its magnitude is bounded too.
private def checkInput (lim : Limits) :
    Nat → List (Format × Nat × Int) → Nat → Nat → Except FormatError Unit
  | _, [], _, _ => .ok ()
  | 0, _ :: _, _, _ => .error .inputNodes
  | fuel + 1, (f, depth, indent) :: rest, bytes, lines => do
    if depth > lim.maxDepth then throw .inputDepth
    if indent.natAbs > lim.maxIndent then throw .indentation
    let next (child : Format) (indent' := indent) := (child, depth + 1, indent')
    match f with
    | .nil | .line | .align _ => checkInput lim fuel rest bytes lines
    | .text s =>
      if s.utf8ByteSize > lim.maxTextBytes then throw .textBytes
      let bytes := bytes + s.utf8ByteSize
      if bytes > lim.maxInputBytes then throw .inputBytes
      let mut lines := lines
      for c in s do
        if c == '\n' then
          lines := lines + 1
          if lines > lim.maxHardLines then throw .hardLines
      checkInput lim fuel rest bytes lines
    | .append left right =>
      checkInput lim fuel (next left :: next right :: rest) bytes lines
    | .nest n child => checkInput lim fuel (next child (indent + n) :: rest) bytes lines
    | .group child _ => checkInput lim fuel (next child :: rest) bytes lines
    | .tag tag child =>
      if tag > lim.maxTag then throw .tagValue
      checkInput lim fuel (next child :: rest) bytes lines

private structure PrettyState where
  segments : Array Segment := #[]
  column : Nat := 0
  tagStack : Array Nat := #[]
  outputBytes : Nat := 0
  tagEntries : Nat := 0
deriving Inhabited

private abbrev PrettyM := ReaderT Limits (StateT PrettyState (Except FormatError))

-- Reserve output before constructing indentation or appending a segment.
private def reserveOutput (bytes : Nat) : PrettyM Unit := do
  let lim ← read
  let st ← get
  if st.outputBytes + bytes > lim.maxOutputBytes then throw .outputBytes
  if st.segments.size >= lim.maxSegments then throw .outputSegments
  if st.tagEntries + st.tagStack.size > lim.maxTagEntries then throw .outputTags
  modify fun st => { st with
    outputBytes := st.outputBytes + bytes
    tagEntries := st.tagEntries + st.tagStack.size }

private def popTags (tags : Array Nat) : Nat → Array Nat
  | 0 => tags
  | n + 1 => popTags tags.pop n

private instance : Std.Format.MonadPrettyFormat PrettyM where
  pushOutput s :=
    if s.isEmpty then
      pure ()
    else do
      reserveOutput s.utf8ByteSize
      modify fun st =>
        { st with
          segments := st.segments.push { text := s, tags := st.tagStack }
          column := st.column + String.Internal.length s }
  pushNewline indent := do
    if indent > (← read).maxIndent then throw .indentation
    reserveOutput (indent + 1)
    modify fun st =>
      { st with
        segments := st.segments.push {
          text := String.Internal.pushn "\n" ' ' indent
          tags := st.tagStack
        }
        column := indent }
  currColumn := return (← get).column
  startTag tag :=
    modify fun st => { st with tagStack := st.tagStack.push tag }
  endTags count :=
    modify fun st => { st with tagStack := popTags st.tagStack count }

/-- Bounded layout with a caller-supplied policy, also used for small-budget tests. -/
public def formatSegmentsWithLimits (lim : Limits) (f : Std.Format)
    (width : Nat) (indent : Nat := 0) : Except FormatError (Array Segment) := do
  if width > lim.maxColumns then throw .width
  if indent > lim.maxIndent then throw .indentation
  checkInput lim lim.maxNodes [(f, 1, Int.ofNat indent)] 0 0
  let act : PrettyM Unit := Std.Format.prettyM f width indent
  return (← (act.run lim).run {}).2.segments

/-- Render with the fixed Slides policy, preserving Lean layout and active tags. -/
public def formatSegments (f : Std.Format) (width : Nat) (indent : Nat := 0) :
    Except FormatError (Array Segment) :=
  formatSegmentsWithLimits limits f width indent

end VersoSlides.Pretty
