"""VIR prettyM is available in an ordinary deck, without a custom runtime root."""

import json
from pathlib import Path

import pytest
from playwright.sync_api import expect


def test_default_vir_prettym(page, server, site_dir):
    manifest = Path(site_dir) / "custom-prefix/vir/VIR_WEB_ASSETS.json"
    if not manifest.exists() or json.loads(manifest.read_text())["programs"][0]["module"] != "VersoSlides.VirPrettyM":
        pytest.skip("requires external default-runtime fixture output")
    errors = []
    wasm = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: wasm.append(request.url) if request.url.endswith(".wasm") else None)

    def exercise():
        page.wait_for_function("window.versoVir !== undefined")
        result = page.evaluate("""() => window.versoVirFormatSegments(
            {kind: 'tag', fields: {arg1: 7, arg2: {kind: 'text', value: 'hello'}}}, 80, 0)
        """)
        assert result == [{"text": "hello", "tags": ["7"]}]
        block = page.locator(".code-with-panel").first
        if not block.locator(".info-panel .reflowed .token").first.is_visible():
            block.locator(".tactic").first.click()
        expect(block.locator(".info-panel .reflowed .token").first).to_be_visible()

    page.goto(server + "/custom-prefix/")
    exercise()
    assert len(wasm) == 1
    page.reload()
    exercise()
    assert len(wasm) == 2
    assert not errors, errors
