module

public import VersoSlides

open VersoSlides

#doc (Slides) "A deck with built-in VIR prettyM" =>

# No application runtime declaration

Click a tactic to render its goal using the built-in VIR formatter.

```lean
example (p q : Prop) (h : p ∧ q) : q ∧ p := by
  obtain ⟨hp, hq⟩ := h
  exact ⟨hq, hp⟩
```
