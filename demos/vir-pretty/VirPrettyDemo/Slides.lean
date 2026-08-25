/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/
import VersoSlides
import Verso.Doc.Concrete

open VersoSlides

#doc (Slides) "Lean prettyM backend demo" =>

# Dark Code

```lean
def hello : IO Unit := do
  IO.println "Hello from VersoSlides!"
```

```lean -stretch
#check hello
```

# Stretch Default

```lean
def stretchedDef : Nat := 1
```

# Stretch Off

```lean -stretch
def unstretchedDef : Nat := 1
```

# Light Code
%%%
backgroundColor := some "#f5f5f5"
%%%

```lean
def greet (name : String) : String :=
  s!"Hello, {name}!"

#eval greet "Lean"
```

# Proof

```lean
theorem and_comm_ex (p q : Prop) (h : p ∧ q) : q ∧ p := by
  obtain ⟨hp, hq⟩ := h
  exact ⟨hq, hp⟩
```

# Nested Tactic

```lean
example : a = b → b = c → c = d → d = e → a = e := by
  intro h1 h2 h3 h4
  rw [h1, h2, h3, ←h4]
```

# Obtain State

```lean
/-- A prime is a number larger than 1 with no trivial divisors -/
def IsPrime (n : Nat) := 1 < n ∧ ∀ k, 1 < k → k < n → ¬ k ∣ n

/-- Every number larger than 1 has a prime factor -/
theorem exists_prime_factor :
    ∀ n, 1 < n → ∃ k, IsPrime k ∧ k ∣ n := by
  intro n h1
  -- Either `n` is prime...
  by_cases hprime : IsPrime n
  · grind [Nat.dvd_refl]
  -- ... or it has a non-trivial divisor with a prime factor
  · obtain ⟨k, _⟩ : ∃ k, 1 < k ∧ k < n ∧ k ∣ n := by
      simp_all [IsPrime]
    obtain ⟨p, _, _⟩ := exists_prime_factor k (by grind)
    grind [Nat.dvd_trans]
```

# Inline Lean

The function {lean}`hello` was defined above.
Also try {lean}`Nat.add`.

# Fragment Effects

```lean
-- !fragment grow
def growDef : Nat := 1
-- !fragment highlight-current-red
def redDef : Nat := 2
```

# No Panel

```lean -panel
def noPanelDef : Nat := 99
```

# Replace

```lean
def replaced : Nat :=
  /- !replace ... -/ List.length [1, 2, 3] /- !end replace -/
```

# Comments

```lean
-- A line comment
def commented : Nat := 42
/- A block comment -/
```

# Eval Ordering

```lean
#eval s!"It is {1 + 1} first"
def evalMiddle := 5
#eval s!"Then it is {2 + 2}"
#eval s!"Then it is {4 + 4}"
```

# Eval Multiline

```lean
#eval 1 +

  2 +

3
```

# Check Ordering

```lean
def checkTarget := 42
#check checkTarget
def checkMiddle := "hi"
#check checkMiddle
```

# Print Ordering

```lean
def printTarget := 100
#print printTarget
def printMiddle := true
#print printMiddle
```

# Reduce Ordering

```lean
#reduce 2 + 3
def reduceMiddle := 10
#reduce 10 * 2
```

# Expected Error

```lean +error
#check (42 : String)
```

# Empty Code Block

```lean
```

# Whitespace-Only Code Block

```lean




```

# Comment-Only Code Block

```lean
-- This comment stands alone
```

# Rust Code

```code rust
fn main() {
    let nums = vec![3, 1, 4, 1, 5];
    for n in &nums {
        println!("{n}");
    }
}
```

# Light Inline Lean
%%%
backgroundColor := some "#f5f5f5"
%%%

{lean}`hello` on a light slide.

# Conclusions

## VIR's value is reuse

- 292 lines of Lean replace 662 lines of semantic JavaScript
- 55.9% less component code
- Reuses `Std.Format` and Verso's canonical semantics
- No second browser model to maintain

# Runtime sharing works

- Formatter, panel, and Reveal policy share one runtime
- Second real component: +3.2 KB gzip of IR
- No second runtime, Wasm module, or loader
- Cold VIR still costs about 297 KB gzip

*Sharing is a deployment requirement.*

# Performance

*Layout only — median input → committed DOM*

- JavaScript: 0.135 ms
- FIR Wasm: 0.880 ms
- LLVM Wasm: 1.035 ms
- VIR: 1.695 ms

JavaScript wins this small surface. FIR is the fastest compiled candidate.

# Complete HTML

*Median 256+ code points → committed DOM*

```code text
JavaScript  █                     0.210 ms
FIR Wasm    ███████               1.625 ms
VIR         ████████████████████  4.840 ms
```

Execute: JS 0.110 · FIR 0.880 · VIR 3.310 ms

3 × 1,218 parity-checked batches per backend. FIR is 3.0×
faster than VIR through commit; JavaScript remains 7.7×
faster than FIR.

*Same HTML endpoint; transport and runtimes still differ.*

# Static input residency

*VIR complete HTML, 58 formats × 3 widths*

- Marshal: 1.265 → 0.115 ms
- Execute: 3.700 → 3.595 ms
- Committed: 5.180 → 4.005 ms
- Three campaigns saved 22–25% end-to-end

*Residency matters, but does not explain execution cost.*

# What scales

- 16× text: 17× FIR / 18× VIR — linear
- 256 tags deep: only about 1.1× execute
- 256 annotations exposed a shared linear lookup per chunk
- Post-fix: FIR 12.3 ms (old source) / VIR 16.0 ms

*Source inspection turned the strongest curve into a fix.*

# Where it goes

*VIR timed calls + diagnostic CPU samples*

- Sorted lookup cuts 256-annotation execute by 47–50%
- 64 × 64: 43% import / 57% execute
- Result export: about 0.025 ms; host callbacks: zero
- Post-fix annotation CPU: 71% Wasm, 18% adapter JS

*Next: refresh FIR, then source-map remaining Wasm cost.*

# The useful boundary

- Lean/VIR owns semantic data, policy, layout, and structure
- JavaScript owns browser geometry and lifecycle
- Cached VIR panel work is sub-millisecond
- Browser frames dominate uncached mount and resize

*Keep JavaScript as the experimental control.*

# Recommendation

- VIR: shared runtime plus Lean reuse
- Measure the same corpus and phase boundaries
- FIR HTML closes the three-way renderer test
- Prefer resident static inputs; refresh the shared lookup fix
- Long-lived FIR needs bounded reclamation

*VIR is already compelling for reuse and maintainability.*
