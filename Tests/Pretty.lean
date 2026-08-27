/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Pretty

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

def main : IO UInt32 := do
  let ((), state) ← tests.run {}
  state.report
where
  tests : TestM Unit := do
    testEq "wide group" (formatPlain groupedLineDoc 80) "hello world"
    testEq "narrow group" (formatPlain groupedLineDoc 8) "hello\nworld"
    testEq "hard newline" (formatPlain hardLineDoc 80) "αβ\nγ"
    testEq "nested align" (formatPlain nestedDoc 5) ". a\n  b"
    testEq "fill paragraph" (formatPlain paragraphDoc 16)
      "lean ir runs\nformat.pretty\ninside wasm"
    testEq "tagged segment" (formatSegments taggedDoc 80)
      #[{ text := "hello", tags := #[7] }]
    testEq "nested tag stack" (formatSegments nestedTaggedDoc 80)
      #[
        { text := "outer", tags := #[7] },
        { text := "inner", tags := #[7, 8] },
        { text := "tail", tags := #[7] }
      ]

end Tests.Pretty

def main : IO UInt32 :=
  Tests.Pretty.main
