module

public import VersoSlides

open VersoSlides

#doc (Slides) "A reusable VIR deck" =>

# One application runtime

The number below is computed by the deck's own Lean contribution.
Click a tactic to render its goal through the Slides prettyM contribution.

```lean
example (p q : Prop) (h : p ∧ q) : q ∧ p := by
  obtain ⟨hp, hq⟩ := h
  exact ⟨hq, hp⟩
```
