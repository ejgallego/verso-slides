/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

public import Lean
meta import Vir.Attributes

/-!
The embedded-resource client program. Its width is explicitly measured in Lean
`Std.Format` columns. The Slides panel converts measured CSS pixels to columns
in its browser adapter; the pixel formatter remains selectable for comparison.
-/

namespace VersoSlides.VirPrettyM

open Lean

public def maxInputBytes : Nat := 1024 * 1024
public def maxOutputBytes : Nat := 1024 * 1024
public def maxNodes : Nat := 10000
public def maxDepth : Nat := 128
public def maxColumns : Nat := 4096
public def maxSafeInteger : Nat := 9007199254740991
private def maxJsonDepth : Nat := maxDepth + 2
private def maxNumberDigits : Nat := 16

public structure Segment where
  text : String
  tags : Array Nat
deriving BEq, Inhabited, Repr, ToJson

private structure ProtocolError where
  code : String
  message : String

private def fail (code message : String) : Except ProtocolError α :=
  .error { code, message }

private def safeInteger (value : Json) (field : String) (signed : Bool)
    (limit : Nat := maxSafeInteger) : Except ProtocolError Int := do
  match value with
  | .num number =>
    if number.exponent != 0 then
      fail "INVALID_FORMAT" s!"{field} must be an integer JSON number"
    else if !signed && number.mantissa < 0 then
      fail "INVALID_FORMAT" s!"{field} must be nonnegative"
    else if number.mantissa.natAbs > limit then
      fail "LIMIT_EXCEEDED" s!"{field} exceeds its supported integer range"
    else
      return number.mantissa
  | _ => fail "INVALID_FORMAT" s!"{field} must be an integer JSON number"

private def arrayField (xs : Array Json) (index : Nat) : Except ProtocolError Json :=
  match xs[index]? with
  | some value => .ok value
  | none => fail "INVALID_FORMAT" s!"missing format element {index}"

private def exactArity (xs : Array Json) (expected : Nat) : Except ProtocolError Unit :=
  if xs.size == expected then .ok ()
  else fail "INVALID_FORMAT" s!"format opcode expects {expected} elements, got {xs.size}"

private def boundedIndent (n : Int) : Except ProtocolError Unit :=
  if n.natAbs ≤ maxColumns then .ok ()
  else fail "LIMIT_EXCEEDED" s!"effective indentation exceeds {maxColumns} columns"

private partial def formatOfJson (value : Json) (depth count : Nat) (indent : Int) :
    Except ProtocolError (Std.Format × Nat) := do
  if depth > maxDepth then
    fail "LIMIT_EXCEEDED" s!"format nesting exceeds {maxDepth}"
  else if count >= maxNodes then
    fail "LIMIT_EXCEEDED" s!"format node count exceeds {maxNodes}"
  else
    let count := count + 1
    match value with
    | .null => return (.nil, count)
    | .str s => return (.text s, count)
    | .num number =>
      if number.exponent == 0 && number.mantissa == 1 then
        return (.line, count)
      else
        fail "INVALID_FORMAT" "the only numeric format node is 1 (line)"
    | .arr xs =>
      let opcode ← safeInteger (← arrayField xs 0) "format opcode" false
      match opcode with
      | 2 =>
        exactArity xs 2
        match ← arrayField xs 1 with
        | .bool force => return (.align force, count)
        | _ => fail "INVALID_FORMAT" "align requires a boolean"
      | 3 =>
        exactArity xs 3
        let delta ← safeInteger (← arrayField xs 1) "nest indentation" true maxColumns
        boundedIndent (indent + delta)
        let (child, count) ← formatOfJson (← arrayField xs 2) (depth + 1) count (indent + delta)
        return (.nest delta child, count)
      | 4 =>
        exactArity xs 3
        let (left, count) ← formatOfJson (← arrayField xs 1) (depth + 1) count indent
        let (right, count) ← formatOfJson (← arrayField xs 2) (depth + 1) count indent
        return (.append left right, count)
      | 5 =>
        exactArity xs 2
        let (child, count) ← formatOfJson (← arrayField xs 1) (depth + 1) count indent
        return (.group child, count)
      | 6 =>
        exactArity xs 2
        let (child, count) ← formatOfJson (← arrayField xs 1) (depth + 1) count indent
        return (Std.Format.fill child, count)
      | 7 =>
        exactArity xs 3
        let tag ← safeInteger (← arrayField xs 1) "tag" false
        let (child, count) ← formatOfJson (← arrayField xs 2) (depth + 1) count indent
        return (.tag tag.toNat child, count)
      | _ => fail "INVALID_FORMAT" s!"unknown format opcode {opcode}"
    | _ => fail "INVALID_FORMAT" "format node must be null, text, line, or a tuple"

private def requiredField (request : Json) (name : String) : Except ProtocolError Json :=
  match request.getObjVal? name with
  | .ok value => .ok value
  | .error _ => fail "INVALID_REQUEST" s!"missing field {name}"

/-- Bound the general parser's recursion and number work before calling it.
Exponent notation is outside this protocol, even when its value is small. -/
private def preflightJson (input : String) : Except ProtocolError Unit := do
  let mut depth := 0
  let mut quoted := false
  let mut escaped := false
  let mut digits := 0
  let mut lastWasDigit := false
  for char in input.toList do
    let byte := char.toNat
    if quoted then
      if escaped then escaped := false
      else if byte == 92 then escaped := true
      else if byte == 34 then quoted := false
    else if byte == 34 then
      quoted := true
      digits := 0
      lastWasDigit := false
    else if byte == 91 || byte == 123 then
      depth := depth + 1
      if depth > maxJsonDepth then
        fail "LIMIT_EXCEEDED" s!"JSON nesting exceeds {maxJsonDepth}"
      digits := 0
      lastWasDigit := false
    else if byte == 93 || byte == 125 then
      if depth == 0 then fail "INVALID_JSON" "unmatched JSON closing bracket"
      depth := depth - 1
      digits := 0
      lastWasDigit := false
    else if 48 ≤ byte && byte ≤ 57 then
      digits := digits + 1
      if digits > maxNumberDigits then
        fail "LIMIT_EXCEEDED" s!"JSON number digit run exceeds {maxNumberDigits}"
      lastWasDigit := true
    else if lastWasDigit && (byte == 101 || byte == 69) then
      fail "INVALID_FORMAT" "exponent notation is unsupported"
    else
      digits := 0
      lastWasDigit := false
  -- Json.parse owns the rest of syntax validation, including unterminated strings.
  return ()

private def parseRequest (input : String) : Except ProtocolError (Std.Format × Nat × Nat) := do
  if input.utf8ByteSize > maxInputBytes then
    fail "LIMIT_EXCEEDED" s!"request exceeds {maxInputBytes} UTF-8 bytes"
  preflightJson input
  let request ← match Json.parse input with
    | .ok value => .ok value
    | .error message => fail "INVALID_JSON" message
  let fields ← match request with
    | .obj fields => .ok fields
    | _ => fail "INVALID_REQUEST" "request must be a JSON object"
  if fields.size != 5 then
    fail "INVALID_REQUEST" "request must have exactly schemaVersion, widthUnit, width, indent, format"
  let version ← safeInteger (← requiredField request "schemaVersion") "schemaVersion" false
  if version != 1 then
    fail "INVALID_REQUEST" "unsupported schemaVersion"
  match ← requiredField request "widthUnit" with
  | .str "columns" => pure ()
  | _ => fail "INVALID_REQUEST" "widthUnit must be columns"
  let width ← safeInteger (← requiredField request "width") "width" false maxColumns
  let indent ← safeInteger (← requiredField request "indent") "indent" false maxColumns
  let (format, _) ← formatOfJson (← requiredField request "format") 0 0 indent
  return (format, width.toNat, indent.toNat)

private structure PrettyState where
  segments : Array Segment := #[]
  tags : Array Nat := #[]
  column : Nat := 0
  responseBytes : Nat := 0
  overflow : Bool := false
  underflow : Bool := false

private abbrev PrettyM := StateM PrettyState

private def successResponse (segments : Array Segment) : String :=
  (Json.mkObj [
    ("schemaVersion", toJson (1 : Nat)),
    ("ok", toJson true),
    ("widthUnit", toJson "columns"),
    ("segments", toJson segments)
  ]).compress

private def emptyResponseBytes : Nat := (successResponse #[]).utf8ByteSize

/-- Exact UTF-8 length added by JSON string escaping in Lean's JSON printer. -/
private def escapedTextBytes (value : String) : Nat := Id.run do
  let mut size := 0
  for char in value.toList do
    let scalar := char.toNat
    if scalar == 34 || scalar == 92 || scalar == 10 || scalar == 13 then
      size := size + 2
    else if scalar < 32 then size := size + 6
    else if scalar < 128 then size := size + 1
    else if scalar < 2048 then size := size + 2
    else if scalar < 65536 then size := size + 3
    else size := size + 4
  return size

private def newSegmentBytes (tags : Array Nat) (hasSegments : Bool) : Nat :=
  (if hasSegments then 1 else 0) +
    (toJson ({ text := "", tags } : Segment)).compress.utf8ByteSize

private def emit (value : String) : PrettyM Unit := do
  if value.isEmpty then return
  modify fun state => Id.run do
    if state.overflow then return state
    let column := state.column + String.Internal.length value
    let newSegment := state.segments.back?.isNone ||
      state.segments.back!.tags != state.tags
    let overhead := if newSegment then
      newSegmentBytes state.tags (!state.segments.isEmpty)
    else 0
    -- The cheap raw-byte check avoids scanning or serializing a huge value.
    if state.responseBytes + overhead + value.utf8ByteSize > maxOutputBytes then
      return { state with column, overflow := true }
    let bytes := state.responseBytes + overhead + escapedTextBytes value
    if bytes > maxOutputBytes then
      return { state with column, overflow := true }
    let segments :=
      match state.segments.back? with
      | some last =>
        if last.tags == state.tags then
          state.segments.pop.push { last with text := last.text ++ value }
        else
          state.segments.push { text := value, tags := state.tags }
      | none => state.segments.push { text := value, tags := state.tags }
    return { state with segments, responseBytes := bytes, column }

private instance : Std.Format.MonadPrettyFormat PrettyM where
  pushOutput value := emit value
  pushNewline indent := do
    emit (String.Internal.pushn "\n" ' ' indent)
    modify fun state => { state with column := indent }
  currColumn := return (← get).column
  startTag tag := modify fun state => { state with tags := state.tags.push tag }
  endTags count := modify fun state => Id.run do
    if count > state.tags.size then
      return { state with underflow := true }
    let mut tags := state.tags
    for _ in [:count] do
      tags := tags.pop
    return { state with tags }

public def formatSegments (format : Std.Format) (width indent : Nat) :
    Except String (Array Segment) := do
  let action : PrettyM Unit := Std.Format.prettyM format width indent
  let (_, state) := action.run { responseBytes := emptyResponseBytes }
  if state.underflow || !state.tags.isEmpty then
    .error "UNBALANCED_TAGS"
  else if state.overflow then
    .error "OUTPUT_TOO_LARGE"
  else
    .ok state.segments

private def responseError (error : ProtocolError) : String :=
  (Json.mkObj [
    ("schemaVersion", toJson (1 : Nat)),
    ("ok", toJson false),
    ("error", Json.mkObj [("code", toJson error.code), ("message", toJson error.message)])
  ]).compress

/-- Strict, column-based PrettyM entrypoint shared by native and browser clients. -/
@[vir_export]
public def prettyJson (requestJson : String) : String :=
  match parseRequest requestJson with
  | .error error => responseError error
  | .ok (format, width, indent) =>
    match formatSegments format width indent with
    | .error code => responseError { code, message := code }
    | .ok segments =>
      let response := successResponse segments
      if response.utf8ByteSize > maxOutputBytes then
        responseError { code := "OUTPUT_TOO_LARGE", message := "OUTPUT_TOO_LARGE" }
      else response

end VersoSlides.VirPrettyM
