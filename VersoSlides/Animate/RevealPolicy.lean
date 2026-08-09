/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: Emilio J. Gallego Arias
-/
module
public import Illuminate.Animation.Types
public section

namespace VersoSlides
namespace RevealPolicy

/--
The timeline information needed to translate Reveal events into animation-player commands.

This deliberately excludes SVG, parameter tables, DOM nodes, and browser scheduling. It can be
retained by any compiled Lean runtime independently of how frame selections are rendered.
-/
structure Policy where
  /-- Number of frames in the compiled animation. -/
  totalFrames : Nat
  /-- All compiled step boundaries, used to detect a loop at a selected target frame. -/
  steps : Array Illuminate.StepInfo
  /-- The interaction-pause steps represented by Reveal fragments. -/
  pauseSteps : Array Illuminate.StepInfo
  /-- Whether entering a slide with no visible animation fragments starts playback. -/
  autoplay : Bool := false
deriving Repr, BEq, Inhabited

/-- A browser-independent command understood by an animation player. -/
inductive Command where
  /-- Stop active playback at its currently displayed frame. -/
  | pause
  /-- Jump immediately to a frame without scheduling playback. -/
  | seek (frame : Nat)
  /-- Play toward a frame and optionally enter its loop after arrival. -/
  | playTo (frame : Nat) (loopAfter : Bool := false)
  /-- Jump to a frame and start the loop containing it. -/
  | loopAt (frame : Nat)
deriving Repr, BEq, Inhabited

/-- A normalized Reveal lifecycle or fragment event. -/
inductive Event where
  /-- The animation's slide became current with this many pause fragments already visible. -/
  | slideEntered (visiblePauseCount : Nat)
  /-- The animation's slide stopped being current. -/
  | slideLeft
  /-- The pause fragment at this animation-local index became visible. -/
  | fragmentShown (index : Nat)
  /-- The pause fragment at this animation-local index became hidden. -/
  | fragmentHidden (index : Nat)
deriving Repr, BEq, Inhabited

/-- Precomputes the compact Reveal policy from a compiled animation timeline. -/
def Policy.prepare
    (totalFrames : Nat)
    (steps : Array Illuminate.StepInfo)
    (autoplay : Bool := false) : Policy :=
  { totalFrames, steps, pauseSteps := steps.filter (·.pause), autoplay }

/-- The final valid frame, or zero for a malformed empty animation. -/
def Policy.finalFrame (policy : Policy) : Nat :=
  if policy.totalFrames == 0 then 0 else policy.totalFrames - 1

/-- Returns the last step whose boundary is at or before `frame`. -/
def findCurrentStep (steps : Array Illuminate.StepInfo) (frame : Nat) : Nat := Id.run do
  let mut current := 0
  for index in [0:steps.size] do
    if let some step := steps[index]? then
      if frame >= step.frame then
        current := index
  return current

/-- Reports whether the step containing `frame` loops. -/
def Policy.stepLoopsAt (policy : Policy) (frame : Nat) : Bool :=
  (policy.steps[findCurrentStep policy.steps frame]?.map (·.loop)).getD false

/--
Returns the last frame reached after advancing through pause `index` and all following non-pause
steps. Playback stops just before the next interaction pause, or at the final animation frame.
-/
def Policy.targetAfterPause? (policy : Policy) (index : Nat) : Option Nat := do
  let current ← policy.pauseSteps[index]?
  match policy.pauseSteps[index + 1]? with
  | some next => some (max (next.frame - 1) current.frame)
  | none => some policy.finalFrame

private def Policy.onFragmentShown (policy : Policy) (index : Nat) : Array Command :=
  match policy.pauseSteps[index]? with
  | none => #[]
  | some step =>
    if step.loop then
      #[.playTo step.frame true]
    else
      match policy.targetAfterPause? index with
      | none => #[]
      | some target => #[.playTo target (policy.stepLoopsAt target)]

private def Policy.onFragmentHidden (policy : Policy) (index : Nat) : Array Command :=
  if index == 0 then
    #[.playTo 0 false]
  else
    match policy.pauseSteps[index - 1]? with
    | none => #[]
    | some previous =>
      if previous.loop then
        #[.loopAt previous.frame]
      else
        match policy.targetAfterPause? (index - 1) with
        | none => #[]
        | some target => #[.playTo target false]

private def Policy.onSlideEntered
    (policy : Policy)
    (visiblePauseCount : Nat) : Array Command :=
  if visiblePauseCount > 0 && !policy.pauseSteps.isEmpty then
    let index := min (visiblePauseCount - 1) (policy.pauseSteps.size - 1)
    match policy.pauseSteps[index]? with
    | none => #[]
    | some step =>
      if step.loop then
        #[.loopAt step.frame]
      else
        match policy.targetAfterPause? index with
        | none => #[]
        | some target => #[.seek target]
  else if policy.autoplay then
    let target := (policy.pauseSteps[0]?.map (·.frame)).getD policy.finalFrame
    #[.seek 0, .playTo target false]
  else
    #[.seek 0]

/-- Translates one normalized Reveal event into zero or more animation-player commands. -/
def Policy.plan (policy : Policy) : Event → Array Command
  | .slideEntered visiblePauseCount => policy.onSlideEntered visiblePauseCount
  | .slideLeft => #[.pause]
  | .fragmentShown index => policy.onFragmentShown index
  | .fragmentHidden index => policy.onFragmentHidden index

end RevealPolicy
end VersoSlides
