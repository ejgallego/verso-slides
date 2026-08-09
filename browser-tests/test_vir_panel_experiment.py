"""Browser smoke for the optional Lean/VIR/React panel-component experiment."""

from pathlib import Path

import pytest
from playwright.sync_api import Page, expect


def test_vir_panel_react_commit(site_dir: Path, server: str, page: Page):
    experiment = site_dir / "vir-panel" / "index.html"
    if not experiment.exists():
        pytest.skip("run scripts/build-vir-panel-experiment.sh to stage this opt-in experiment")

    page.goto(f"{server}/vir-panel/index.html")
    page.wait_for_function(
        "() => ['ready', 'error'].includes(document.documentElement.dataset.virPanel)",
    )
    assert page.locator("html").get_attribute("data-vir-panel") == "ready", (
        page.locator("#metrics").text_content()
    )

    expect(page.locator("#panel .goal")).to_have_count(1)
    expect(page.locator("#panel .hypothesis")).to_have_count(1)
    expect(page.locator("#panel .keyword.token")).to_have_attribute("data-binding", "Nat")
    expect(page.locator("#panel")).to_contain_text("case demo")
    expect(page.locator("#panel")).to_contain_text("Nat → Nat")
    package_count = page.evaluate("window.__virPanelExperiment.result.package.packageCount")
    assert package_count == 13
    assert page.evaluate("window.__virPanelExperiment.result.text").startswith("case demo")
