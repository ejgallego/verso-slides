/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Pretty

open Lean
open Std
open VersoSlides.Pretty

namespace Tests.Pretty

private def groupedLineDoc : Format :=
  Format.group ("hello" ++ Format.line ++ "world")

private def hardLineDoc : Format :=
  "αβ" ++ Format.text "\n" ++ "γ"

private def nestedDoc : Format :=
  Format.nest 2 ("." ++ Format.align false ++ "a" ++ Format.line ++ "b")

private def listDoc : Format :=
  Format.group <|
    Format.nest 1 <|
      "[" ++ "alpha," ++ Format.line ++
      "beta," ++ Format.line ++
      "gamma" ++ "]"

private def paragraphDoc : Format :=
  Format.fill <|
    "lean" ++ Format.line ++
    "ir" ++ Format.line ++
    "runs" ++ Format.line ++
    "format.pretty" ++ Format.line ++
    "inside wasm"

private def taggedDoc : Format :=
  Format.tag 7 "hello"

private def groupedLineJson : String :=
  "[5,[4,\"hello\",[4,1,\"world\"]]]"

private def nestedJson : String :=
  "[3,2,[4,\".\",[4,[2,false],[4,\"a\",[4,1,\"b\"]]]]]"

private def taggedJson : String :=
  "[7,7,\"hello\"]"

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

private def fail (name : String) (expected actual : String) : TestM Unit :=
  modify fun s => { s with
    failed := s.failed + 1
    errors := s.errors.push
      s!"FAIL: {name}\n  expected: {expected}\n  actual:   {actual}"
  }

private def pass : TestM Unit :=
  modify fun s => { s with passed := s.passed + 1 }

private def testEq [BEq α] [Repr α] (name : String) (actual expected : α) : TestM Unit := do
  if actual == expected then
    pass
  else
    fail name (reprStr expected) (reprStr actual)

private def testExceptEq [BEq α] [Repr α]
    (name : String) (actual : Except String α) (expected : α) : TestM Unit := do
  match actual with
  | .ok value => testEq name value expected
  | .error err => fail name (reprStr expected) s!"error: {err}"

private def testJsonExceptEq
    (name : String) (actual : Except String Json) (expected : Json) : TestM Unit := do
  match actual with
  | .ok value =>
    if value == expected then
      pass
    else
      fail name (Json.compress expected) (Json.compress value)
  | .error err =>
    fail name (Json.compress expected) s!"error: {err}"

def main : IO UInt32 := do
  let ((), s) ← tests.run {}
  s.report
where
  tests : TestM Unit := do
    testEq "wide group"
      (formatPlain groupedLineDoc 80)
      "hello world"
    testEq "narrow group"
      (formatPlain groupedLineDoc 8)
      "hello\nworld"
    testEq "hard newline"
      (formatPlain hardLineDoc 80)
      "αβ\nγ"
    testEq "nested align"
      (formatPlain nestedDoc 5)
      ". a\n  b"
    testEq "list"
      (formatPlain listDoc 12)
      "[alpha,\n beta,\n gamma]"
    testEq "fill paragraph"
      (formatPlain paragraphDoc 16)
      "lean ir runs\nformat.pretty\ninside wasm"
    testEq "tagged segment"
      (formatSegments taggedDoc 80)
      #[{ text := "hello", tags := #[7] }]
    testEq "direct format VIR wrapper"
      (formatSegmentsForVir taggedDoc 80 0)
      #[{ text := "hello", tags := #[7] }]
    testExceptEq "json wide group"
      (formatJsonPlain groupedLineJson 80)
      "hello world"
    testExceptEq "json narrow group"
      (formatJsonPlain groupedLineJson 8)
      "hello\nworld"
    testExceptEq "json nested align"
      (formatJsonPlain nestedJson 5)
      ". a\n  b"
    testExceptEq "json tagged segment"
      (formatJsonSegments taggedJson 80)
      #[{ text := "hello", tags := #[7] }]
    testJsonExceptEq "json result wrapper"
      (Json.parse (formatJsonSegmentsJson taggedJson 80))
      (Json.mkObj [
        ("ok", true),
        ("segments", toJson (#[{ text := "hello", tags := #[7] }] : Array Segment))
      ])
    testJsonExceptEq "json result wrapper error"
      (Json.parse (formatJsonSegmentsJson "[9]" 80))
      (Json.mkObj [
        ("ok", false),
        ("error", "format array: unknown node tag 9")
      ])
    testJsonExceptEq "json result wrapper for VIR"
      (Json.parse (formatJsonSegmentsJsonForVir taggedJson 80 0))
      (Json.mkObj [
        ("ok", true),
        ("segments", toJson (#[{ text := "hello", tags := #[7] }] : Array Segment))
      ])
    testJsonExceptEq "json round trip for VIR"
      (Json.parse (jsonRoundTripJsonForVir "{\"z\":[1,true,null],\"a\":\"α\"}"))
      (Json.mkObj [
        ("ok", true),
        ("value", Json.mkObj [
          ("z", Json.arr #[1, true, Json.null]),
          ("a", "α")
        ])
      ])
    match Json.parse (jsonRoundTripJsonForVir "{") with
    | .ok errorWrapper =>
      match errorWrapper.getObjVal? "ok" with
      | .ok (.bool false) => pass
      | .ok actual => fail "json round trip error for VIR" "false" (Json.compress actual)
      | .error err => fail "json round trip error for VIR" "false" err
    | .error err => fail "json round trip error for VIR" "false" err

end Tests.Pretty

def main : IO UInt32 :=
  Tests.Pretty.main
