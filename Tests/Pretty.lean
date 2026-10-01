/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

import VersoSlides.VirPrettyM

open Std
open VersoSlides.Pretty

namespace Tests.Pretty

private instance [BEq ε] [BEq α] : BEq (Except ε α) where
  beq a b := match a, b with
    | .ok a, .ok b => a == b
    | .error a, .error b => a == b
    | _, _ => false

private def groupedLineDoc : Format :=
  Format.group ("hello" ++ Format.line ++ "world")

private def hardLineDoc : Format :=
  "αβ" ++ Format.text "\n" ++ "γ"

private def nestedDoc : Format :=
  Format.nest 2 ("." ++ Format.align false ++ "a" ++ Format.line ++ "b")

private def paragraphDoc : Format :=
  Format.fill <|
    "lean" ++ Format.line ++
    "ir" ++ Format.line ++
    "runs" ++ Format.line ++
    "format.pretty" ++ Format.line ++
    "inside wasm"

private def taggedDoc : Format :=
  Format.tag 7 "hello"

private def nestedTaggedDoc : Format :=
  Format.tag 7 ("outer" ++ Format.tag 8 "inner" ++ "tail")

-- Test-only serialization of the existing formats. The oracle calls the exact
-- exported wrapper; the browser exercises the real compact-format converter.
private def compactFormat : Format → Lean.Json
  | .nil => .null
  | .text text => .str text
  | .line => Lean.toJson (1 : Nat)
  | .align force => .arr #[Lean.toJson (2 : Nat), Lean.toJson force]
  | .nest indent child => .arr #[Lean.toJson (3 : Nat), .str (toString indent), compactFormat child]
  | .append left right => .arr #[Lean.toJson (4 : Nat), compactFormat left, compactFormat right]
  | .group child behavior => .arr #[
      Lean.toJson (if behavior == .fill then (6 : Nat) else 5), compactFormat child]
  | .tag tag child => .arr #[Lean.toJson (7 : Nat), .str (toString tag), compactFormat child]

private def corpusCases : Array (String × Format × Nat) :=
  #[("wide group", groupedLineDoc, 80), ("narrow group", groupedLineDoc, 8),
     ("hard newline", hardLineDoc, 80), ("nested align", nestedDoc, 5),
     ("fill paragraph", paragraphDoc, 16), ("tagged segment", taggedDoc, 80),
     ("nested tag stack", nestedTaggedDoc, 80)]

private def segmentsJson (segments : Array Segment) : Lean.Json := .arr <| segments.map
  fun segment => Lean.Json.mkObj [
    ("text", .str segment.text),
    ("tags", .arr <| segment.tags.map fun tag => .str (toString tag))]

private def errorName (e : FormatError) : String :=
  (reprStr e).splitOn "." |>.getLast!

private def resultJson : Except FormatError (Array Segment) → Lean.Json
  | .ok segments => Lean.Json.mkObj [("segments", segmentsJson segments)]
  | .error e => Lean.Json.mkObj [("error", .str (errorName e))]

private def nativeCorpus : Lean.Json := .arr <| corpusCases.map
    fun (name, format, width) => Lean.Json.mkObj [
      ("name", .str name), ("format", compactFormat format),
      ("width", Lean.toJson width), ("indent", Lean.toJson (0 : Nat)),
      ("result", resultJson <| VersoSlides.VirPrettyM.formatSegments format width 0)]

-- Test-only width sweep for measured browser layouts. Production exports are unchanged.
private def geometryCorpus : Lean.Json := .arr <| (List.range 128).toArray.flatMap fun n =>
  let formats : Array (String × Format) := #[
    ("group", groupedLineDoc), ("fill", paragraphDoc),
    ("Greek tags", .group <| .tag 7 "αβ" ++ .line ++ .tag 8 "γδ" ++ .line ++ "λx"),
    ("supplementary hard lines", .tag 7 <| .text "😀\n界")]
  formats.map fun (name, format) => Lean.Json.mkObj [
    ("name", .str name), ("format", compactFormat format),
    ("width", Lean.toJson (n + 1)), ("indent", Lean.toJson (0 : Nat)),
    ("result", resultJson <| VersoSlides.VirPrettyM.formatSegments format (n + 1) 0)]

private def oraclePlain (format : Format) (width : Nat) : Except FormatError String := do
  return String.join <| (← VersoSlides.VirPrettyM.formatSegments format width 0).toList.map (·.text)

private structure BoundCase where
  name : String
  format : Format
  limits : Limits := VersoSlides.Pretty.limits
  width : Nat := 4
  indent : Nat := 0
  error : Option FormatError := none

private def repeated (n : Nat) (c : Char) : String := String.ofList (List.replicate n c)

-- Balanced trees isolate node budgets from the depth budget.
private def copies (n : Nat) (f : Format) : Format := Id.run do
  let mut level := Array.replicate n f
  while level.size > 1 do
    let mut next := #[]
    for i in [0:(level.size + 1) / 2] do
      let left := level[2 * i]!
      next := next.push <| if 2 * i + 1 < level.size then left ++ level[2 * i + 1]! else left
    level := next
  return level[0]?.getD .nil

private def groups (n : Nat) (f : Format) : Format :=
  n.fold (fun _ _ f => .group f) f

private def tags (n : Nat) (f : Format) : Format :=
  n.fold (fun i _ f => .tag i f) f

private def smallBounds : Array BoundCase := #[
  { name := "nodes equal", format := "a" ++ "b", limits := { limits with maxNodes := 3 } },
  { name := "nodes over", format := .group ("a" ++ "b"), limits := { limits with maxNodes := 3 }, error := some .inputNodes },
  { name := "depth equal", format := groups 1 "a", limits := { limits with maxDepth := 2 } },
  { name := "depth over", format := groups 2 "a", limits := { limits with maxDepth := 2 }, error := some .inputDepth },
  { name := "input UTF8 equal", format := "é" ++ "é", limits := { limits with maxInputBytes := 4 } },
  { name := "input UTF8 over", format := "é" ++ "é" ++ "a", limits := { limits with maxInputBytes := 4 }, error := some .inputBytes },
  { name := "text UTF8 equal", format := "😀", limits := { limits with maxTextBytes := 4 } },
  { name := "text UTF8 over", format := "😀a", limits := { limits with maxTextBytes := 4 }, error := some .textBytes },
  { name := "hard lines equal", format := "\n\n", limits := { limits with maxHardLines := 2 } },
  { name := "hard lines over", format := "\n\n\n", limits := { limits with maxHardLines := 2 }, error := some .hardLines },
  { name := "width equal", format := "a", limits := { limits with maxColumns := 4 } },
  { name := "width over", format := "a", width := 5, limits := { limits with maxColumns := 4 }, error := some .width },
  { name := "initial indent equal", format := .line, indent := 4, limits := { limits with maxIndent := 4 } },
  { name := "initial indent over", format := .line, indent := 5, limits := { limits with maxIndent := 4 }, error := some .indentation },
  { name := "cumulative indent equal", format := .nest 2 (.nest 2 .line), limits := { limits with maxIndent := 4 } },
  { name := "cumulative indent over", format := .nest 2 (.nest 3 .line), limits := { limits with maxIndent := 4 }, error := some .indentation },
  { name := "negative indent equal", format := .nest (-4) .line, limits := { limits with maxIndent := 4 } },
  { name := "negative indent over", format := .nest (-5) .line, limits := { limits with maxIndent := 4 }, error := some .indentation },
  { name := "signed cancellation equal", format := .nest (-4) (.nest 8 (.align true)), limits := { limits with maxIndent := 4 } },
  { name := "signed cancellation over", format := .nest (-4) (.nest 9 (.align true)), limits := { limits with maxIndent := 4 }, error := some .indentation },
  { name := "tag value equal", format := .tag 7 "a", limits := { limits with maxTag := 7 } },
  { name := "tag value over", format := .tag 8 "a", limits := { limits with maxTag := 7 }, error := some .tagValue },
  { name := "output UTF8 equal", format := "é", limits := { limits with maxOutputBytes := 2 } },
  { name := "output UTF8 over", format := "éa", limits := { limits with maxOutputBytes := 2 }, error := some .outputBytes },
  { name := "output growth equal", format := "a" ++ "b", limits := { limits with maxOutputBytes := 2 } },
  { name := "output growth over", format := "a" ++ "bc", limits := { limits with maxOutputBytes := 2 }, error := some .outputBytes },
  { name := "newline allocation equal", format := .nest 3 .line, limits := { limits with maxOutputBytes := 4 } },
  { name := "newline allocation over", format := .nest 3 .line, limits := { limits with maxOutputBytes := 3 }, error := some .outputBytes },
  { name := "align allocation equal", format := .nest 4 (.align true), limits := { limits with maxOutputBytes := 4 } },
  { name := "align allocation over", format := .nest 4 (.align true), limits := { limits with maxOutputBytes := 3 }, error := some .outputBytes },
  { name := "segments equal", format := "a" ++ "b", limits := { limits with maxSegments := 2 } },
  { name := "segments over", format := "a" ++ "b" ++ "c", limits := { limits with maxSegments := 2 }, error := some .outputSegments },
  { name := "tag entries equal", format := .tag 1 "a" ++ .tag 1 (.tag 2 "b"), limits := { limits with maxTagEntries := 3 } },
  { name := "tag entries over", format := .tag 1 "a" ++ .tag 1 (.tag 2 "b") ++ .tag 3 "c", limits := { limits with maxTagEntries := 3 }, error := some .outputTags }
]

-- These call the exact exported wrapper with the production policy. The browser
-- replays the same formats; full successful segments are emitted only as evidence.
private def productionBounds : Array BoundCase := #[
  { name := "zero width", format := groupedLineDoc, width := 0 },
  { name := "width equal", format := "a", width := 4096 },
  { name := "width over", format := "a", width := 4097, error := some .width },
  { name := "indent equal", format := .line, indent := 4096 },
  { name := "indent over", format := .line, indent := 4097, error := some .indentation },
  { name := "nodes equal", format := .group (copies 5000 .nil) },
  { name := "nodes over", format := .group (.group (copies 5000 .nil)), error := some .inputNodes },
  { name := "depth equal", format := groups 127 "a" },
  { name := "depth over", format := groups 128 "a", error := some .inputDepth },
  { name := "input bytes equal", format := copies 4 (.text (repeated 16384 'a')) },
  { name := "input bytes over", format := copies 4 (.text (repeated 16384 'a')) ++ "a", error := some .inputBytes },
  { name := "text bytes equal", format := .text (repeated 4096 '😀') },
  { name := "text bytes over", format := .text (repeated 4096 '😀' ++ "a"), error := some .textBytes },
  { name := "hard lines equal", format := .text (repeated 4096 '\n') },
  { name := "hard lines over", format := .text (repeated 4097 '\n'), error := some .hardLines },
  { name := "cumulative indent equal", format := .nest 2048 (.nest 2048 (.align true)) },
  { name := "cumulative indent over", format := .nest 2048 (.nest 2049 (.align true)), error := some .indentation },
  { name := "negative indent equal", format := .nest (-4096) .line },
  { name := "negative indent over", format := .nest (-4097) .line, error := some .indentation },
  { name := "signed cancellation equal", format := .nest (-4096) (.nest 8192 (.align true)) },
  { name := "signed cancellation over", format := .nest (-4096) (.nest 8193 (.align true)), error := some .indentation },
  { name := "tag scalar equal", format := .tag 99999999999999999999 "a" },
  { name := "tag scalar over", format := .tag 100000000000000000000 "a", error := some .tagValue },
  { name := "output bytes equal", format := .nest 4095 (.text (repeated 256 '\n')) },
  { name := "output bytes over", format := .nest 4095 (.text (repeated 256 '\n')) ++ "a", error := some .outputBytes },
  { name := "output segments equal", format := copies 2000 "a\nb\nc" },
  { name := "output segments over", format := copies 2000 "a\nb\nc" ++ "a", error := some .outputSegments },
  { name := "output tags equal", format := tags 16 (copies 4096 "a") },
  { name := "output tags over", format := tags 16 (copies 4096 "a") ++ .tag 1 "a", error := some .outputTags }
]

private def boundsCorpus : Lean.Json := .arr <| productionBounds.map fun c => Lean.Json.mkObj [
  ("name", .str c.name), ("format", compactFormat c.format),
  ("width", Lean.toJson c.width), ("indent", Lean.toJson c.indent),
  ("result", resultJson <| VersoSlides.VirPrettyM.formatSegments c.format c.width c.indent)]

structure TestState where
  passed : Nat := 0
  failed : Nat := 0
  errors : Array String := #[]

def TestState.report (s : TestState) : IO UInt32 := do
  if s.errors.isEmpty then
    IO.println s!"All {s.passed} tests passed."
    return 0
  else
    for e in s.errors do
      IO.eprintln e
    IO.eprintln s!"\n{s.failed} of {s.passed + s.failed} tests FAILED."
    return 1

abbrev TestM := StateRefT TestState IO

private def testEq [BEq α] [Repr α] (name : String) (actual expected : α) : TestM Unit := do
  if actual == expected then
    modify fun s => { s with passed := s.passed + 1 }
  else
    modify fun s => { s with
      failed := s.failed + 1
      errors := s.errors.push
        s!"FAIL: {name}\n  expected: {reprStr expected}\n  actual:   {reprStr actual}" }

def main (args : List String) : IO UInt32 := do
  if args == ["--host-abi-corpus"] then
    IO.println nativeCorpus.compress
    return 0
  if args == ["--bounds-corpus"] then
    IO.println boundsCorpus.compress
    return 0
  if args == ["--geometry-corpus"] then
    IO.println geometryCorpus.compress
    return 0
  if !args.isEmpty then
    IO.eprintln "usage: test-pretty [--host-abi-corpus | --bounds-corpus | --geometry-corpus]"
    return 1
  let ((), state) ← tests.run {}
  state.report
where
  tests : TestM Unit := do
    testEq "wide group" (oraclePlain groupedLineDoc 80) (.ok "hello world")
    testEq "narrow group" (oraclePlain groupedLineDoc 8) (.ok "hello\nworld")
    testEq "hard newline" (oraclePlain hardLineDoc 80) (.ok "αβ\nγ")
    testEq "nested align" (oraclePlain nestedDoc 5) (.ok ". a\n  b")
    testEq "fill paragraph" (oraclePlain paragraphDoc 16)
      (.ok "lean ir runs\nformat.pretty\ninside wasm")
    testEq "tagged segment" (VersoSlides.VirPrettyM.formatSegments taggedDoc 80 0)
      (.ok #[{ text := "hello", tags := #[7] }])
    testEq "nested tag stack" (VersoSlides.VirPrettyM.formatSegments nestedTaggedDoc 80 0)
      (.ok #[
        { text := "outer", tags := #[7] },
        { text := "inner", tags := #[7, 8] },
        { text := "tail", tags := #[7] }
      ])
    for c in smallBounds do
      let expected : Except FormatError Unit := match c.error with
        | none => .ok () | some e => .error e
      testEq ("small " ++ c.name)
        ((formatSegmentsWithLimits c.limits c.format c.width c.indent).map fun _ => ()) expected
      if c.error.isSome then
        testEq ("small recovery " ++ c.name)
          (formatSegmentsWithLimits c.limits "v" 0 0) (.ok #[{ text := "v", tags := #[] }])
    for c in productionBounds do
      let expected : Except FormatError Unit := match c.error with
        | none => .ok () | some e => .error e
      testEq ("production " ++ c.name)
        ((VersoSlides.VirPrettyM.formatSegments c.format c.width c.indent).map fun _ => ()) expected
      if c.error.isSome then
        testEq ("production recovery " ++ c.name)
          (VersoSlides.VirPrettyM.formatSegments "v" 0 0) (.ok #[{ text := "v", tags := #[] }])

end Tests.Pretty

public def main (args : List String) : IO UInt32 :=
  Tests.Pretty.main args
