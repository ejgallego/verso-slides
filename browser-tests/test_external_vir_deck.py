"""Actual VIR calls through an independently built downstream deck.

Run with --site-dir pointing at the external fixture's published directory.
"""

from pathlib import Path
from urllib.parse import urlparse

import pytest
from playwright.sync_api import expect


def test_external_deck_single_runtime(page, server, site_dir):
    if not (Path(site_dir) / "custom-prefix/vir/VIR_WEB_ASSETS.json").exists():
        pytest.skip("requires scripts/test-external-vir-deck.py output")
    errors = []
    wasm_requests = []
    external_requests = []
    lifecycle = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: lifecycle.append(message.text.removeprefix("vir-lifecycle:"))
            if message.text.startswith("vir-lifecycle:") else None)

    def route_request(route):
        url = route.request.url
        if urlparse(url).netloc != urlparse(server).netloc:
            external_requests.append(url)
            route.abort()
        elif url.endswith("/sdk/js/vir-runtime.js"):
            # Observe real calls at the runtime boundary; the SDK/Wasm and
            # application still execute normally. No production counters.
            response = route.fetch()
            body = response.text().replace(
                "export function createVirRuntimeFactory(options = {})",
                "function observedFactory(options = {})",
            )
            body += """
export function createVirRuntimeFactory(options = {}) {
  const record = phase => {
    console.log('vir-lifecycle:' + phase);
  };
  const factory = observedFactory(options);
  return { async createRuntime(options) {
    const runtime = await factory.createRuntime(options);
    record('create');
    return {
      interfaceManifest: runtime.interfaceManifest,
      call: runtime.call.bind(runtime),
      runStartupEntries() { record('startup'); return runtime.runStartupEntries(); },
      dispose() { record('dispose'); return runtime.dispose(); }
    };
  }};
}
"""
            route.fulfill(response=response, body=body)
        else:
            if url.endswith(".wasm"):
                wasm_requests.append(url)
            route.continue_()

    page.route("**/*", route_request)
    url = server + "/custom-prefix/"

    def exercise():
        page.wait_for_function("window.versoVir !== undefined")
        expect(page.locator("#deck-answer")).to_have_text("Deck contribution: 42")
        block = page.locator(".code-with-panel").first
        if not block.locator(".info-panel .reflowed .token").first.is_visible():
            block.locator(".tactic").first.click()
        expect(block.locator(".info-panel .reflowed .token").first).to_be_visible()
        result = page.evaluate("""() => ({
            formatted: window.versoVirFormatSegments(
              {kind: 'tag', fields: {arg1: 7, arg2: {kind: 'text', value: 'hello'}}}, 80, 0),
            answer: window.versoVir.call('MyTalk.Runtime.answer')
        })""")
        assert result["formatted"] == [{"text": "hello", "tags": ["7"]}]
        assert result["answer"] == "42"

    page.goto(url)
    exercise()
    assert lifecycle == ["create", "startup"]
    assert len(wasm_requests) == 1
    # Deterministically cover persisted lifecycle events even when the browser
    # declines to cache a particular page. No runtime replacement is needed.
    page.evaluate("""() => {
        window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}));
        window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
    }""")
    exercise()
    assert lifecycle == ["create", "startup"]
    page.reload()
    exercise()
    assert lifecycle == [
        "create", "startup", "dispose", "create", "startup"
    ]
    assert len(wasm_requests) == 2
    assert not errors, errors
    assert not external_requests, external_requests


def test_external_deck_missing_formatter(page, server, site_dir):
    if not (Path(site_dir) / "custom-prefix/vir/VIR_WEB_ASSETS.json").exists():
        pytest.skip("requires scripts/test-external-vir-deck.py output")

    def change_root(route):
        response = route.fetch()
        manifest = response.json()
        manifest["programs"][0]["module"] = "MyTalk.Missing"
        route.fulfill(response=response, json=manifest)

    page.route("**/VIR_WEB_ASSETS.json", change_root)
    page.goto(server + "/custom-prefix/")
    expect(page.get_by_role("alert")).to_contain_text("MyTalk.Missing.formatSegments")
    expect(page.get_by_role("alert")).to_contain_text("@[vir_export]")
    assert page.evaluate("window.versoVir === undefined")


def test_external_deck_history_navigation(browser, server, site_dir):
    if not (Path(site_dir) / "custom-prefix/vir/VIR_WEB_ASSETS.json").exists():
        pytest.skip("requires scripts/test-external-vir-deck.py output")
    # Playwright disables Chromium's bfcache by default. Use a separate launch
    # without that flag and no request interception for actual history coverage.
    history_browser = browser.browser_type.launch(
        ignore_default_args=["--disable-back-forward-cache"],
    )
    try:
        page = history_browser.new_page()
        page.add_init_script("""window.addEventListener('pageshow', event => {
            window.restoredFromCache = event.persisted;
        });""")
        page.goto(server + "/custom-prefix/")
        page.wait_for_function("window.versoVir !== undefined")
        page.evaluate("""() => {
            window.savedRuntime = window.versoVir;
        }""")
        page.goto(server + "/custom-prefix/keep.txt")
        page.go_back()
        page.wait_for_function("window.restoredFromCache !== undefined && window.versoVir !== undefined")
        # Caching is browser policy, not guaranteed. Assert object preservation
        # when it occurs; otherwise the normal reload path must still work.
        if page.evaluate("window.restoredFromCache"):
            assert page.evaluate("window.versoVir === window.savedRuntime")
        assert page.evaluate("window.versoVir.call('MyTalk.Runtime.answer')") == "42"
        assert page.evaluate("window.versoVirFormatSegments({kind:'text',value:'restored'},80,0)") == [
            {"text": "restored", "tags": []}
        ]
    finally:
        history_browser.close()
