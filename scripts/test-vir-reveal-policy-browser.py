#!/usr/bin/env python3

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from threading import Thread

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def goto_slide(page, base_url: str, title: str) -> None:
    page.goto(f"{base_url}/index.html?revealPolicy=vir")
    page.wait_for_function("() => window.Reveal?.isReady?.() === true")
    index = page.evaluate(
        """title => {
            const sections = document.querySelectorAll('.slides > section');
            for (let i = 0; i < sections.length; i++) {
                const heading = sections[i].querySelector('h1, h2, h3');
                if (heading?.textContent?.trim() === title) return i;
            }
            return -1;
        }""",
        title,
    )
    if index < 0:
        raise AssertionError(f"slide not found: {title}")
    page.goto(f"{base_url}/index.html?revealPolicy=vir#/{index}")
    page.wait_for_function("index => window.Reveal?.getIndices().h === index", arg=index)
    page.wait_for_function(
        """() => [...document.querySelectorAll('section.present .illuminate-anim')]
            .every(node => node.dataset.illuminatePolicyBackend === 'vir')"""
    )


def test_browser(browser_type, base_url: str) -> None:
    browser = browser_type.launch(headless=True)
    page = browser.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    goto_slide(page, base_url, "Animation Click")
    container = page.locator("section.present .illuminate-anim").first
    before = container.inner_html()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(1000)
    if container.inner_html() == before:
        raise AssertionError("VIR policy did not advance the click animation")

    goto_slide(page, base_url, "Animation Loop End")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(1500)
    container = page.locator("section.present .illuminate-anim").first
    first = container.inner_html()
    page.wait_for_timeout(200)
    if container.inner_html() == first:
        raise AssertionError("VIR policy did not preserve the final loop")

    if errors:
        raise AssertionError("browser errors: " + "\n".join(errors))
    browser.close()


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: test-vir-reveal-policy-browser.py DECK_DIR")
    deck_dir = Path(sys.argv[1]).resolve()
    if not (deck_dir / "index.html").is_file():
        raise SystemExit(f"deck not found: {deck_dir}")

    handler = partial(QuietHandler, directory=str(deck_dir.parent))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}/{deck_dir.name}"
    try:
        with sync_playwright() as playwright:
            for name in ("chromium", "firefox"):
                test_browser(getattr(playwright, name), base_url)
                print(f"PASS: {name} Verso Reveal policy through VIR")
    finally:
        server.shutdown()
        thread.join()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
