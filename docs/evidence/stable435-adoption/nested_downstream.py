from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect
import json
root=Path('/home/egallego/lean/verso-slides/.worktrees/vir-prettym-435rc4-release')
corpus=json.loads((root/'_test/native-corpus.json').read_text())
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
results=[]
try:
 with sync_playwright() as p:
  for name in ['chromium','firefox']:
   browser=getattr(p,name).launch()
   try:
    page=browser.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    url=f'http://127.0.0.1:{server.server_port}/examples/default-deck/_slides/index.html'
    page.goto(url)
    page.wait_for_function('window.Reveal?.isReady() === true')
    page.wait_for_function('window.versoVir !== undefined',timeout=30000)
    for case in corpus:
     actual=page.evaluate('''c => window.versoVirFormatSegments(c.format,c.width,c.indent).map(s => ({text:s.text,tags:s.tags.map(t => {if(typeof t!=='bigint')throw Error('expected BigInt');return t.toString()})}))''',case)
     assert actual==case['result']['segments'],(name,case['name'],actual)
    index=page.evaluate('''() => [...document.querySelectorAll('.slides > section')].findIndex(s => s.querySelector('.tactic'))''')
    assert index>=0
    page.evaluate('(i) => Reveal.slide(i)',index)
    page.locator('.slides > section.present .tactic:visible').first.click()
    expect(page.locator('.slides > section.present .info-panel .reflowed').first).not_to_be_empty()
    assert errors==[],errors
    results.append({'browser':name,'url':url,'nativeCases':len(corpus),'goalPanel':'PASS','pageErrors':errors})
   finally:browser.close()
finally:
 server.shutdown();server.server_close();thread.join()
print(json.dumps(results,indent=2))
