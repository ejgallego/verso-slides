import VersoSlides.Panel.Component

open VersoSlides

private def assertEq [BEq α] [Repr α] (expected actual : α) : IO Unit :=
  unless expected == actual do
    throw <| IO.userError s!"expected {repr expected}, got {repr actual}"

def main : IO UInt32 := do
  let rich : Panel.RichText := {
    format := Std.Format.group ("Nat" ++ Std.Format.line ++ "→ Nat")
  }
  let model : Panel.Model := { content := .signature rich, width := 40, widths := #[7] }
  assertEq 7 (model.richTextWidth 0)
  assertEq 40 (model.richTextWidth 1)
  assertEq "Nat\n→ Nat" <|
    String.join <| (rich.renderPlan 4).nodes.toList.map (·.text)
  IO.println "PASS: compiler-neutral panel model"
  return 0
