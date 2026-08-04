import VersoSlides
import VirPrettyDemo.Slides
import VirPrettyDemo.Assets

open VersoSlides

def main : IO UInt32 :=
  slidesMain VirPrettyDemo.config (%doc VirPrettyDemo.Slides)
