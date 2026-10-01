"""Diagnostic only: record the existing loss of panel handlers after Reveal restores HTML."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json
from playwright.sync_api import sync_playwright

base = Path(__file__).resolve().parent
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(base / 'site')))
Thread(target=server.serve_forever, daemon=True).start()
observations = []
try:
    with sync_playwright() as p:
        for name in ['chromium', 'firefox']:
            browser = getattr(p, name).launch()
            page = browser.new_page(viewport={'width': 800, 'height': 600})
            page.goto(f'http://127.0.0.1:{server.server_port}/nested/deck/index.html')
            page.wait_for_function("Reveal.isReady() && window.versoVirState === 'ready'")
            page.evaluate("""() => {
                const sections = [...document.querySelectorAll('.slides > section')];
                window.proofIndex = sections.findIndex(s => s.querySelector('.code-with-panel .tactic'));
                Reveal.slide(window.proofIndex, 0, 0);
                window.oldBlock = document.querySelector('.slides > section.present .code-with-panel');
                window.oldBlock.querySelector('.tactic').dispatchEvent(new MouseEvent('click', {bubbles: true}));
            }""")
            assert page.evaluate('!!window.oldBlock._activeSource')
            page.set_viewport_size({'width': 375, 'height': 812})
            page.wait_for_function('Reveal.isScrollView()')
            page.set_viewport_size({'width': 800, 'height': 600})
            page.wait_for_function('!Reveal.isScrollView()')
            observed = page.evaluate("""() => {
                Reveal.slide(window.proofIndex, 0, 0);
                const fresh = document.querySelector('.slides > section.present .code-with-panel');
                fresh.querySelector('.tactic').dispatchEvent(new MouseEvent('click', {bubbles: true}));
                return {oldBlockConnected: window.oldBlock.isConnected,
                    freshBlockSelected: !!fresh._activeSource,
                    currentProgram: window.versoVir.status,
                    format: window.versoVirFormatSegments('still usable', 80, 0)};
            }""")
            observations.append({'browser': name, 'version': browser.version, **observed})
            assert not observed['oldBlockConnected'] and not observed['freshBlockSelected']
            assert observed['currentProgram'] == 'active'
            browser.close()
finally:
    server.shutdown()
(base / 'mobile-restore-repro.json').write_text(json.dumps(observations, indent=2) + '\n')
print(json.dumps(observations, indent=2))
