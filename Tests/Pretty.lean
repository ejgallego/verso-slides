/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

module

import VersoSlides.VirPrettyM

open Std
open VersoSlides.Pretty

namespace Tests.Pretty

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
  #[("empty", .nil, 80), ("wide group", groupedLineDoc, 80), ("narrow group", groupedLineDoc, 8),
     ("hard newline", hardLineDoc, 80), ("nested align", nestedDoc, 5),
     ("fill paragraph", paragraphDoc, 16), ("tagged segment", taggedDoc, 80),
     ("nested tag stack", nestedTaggedDoc, 80)]

private def segmentsJson (segments : Array Segment) : Lean.Json := .arr <| segments.map
  fun segment => Lean.Json.mkObj [
    ("text", .str segment.text),
    ("tags", .arr <| segment.tags.map fun tag => .str (toString tag))]

private def resultJson (segments : Array Segment) : Lean.Json :=
  Lean.Json.mkObj [("segments", segmentsJson segments)]

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

private def oraclePlain (format : Format) (width : Nat) : String :=
  String.join <| (VersoSlides.VirPrettyM.formatSegments format width 0).toList.map (·.text)

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
  if args == ["--geometry-corpus"] then
    IO.println geometryCorpus.compress
    return 0
  if !args.isEmpty then
    IO.eprintln "usage: test-pretty [--host-abi-corpus | --geometry-corpus]"
    return 1
  let ((), state) ← tests.run {}
  state.report
where
  tests : TestM Unit := do
    testEq "empty array" (VersoSlides.VirPrettyM.formatSegments .nil 80 0) #[]
    testEq "wide group" (oraclePlain groupedLineDoc 80) "hello world"
    testEq "narrow group" (oraclePlain groupedLineDoc 8) "hello\nworld"
    testEq "hard newline" (oraclePlain hardLineDoc 80) "αβ\nγ"
    testEq "nested align" (oraclePlain nestedDoc 5) ". a\n  b"
    testEq "fill paragraph" (oraclePlain paragraphDoc 16)
      "lean ir runs\nformat.pretty\ninside wasm"
    testEq "tagged segment" (VersoSlides.VirPrettyM.formatSegments taggedDoc 80 0)
      #[{ text := "hello", tags := #[7] }]
    testEq "nested tag stack" (VersoSlides.VirPrettyM.formatSegments nestedTaggedDoc 80 0)
      #[
        { text := "outer", tags := #[7] },
        { text := "inner", tags := #[7, 8] },
        { text := "tail", tags := #[7] }
      ]

end Tests.Pretty

public def main (args : List String) : IO UInt32 :=
  Tests.Pretty.main args
