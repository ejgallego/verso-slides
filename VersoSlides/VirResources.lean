module

public import Vir.Resources
public import Vir.Resources.Runtime
public import VersoSlides.VirPrettyMResources

/-- Built-in PrettyM resources prepared by VIR's owning-library recipe. -/
public def VersoSlides.virResources : Vir.Resources.ResourceSet := {
  runtime := Vir.Resources.Runtime.bundle
  programs := #[VersoSlides.VirPrettyMResources.bundle]
}
