import VersoSlides
import VirPrettyDemo.Slides
import VirPrettyDemo.Assets

open VersoSlides

def main : IO UInt32 := do
  let profile ← IO.getEnv "VIR_PRETTY_PROFILE"
  let config := VirPrettyDemo.configForProfile profile
  let outputDir ← IO.getEnv "VIR_PRETTY_OUTPUT_DIR"
  let config := match outputDir with
    | some outputDir => { config with outputDir := System.FilePath.mk outputDir }
    | none => config
  slidesMain config (%doc VirPrettyDemo.Slides)
