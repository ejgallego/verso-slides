/-
Copyright (c) 2026 Lean FRO LLC. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
-/

import VersoSlides.Pretty
import Vir.Attributes

namespace PrettyHtmlBenchmark

open VersoSlides

/--
The source-owned complete-renderer boundary used by the standalone browser
benchmark. The benchmark wrapper is intentionally thin: layout, annotation
resolution, escaping, and token-span construction remain in `Pretty`.
-/
@[vir_export]
def formatHtml (format : Std.Format)
    (annotations : Array Pretty.TaggedAnnotation) (width indent : Nat) : String :=
  Pretty.formatHtmlForVir format annotations width indent

end PrettyHtmlBenchmark
