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
    page.reload()
    exercise()
    assert lifecycle == [
        "create", "startup", "dispose", "create", "startup"
    ]
    assert len(wasm_requests) == 2
    assert not errors, errors
    assert not external_requests, external_requests
