/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Animate.RevealPolicy

open Illuminate
open VersoSlides.RevealPolicy

namespace Tests.RevealPolicy

private def step (frame : Nat) (pause : Bool := false) (loop : Bool := false) : StepInfo :=
  { frame, pause, loop }

private def policy (autoplay : Bool := false) : Policy :=
  Policy.prepare 60 #[
    step 0 true,
    step 10,
    step 20 true,
    step 30 false true,
    step 40 true true,
    step 50 true
  ] autoplay

private def autoplayPolicy : Policy :=
  Policy.prepare 40 #[step 0, step 10 true, step 20] true

private def noPausePolicy (autoplay : Bool) : Policy :=
  Policy.prepare 12 #[step 0, step 6] autoplay

private def testEq [BEq α] [Repr α]
    (name : String)
    (actual expected : α) : StateT (Array String) IO Unit := do
  if actual != expected then
    modify (·.push s!"FAIL: {name}\n  expected: {reprStr expected}\n  actual:   {reprStr actual}")

def main : IO UInt32 := do
  let (_, errors) ← tests.run #[]
  if errors.isEmpty then
    IO.println "All 18 Reveal policy tests passed."
    return 0
  else
    for error in errors do
      IO.eprintln error
    IO.eprintln s!"\n{errors.size} Reveal policy test(s) FAILED."
    return 1
where
  tests : StateT (Array String) IO Unit := do
    testEq "pause projection"
      policy.pauseSteps
      #[step 0 true, step 20 true, step 40 true true, step 50 true]
    testEq "target stops before next pause"
      (policy.targetAfterPause? 0)
      (some 19)
    testEq "target includes following non-pause loop"
      (policy.targetAfterPause? 1)
      (some 39)
    testEq "last pause targets final frame"
      (policy.targetAfterPause? 3)
      (some 59)
    testEq "shown pause advances through following ordinary steps"
      (policy.plan (.fragmentShown 0))
      #[.playTo 19 false]
    testEq "shown pause enters a following non-pause loop"
      (policy.plan (.fragmentShown 1))
      #[.playTo 39 true]
    testEq "shown looping pause loops after arrival"
      (policy.plan (.fragmentShown 2))
      #[.playTo 40 true]
    testEq "shown final pause reaches final frame"
      (policy.plan (.fragmentShown 3))
      #[.playTo 59 false]
    testEq "first hidden pause returns to frame zero"
      (policy.plan (.fragmentHidden 0))
      #[.playTo 0 false]
    testEq "hidden pause returns through the preceding pause"
      (policy.plan (.fragmentHidden 1))
      #[.playTo 19 false]
    testEq "hidden pause restores a preceding loop"
      (policy.plan (.fragmentHidden 3))
      #[.loopAt 40]
    testEq "backward slide entry jumps to visible state"
      (policy.plan (.slideEntered 2))
      #[.seek 39]
    testEq "backward slide entry restores a visible loop"
      (policy.plan (.slideEntered 3))
      #[.loopAt 40]
    testEq "visible fragment count is clamped"
      (policy.plan (.slideEntered 99))
      #[.seek 59]
    testEq "ordinary slide entry resets without autoplay"
      (policy.plan (.slideEntered 0))
      #[.seek 0]
    testEq "autoplay resets then targets the first pause"
      (autoplayPolicy.plan (.slideEntered 0))
      #[.seek 0, .playTo 10 false]
    testEq "autoplay without pauses targets the final frame"
      ((noPausePolicy true).plan (.slideEntered 0))
      #[.seek 0, .playTo 11 false]
    testEq "leaving a slide pauses its player"
      (policy.plan .slideLeft)
      #[.pause]

end Tests.RevealPolicy

def main : IO UInt32 :=
  Tests.RevealPolicy.main
