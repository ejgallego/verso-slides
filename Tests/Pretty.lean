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

private def taggedUnicodeLineDoc : Format :=
  Format.tag 7 ("α" ++ Format.line ++ "β")

private def nestedTaggedDoc : Format :=
  Format.tag 7 ("outer" ++ Format.tag 8 "inner" ++ "tail")

private def annotations : Array TaggedAnnotation :=
  #[
    { tag := 7, annotation := { cssClass := "outer", binding := some "decl" } },
    { tag := 8, annotation := { cssClass := "inner", binding := none } }
  ]

private def unsortedAnnotations : Array TaggedAnnotation :=
  #[
    { tag := 8, annotation := { cssClass := "inner", binding := none } },
    { tag := 7, annotation := { cssClass := "outer", binding := some "decl" } }
  ]

private def duplicateAnnotations : Array TaggedAnnotation :=
  #[
    { tag := 7, annotation := { cssClass := "old", binding := none } },
    { tag := 7, annotation := { cssClass := "outer", binding := some "decl" } },
    { tag := 8, annotation := { cssClass := "inner", binding := none } }
  ]

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
    testEq "flat rendered output"
      (formatRendered taggedDoc 80)
      { text := "hello"
        events := #[
          { offset := 0, kind := 0, value := 7 },
          { offset := 5, kind := 1, value := 1 }
        ] }
    testEq "flat rendered UTF-8 offsets and unstyled newline"
      (formatRenderedForVir taggedUnicodeLineDoc 80 0)
      { text := "α\nβ"
        events := #[
          { offset := 0, kind := 0, value := 7 },
          { offset := 2, kind := 2, value := 0 },
          { offset := 5, kind := 1, value := 1 }
        ] }
    testEq "render plan resolves innermost annotation"
      (formatRenderPlan nestedTaggedDoc annotations 80)
      { annotations := #[
          { cssClass := "outer", binding := some "decl" },
          { cssClass := "inner", binding := none }
        ]
        nodes := #[
          { text := "outer", annotationSlot := 1 },
          { text := "inner", annotationSlot := 2 },
          { text := "tail", annotationSlot := 1 }
        ] }
    testEq "render plan preserves unsorted annotation lookup"
      (formatRenderPlan nestedTaggedDoc unsortedAnnotations 80).nodes
      #[
        { text := "outer", annotationSlot := 2 },
        { text := "inner", annotationSlot := 1 },
        { text := "tail", annotationSlot := 2 }
      ]
    testEq "sorted duplicate annotations keep the last entry"
      (formatRenderPlan nestedTaggedDoc duplicateAnnotations 80).nodes
      #[
        { text := "outer", annotationSlot := 2 },
        { text := "inner", annotationSlot := 3 },
        { text := "tail", annotationSlot := 2 }
      ]
    testEq "render plan keeps pretty newlines unstyled"
      (formatRenderPlanForVir taggedUnicodeLineDoc annotations 80 0)
      { annotations := #[
          { cssClass := "outer", binding := some "decl" },
          { cssClass := "inner", binding := none }
        ]
        nodes := #[
          { text := "α", annotationSlot := 1 },
          { text := "\n", annotationSlot := 0 },
          { text := "β", annotationSlot := 1 }
        ] }
    testEq "resident render plan lookup"
      (formatRenderPlanAt #[groupedLineDoc, taggedDoc] #[#[], annotations] 1 80 0)
      { found := true
        renderPlan := {
          annotations := #[
            { cssClass := "outer", binding := some "decl" },
            { cssClass := "inner", binding := none }
          ]
          nodes := #[{ text := "hello", annotationSlot := 1 }]
        } }
    testEq "resident render plan rejects misaligned ID"
      (formatRenderPlanAt #[taggedDoc] #[] 0 80 0).found
      false
    testEq "resident format lookup"
      (formatRenderedAt #[groupedLineDoc, taggedDoc] 1 80 0)
      { found := true
        rendered := {
          text := "hello"
          events := #[
            { offset := 0, kind := 0, value := 7 },
            { offset := 5, kind := 1, value := 1 }
          ]
        } }
    testEq "resident format lookup rejects invalid ID"
      (formatRenderedAt #[groupedLineDoc] 4 80 0).found
      false
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

end Tests.Pretty

def main : IO UInt32 :=
  Tests.Pretty.main
