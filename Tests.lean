/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Author: David Thrane Christiansen
-/

module

/-
The individual test modules are executable roots, so each must export a
declaration named `main`. Importing more than one of them into a module-system
file would cause those declarations to collide; Lake's executable targets in
`lakefile.lean` build them independently instead.
-/
