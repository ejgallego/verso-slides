module

import MyTalk.Slides

open VersoSlides

public def main (args : List String) : IO UInt32 :=
  slidesMain
    (config := { extraAssetDirs := #[{ source := "assets", destination := "deck-assets" }] })
    (doc := %doc MyTalk.Slides)
    (args := args)
