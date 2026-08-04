import VersoSlides
import Verso.Doc.Concrete

open Verso Doc Elab ArgParse

namespace VirPrettyDemo

/-- Mount point for the standalone multi-backend pretty-printer application. -/
def mountHtml : Verso.Output.Html :=
  Verso.Output.Html.text false "<div class=\"vir-pretty-demo\" data-vir-pretty-demo></div>"

/--
Embed the VIR pretty-printer demo without extending or modifying Verso Slides itself.

Usage:
```
:::virPrettyDemo
:::
```
-/
@[directive]
public meta def virPrettyDemo : DirectiveExpanderOf Unit
  | (), _ =>
    ``(Verso.Doc.Block.other
        (VersoSlides.BlockExt.ofHtml VirPrettyDemo.mountHtml) #[])

end VirPrettyDemo
