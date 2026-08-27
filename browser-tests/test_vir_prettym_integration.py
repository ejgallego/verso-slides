"""End-to-end coverage for the VIR-backed info-panel formatter."""

from playwright.sync_api import Page, expect

from conftest import goto_slide_by_title


def test_pretty_panel_survives_reload(code_url: str, page: Page):
    for _ in range(2):
        slide = goto_slide_by_title(page, code_url, "Proof")
        page.wait_for_function("() => window.versoVir?.call !== undefined")

        block = slide.locator(".code-with-panel").first
        panel = block.locator(".info-panel")
        block.locator(".tactic").first.click()

        reflowed = panel.locator(".goal .reflowed").first
        expect(reflowed).to_be_visible()
        assert reflowed.locator(".token").count() > 0

        page.reload()
