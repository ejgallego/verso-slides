module

import VersoSlides
import MyTalk.Slides

open VersoSlides

private def answerScript : Asset := {
  filename := "answer.js"
  contents := "window.addEventListener('load', () => window.versoVirReady.then(runtime => {
    const result = document.createElement('p');
    result.id = 'deck-answer';
    result.textContent = 'Deck contribution: ' + runtime.call('MyTalk.Runtime.answer');
    document.querySelector('.slides section').appendChild(result);
  }));".toUTF8
}

public def main (args : List String) : IO UInt32 :=
  slidesMain
    (config := { extraJs := #[answerScript.filename], extraAssets := #[answerScript] })
    (doc := %doc MyTalk.Slides)
    (args := args)
