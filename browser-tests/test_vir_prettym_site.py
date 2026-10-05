"""Acceptance checks for a published PrettyM demo served under a URL prefix.

Build root/nested demos, a downstream deck and test-only
native-corpus.json under SITE, then pass `--vir-site-acceptance --site-dir SITE`.
These checks execute only published browser files.
"""

import hashlib
import json
from bs4 import BeautifulSoup

import pytest
from playwright.sync_api import expect


def test_published_bundles_and_urls(site_dir):
    for subdir in ("", "nested/deck", "downstream/custom"):
        root = site_dir / subdir
        assert (root / "index.html").is_file()
        bootstrap = (root / "index.html").read_text()
        assert not (root / "vir-bootstrap.js").exists()
        scripts = BeautifulSoup(bootstrap, "html.parser").select("script[data-runtime-module]")
        assert len(scripts) == 1
        urls = {key: scripts[0][attribute] for key, attribute in [
            ("runtimeModule", "data-runtime-module"), ("runtimeManifest", "data-runtime-manifest"),
            ("programManifest", "data-program-manifest")]}
        assert all(not url.startswith("/") and ".lake" not in url for url in urls.values())
        assert all((root / url).is_file() for url in urls.values())

        manifests = list(root.glob("lib/vir/*/bundle.json"))
        assert len(manifests) == 2
        assert {json.loads(m.read_text())["descriptor"]["kind"] for m in manifests} == {
            "runtime", "program"
        }
        compatibilities = []
        for manifest in manifests:
            data = json.loads(manifest.read_text())
            assert manifest.parent.name == data["contentId"]
            compatibility = data["descriptor"]["compatibility"]
            assert set(compatibility) == {"leanRevision", "virVersion"}
            compatibilities.append(compatibility)
            for entry in data["descriptor"]["files"]:
                content = (manifest.parent / entry["path"]).read_bytes()
                assert len(content) == entry["byteLength"]
                assert hashlib.sha256(content).hexdigest() == entry["sha256"]
        assert compatibilities[0] == compatibilities[1]



def open_demo(page, server, route="nested/deck"):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(f"{server}/{route + '/' if route else ''}index.html")
    page.wait_for_function("window.Reveal?.isReady() === true")
    page.wait_for_function("window.versoVir !== undefined", timeout=30000)
    assert not errors, errors
    assert page.locator('[role="alert"]').count() == 0


@pytest.mark.parametrize("route", ["", "nested/deck"], ids=["root", "nested"])
def test_same_wrapper_native_corpus(page, server, site_dir, route):
    open_demo(page, server, route)
    corpus = json.loads((site_dir / "native-corpus.json").read_text())
    assert len(corpus) == 8
    for case in corpus:
        actual = page.evaluate("""c => window.versoVirFormatSegments(
            c.format, c.width, c.indent)""", case)
        assert actual == case["result"]["segments"], case["name"]


def test_published_host_call_and_lifecycle(page, server):
    open_demo(page, server)
    assert page.evaluate("""() => window.versoVirFormatSegments(
        [7, '7', 'hello'],
        80, 0)""") == [{"text": "hello", "tags": ["7"]}]

    # Back-forward cache pagehide preserves the page-owned program.
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}))")
    assert page.evaluate("""() => window.versoVirFormatSegments(
        'still live', 80, 0)""") == [
        {"text": "still live", "tags": []}
    ]

    # A terminal pagehide disposes it; a fresh navigation creates a new one.
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: false}))")
    assert page.evaluate("""() => {
        try {
            window.versoVirFormatSegments('disposed', 80, 0);
            return false;
        } catch (_) {
            return true;
        }
    }""")
    page.reload()
    page.wait_for_function("window.versoVir !== undefined", timeout=30000)
    assert page.evaluate("""() => window.versoVirFormatSegments(
        'new page', 80, 0)""") == [
        {"text": "new page", "tags": []}
    ]


def open_proof_panel(page):
    result = page.evaluate("""() => {
        const sections = [...document.querySelectorAll('.slides > section')];
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].querySelector('.code-with-panel .tactic')) {
                Reveal.slide(i, 0, 0);
                return i;
            }
        }
        return -1;
    }""")
    assert result >= 0
    page.wait_for_function("(i) => window.Reveal.getIndices().h === i", arg=result)
    block = page.locator(".slides > section.present .code-with-panel", has=page.locator(".tactic")).first
    tactic = block.locator(".tactic:visible").first
    tactic.click()
    panel = block.locator(".info-panel")
    reflowed = panel.locator(".reflowed")
    expect(reflowed.first).not_to_be_empty()
    return block, panel, reflowed


def test_default_panel_reflows_with_wasm(page, server):
    open_demo(page, server)
    block, panel, reflowed = open_proof_panel(page)
    assert not panel.locator('[role="alert"]').count()

    # The existing ResizeObserver path must perform another Wasm render.
    panel.evaluate("el => el.firstElementChild.setAttribute('data-reflow-marker', '1')")
    block.evaluate("""el => {
        el.style.setProperty('--code-ratio', '0.9fr');
        el.style.setProperty('--panel-ratio', '0.1fr');
    }""")
    expect(panel.locator("[data-reflow-marker]")).to_have_count(0, timeout=5000)
    expect(reflowed.first).not_to_be_empty()


def test_independent_deck_uses_published_runtime(page, server):
    page.goto(f"{server}/downstream/custom/index.html")
    page.wait_for_function("window.versoVir !== undefined", timeout=30000)
    assert page.locator('[role="alert"]').count() == 0
    assert page.evaluate("""() => window.versoVirFormatSegments(
        'downstream', 40, 0)""") == [
        {"text": "downstream", "tags": []}
    ]
    tactic = page.locator(".slides > section.present .code-with-panel .tactic:visible").first
    tactic.click()
    panel = page.locator(".slides > section.present .info-panel").first
    expect(panel.locator(".reflowed").first).not_to_be_empty()
