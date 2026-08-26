/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Pretty
import Vir.Attributes

namespace VersoSlides.VirPrettyM

/-- The sole browser entrypoint: typed `Std.Format` in, tagged segments out. -/
@[vir_export]
def formatSegments (format : Std.Format) (width indent : Nat) :
    Array Pretty.Segment :=
  Pretty.formatSegments format width indent

end VersoSlides.VirPrettyM
