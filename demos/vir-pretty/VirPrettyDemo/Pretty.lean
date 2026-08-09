/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import Lean

namespace VersoSlides.Pretty

open Lean
open Std

/-!
Prototype helpers for rendering the compact `Std.Format` JSON used by the
browser through Lean's own pretty-printer.

The browser still owns HTML construction and DOM measurement. In timing terms,
the definitions here cover backend execution: `Std.Format.prettyM` plus the
backend-owned output collector. The segment and flat-event surfaces leave
annotation lookup to the browser; the render-plan surface resolves annotations
in Lean and leaves only escaping and HTML materialization to the browser.

The exported `ForRuntime` entrypoints are deliberately compiler-neutral. VIR,
FIR, or another bounded Lean runtime can compile the same surface. Historical
`ForVir` names remain as compatibility aliases.

The newer `Rendered` surface keeps the same semantics in a flatter ABI: text is
returned once and tag/newline changes are recorded at UTF-8 byte offsets. This
avoids copying the active tag stack into every output segment while leaving DOM
construction and annotation lookup in the browser.
-/

/-- A rendered piece of text and the active `Std.Format.tag` IDs for it. -/
public structure Segment where
  text : String
  tags : Array Nat
deriving Repr, BEq, Inhabited, ToJson, FromJson

/--
A change in the styling stream returned by `formatRendered`.

`kind` is deliberately numeric so VIR can lower this as a flat structure:
* `0` starts the tag in `value`;
* `1` ends `value` tags;
* `2` emits an unstyled newline followed by `value` spaces.

`offset` is a UTF-8 byte offset into `Rendered.text`.
-/
public structure StyleEvent where
  offset : Nat
  kind : Nat
  value : Nat
deriving Repr, BEq, Inhabited, ToJson, FromJson

/-- Flat, DOM-independent result of running Lean's `Std.Format.prettyM`. -/
public structure Rendered where
  text : String
  events : Array StyleEvent
deriving Repr, BEq, Inhabited, ToJson, FromJson

/-- Browser styling metadata associated with a `Std.Format.tag` ID. -/
public structure TokenAnnotation where
  cssClass : String
  binding : Option String
deriving Repr, BEq, Inhabited, ToJson, FromJson

/-- One sparse tag-to-annotation entry. Tag IDs need not be dense. -/
public structure TaggedAnnotation where
  tag : Nat
  annotation : TokenAnnotation
deriving Repr, BEq, Inhabited, ToJson, FromJson

/--
A semantic text node ready for browser materialization.

`annotationSlot` already identifies the innermost active annotation. This is
intentionally a flat render plan rather than a browser-specific HTML or DOM
representation: the current panel output consists only of sibling text and
span nodes.
-/
public structure RenderNode where
  text : String
  /-- `0` is unstyled; `n + 1` selects `RenderPlan.annotations[n]`. -/
  annotationSlot : Nat
deriving Repr, BEq, Inhabited, ToJson, FromJson

/-- A compact semantic sibling-node plan with interned annotation metadata. -/
public structure RenderPlan where
  annotations : Array TokenAnnotation
  nodes : Array RenderNode
deriving Repr, BEq, Inhabited, ToJson, FromJson

/-- Result envelope for a resident semantic-render lookup. -/
public structure ResidentRenderPlan where
  found : Bool
  renderPlan : RenderPlan
deriving Repr, BEq, Inhabited, ToJson, FromJson

/-- Result envelope for a resident-format lookup across the VIR boundary. -/
public structure ResidentRendered where
  found : Bool
  rendered : Rendered
deriving Repr, BEq, Inhabited, ToJson, FromJson

private structure PrettyState where
  segments : Array Segment := #[]
  column : Nat := 0
  tagStack : Array Nat := #[]
deriving Inhabited

private abbrev PrettyM := StateM PrettyState

private structure RenderedState where
  chunks : Array String := #[]
  byteOffset : Nat := 0
  column : Nat := 0
  events : Array StyleEvent := #[]
deriving Inhabited

private abbrev RenderedM := StateM RenderedState

private structure RenderPlanState where
  nodes : Array RenderNode := #[]
  column : Nat := 0
  tagStack : Array Nat := #[]
  annotations : Array TaggedAnnotation := #[]
deriving Inhabited

private abbrev RenderPlanM := StateM RenderPlanState

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

private instance : Std.Format.MonadPrettyFormat RenderedM where
  pushOutput s :=
    if s.isEmpty then
      pure ()
    else
      modify fun st =>
        { st with
          chunks := st.chunks.push s
          byteOffset := st.byteOffset + s.utf8ByteSize
          column := st.column + String.Internal.length s }
  pushNewline indent :=
    modify fun st =>
      { st with
        chunks := st.chunks.push (String.Internal.pushn "\n" ' ' indent)
        byteOffset := st.byteOffset + indent + 1
        column := indent
        events := st.events.push { offset := st.byteOffset, kind := 2, value := indent } }
  currColumn := return (← get).column
  startTag tag :=
    modify fun st =>
      { st with
        events := st.events.push { offset := st.byteOffset, kind := 0, value := tag } }
  endTags count :=
    if count == 0 then
      pure ()
    else
      modify fun st =>
        { st with
          events := st.events.push { offset := st.byteOffset, kind := 1, value := count } }

private def annotationSlotFor
    (annotations : Array TaggedAnnotation) (tag : Nat) : Nat :=
  let rec visit : Nat → Nat
    | 0 => 0
    | index + 1 =>
      let entry := annotations[index]!
      if entry.tag == tag then index + 1 else visit index
  visit annotations.size

private def innermostAnnotationSlot
    (annotations : Array TaggedAnnotation) (tags : Array Nat) : Nat :=
  let rec visit : Nat → Nat
    | 0 => 0
    | index + 1 =>
      let slot := annotationSlotFor annotations tags[index]!
      if slot == 0 then visit index else slot
  visit tags.size

private instance : Std.Format.MonadPrettyFormat RenderPlanM where
  pushOutput s :=
    if s.isEmpty then
      pure ()
    else
      modify fun st =>
        { st with
          nodes := st.nodes.push {
            text := s
            annotationSlot := innermostAnnotationSlot st.annotations st.tagStack
          }
          column := st.column + String.Internal.length s }
  pushNewline indent :=
    modify fun st =>
      { st with
        nodes := st.nodes.push {
          text := String.Internal.pushn "\n" ' ' indent
          annotationSlot := 0
        }
        column := indent }
  currColumn := return (← get).column
  startTag tag :=
    modify fun st => { st with tagStack := st.tagStack.push tag }
  endTags count :=
    modify fun st => { st with tagStack := popTags st.tagStack count }

/-- Render a `Std.Format` into text segments, preserving active tag IDs. -/
public def formatSegments (f : Std.Format) (width : Nat) (indent : Nat := 0)
    (column : Nat := 0) :
    Array Segment :=
  let act : PrettyM Unit := Std.Format.prettyM f width indent
  (act.run { column }).2.segments

/-- Runtime-neutral segment entrypoint with no optional parameters. -/
public def formatSegmentsForRuntime (f : Std.Format) (width indent column : Nat) :
    Array Segment :=
  formatSegments f width indent column

/-- Compatibility alias for existing VIR packages. -/
public def formatSegmentsForVir (f : Std.Format) (width indent : Nat) :
    Array Segment :=
  formatSegmentsForRuntime f width indent 0

/--
Render a `Std.Format` once into text plus a flat styling event stream.

Unlike `formatSegments`, this representation does not duplicate text and does
not copy the active tag stack for each emitted chunk.
-/
public def formatRendered (f : Std.Format) (width : Nat) (indent : Nat := 0)
    (column : Nat := 0) : Rendered :=
  let act : RenderedM Unit := Std.Format.prettyM f width indent
  let st := (act.run { column }).2
  { text := String.join st.chunks.toList, events := st.events }

/--
Runtime-neutral flat-output entrypoint with no optional parameters.

Its execution envelope includes `prettyM`, text collection, UTF-8 byte-offset
tracking, styling-event construction, and the final text join. It intentionally
does not include browser annotation lookup or HTML generation.
-/
public def formatRenderedForRuntime (f : Std.Format) (width indent column : Nat) : Rendered :=
  formatRendered f width indent column

/-- Compatibility alias for existing VIR packages. -/
public def formatRenderedForVir (f : Std.Format) (width indent : Nat) : Rendered :=
  formatRenderedForRuntime f width indent 0

/--
Run `Std.Format.prettyM` and resolve active tag IDs to semantic render nodes.

The sparse annotation array need not use dense tag IDs. The result is
independent of HTML and the DOM, but unlike `Rendered` it needs no tag-stack
reconstruction or annotation lookup in JavaScript.
-/
public def formatRenderPlan (f : Std.Format)
    (annotations : Array TaggedAnnotation) (width : Nat) (indent : Nat := 0)
    (column : Nat := 0) : RenderPlan :=
  let act : RenderPlanM Unit := Std.Format.prettyM f width indent
  let nodes := (act.run { column, annotations }).2.nodes
  { annotations := annotations.map (·.annotation), nodes }

/-- Runtime-neutral semantic-render entrypoint with no optional parameters. -/
public def formatRenderPlanForRuntime (f : Std.Format)
    (annotations : Array TaggedAnnotation) (width indent column : Nat) : RenderPlan :=
  formatRenderPlan f annotations width indent column

/-- Compatibility entrypoint for the VIR demo package. -/
public def formatRenderPlanForVir (f : Std.Format)
    (annotations : Array TaggedAnnotation) (width indent : Nat) : RenderPlan :=
  formatRenderPlanForRuntime f annotations width indent 0

/-- Render one format and its annotations from aligned package-resident tables. -/
public def formatRenderPlanAt (formats : Array Std.Format)
    (annotations : Array (Array TaggedAnnotation)) (id width indent : Nat) :
    ResidentRenderPlan :=
  match formats[id]?, annotations[id]? with
  | some f, some table => {
      found := true
      renderPlan := formatRenderPlan f table width indent
    }
  | _, _ => { found := false, renderPlan := default }

/--
Render one format from a package-resident table. A deck-specific generated
module closes this helper over its static table, so browser calls transfer only
the format ID and layout parameters.
-/
public def formatRenderedAt (formats : Array Std.Format) (id width indent : Nat) :
    ResidentRendered :=
  match formats[id]? with
  | some f => { found := true, rendered := formatRendered f width indent }
  | none => { found := false, rendered := default }

/-- Render a `Std.Format` to plain text. Useful for tests and comparison. -/
public def formatPlain (f : Std.Format) (width : Nat) (indent : Nat := 0) : String :=
  String.join <| (formatSegments f width indent).toList.map (·.text)

private def throwAt (ctx : String) (msg : String) : Except String α :=
  throw s!"{ctx}: {msg}"

private def getAt (ctx : String) (xs : Array Json) (i : Nat) : Except String Json :=
  if h : i < xs.size then
    return xs[i]
  else
    throwAt ctx s!"missing array element {i}"

private def expectSize (ctx : String) (xs : Array Json) (size : Nat) : Except String Unit :=
  unless xs.size == size do
    throwAt ctx s!"expected array of size {size}, got {xs.size}"

private def getNatAt (ctx : String) (xs : Array Json) (i : Nat) : Except String Nat := do
  try
    (← getAt ctx xs i).getNat?
  catch err =>
    throwAt ctx s!"element {i}: {err}"

private def getBoolAt (ctx : String) (xs : Array Json) (i : Nat) : Except String Bool := do
  try
    (← getAt ctx xs i).getBool?
  catch err =>
    throwAt ctx s!"element {i}: {err}"

private def nestIndent (n : Nat) : Int :=
  Int.ofNat n

/--
Decode the compact format JSON emitted for the browser into `Std.Format`.

The accepted encoding matches `web-lib/panel/pretty.js`:
* `null`: `Format.nil`
* string: `Format.text`
* `1`: `Format.line`
* `[2, force]`: `Format.align force`
* `[3, indent, f]`: `Format.nest indent f`
* `[4, f₁, f₂]`: append
* `[5, f]`: all-or-none group
* `[6, f]`: fill group
* `[7, tag, f]`: tagged region
-/
public partial def formatOfJson (json : Json) : Except String Std.Format := do
  match json with
  | .null => return Std.Format.nil
  | .str s => return Std.Format.text s
  | .num _ =>
    let n ← json.getNat?
    if n == 1 then
      return Std.Format.line
    else
      throwAt "format" s!"unknown numeric node tag {n}"
  | .arr xs =>
    let tag ← getNatAt "format array" xs 0
    match tag with
    | 2 =>
      expectSize "align" xs 2
      return Std.Format.align (← getBoolAt "align" xs 1)
    | 3 =>
      expectSize "nest" xs 3
      let indent ← getNatAt "nest" xs 1
      return Std.Format.nest (nestIndent indent) (← formatOfJson (← getAt "nest" xs 2))
    | 4 =>
      expectSize "append" xs 3
      return (← formatOfJson (← getAt "append" xs 1)) ++
        (← formatOfJson (← getAt "append" xs 2))
    | 5 =>
      expectSize "group" xs 2
      return Std.Format.group (← formatOfJson (← getAt "group" xs 1))
    | 6 =>
      expectSize "fill" xs 2
      return Std.Format.fill (← formatOfJson (← getAt "fill" xs 1))
    | 7 =>
      expectSize "tag" xs 3
      let tagId ← getNatAt "tag" xs 1
      return Std.Format.tag tagId (← formatOfJson (← getAt "tag" xs 2))
    | _ =>
      throwAt "format array" s!"unknown node tag {tag}"
  | .bool _ => throwAt "format" "unexpected boolean node"
  | .obj _ => throwAt "format" "unexpected object node"

/-- Parse and decode the compact format JSON emitted for the browser. -/
public def formatOfJsonString (s : String) : Except String Std.Format := do
  formatOfJson (← Json.parse s)

/-- Parse compact format JSON and render it into annotated text segments. -/
public def formatJsonSegments (s : String) (width : Nat) (indent : Nat := 0) :
    Except String (Array Segment) := do
  return formatSegments (← formatOfJsonString s) width indent

/--
Parse compact format JSON and render it into a JSON result string.

This is intended as the first VIR/JavaScript boundary:
`{"ok":true,"segments":[...]}` on success and `{"ok":false,"error":"..."}`
on failure.
-/
public def formatJsonSegmentsJson (s : String) (width : Nat) (indent : Nat := 0) :
    String :=
  let result : Json :=
    match formatJsonSegments s width indent with
    | .ok segments =>
      Json.mkObj [("ok", true), ("segments", toJson segments)]
    | .error err =>
      Json.mkObj [("ok", false), ("error", err)]
  Json.compress result

/-- VIR entrypoint wrapper with no optional parameters. -/
public def formatJsonSegmentsJsonForVir (s : String) (width : Nat) (indent : Nat) : String :=
  formatJsonSegmentsJson s width indent

/-- Parse compact format JSON and render it to plain text. -/
public def formatJsonPlain (s : String) (width : Nat) (indent : Nat := 0) :
    Except String String := do
  return formatPlain (← formatOfJsonString s) width indent

end VersoSlides.Pretty
