module

public import VersoSlides.Pretty
meta import Vir.Attributes

namespace MyTalk.Runtime

@[vir_export] public def formatSegments (format : Std.Format) (width indent : Nat) :
    Array VersoSlides.Pretty.Segment :=
  VersoSlides.Pretty.formatSegments format width indent

@[vir_export] public def answer : Nat := 42

@[vir_startup] public def startup : Unit := ()

end MyTalk.Runtime
