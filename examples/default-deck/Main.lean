module

import MyTalk.Slides

open VersoSlides

public def main : IO UInt32 :=
  slidesMain (doc := %doc MyTalk.Slides)
