"""Tests for the optional VIR-backed pretty-printer hook."""

from bs4 import BeautifulSoup
from playwright.sync_api import Page, expect

from conftest import goto_slide_by_title


class TestPrettyVirAssets:
    def test_pretty_vir_asset_written(self, site_dir):
        """The optional bootstrap asset is written next to pretty.js."""
        path = site_dir / "code" / "lib" / "pretty-vir.js"
        assert path.exists(), f"Expected pretty-vir.js at {path}"
        body = path.read_text()
        assert "createVirRuntime" in body
        assert "./lean-vir/js/vir-runtime.js" in body
        assert "./lean-vir/wasm/vir-upstream.wasm" in body
        assert "VersoSlides.Pretty.formatJsonSegmentsJsonForVir" in body
        assert "VersoSlides.Pretty.formatCompatSegmentsForVir" in body

    def test_pretty_vir_not_loaded_by_default(self, code_doc: BeautifulSoup):
        """The bootstrap remains opt-in until the VIR package assets are supplied."""
        scripts = [s.get("src", "") for s in code_doc.select("script[src]")]
        assert any(s.endswith("lib/pretty.js") for s in scripts), scripts
        assert not any(s.endswith("lib/pretty-vir.js") for s in scripts), scripts


class TestPrettyVirBridge:
    def test_format_to_html_uses_ready_vir_bridge(self, code_url: str, page: Page):
        """A ready bridge can supply segments while JS still owns HTML construction."""
        goto_slide_by_title(page, code_url, "Dark Code")
        html = page.evaluate(
            """() => {
                window.__versoPrettyVir = {
                    status: "ready",
                    formatJsonSegmentsJson: () => JSON.stringify({
                        ok: true,
                        segments: [{ text: "from-vir", tags: [] }]
                    })
                };
                return formatToHtml("ignored", {}, 120, {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 120,
                    cleanup: () => {}
                });
            }"""
        )
        assert html == "from-vir"

    def test_format_to_html_falls_back_when_bridge_not_ready(self, code_url: str, page: Page):
        """A loading bridge is ignored so the existing JS printer remains synchronous."""
        goto_slide_by_title(page, code_url, "Dark Code")
        html = page.evaluate(
            """() => {
                window.__versoPrettyVir = { status: "loading" };
                return formatToHtml([5, [4, "hello", [4, 1, "world"]]], {}, 200, {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                });
            }"""
        )
        assert html == "hello world"

    def test_format_to_html_can_force_backends(self, code_url: str, page: Page):
        """The prototype comparison path can render JS and VIR outputs separately."""
        goto_slide_by_title(page, code_url, "Dark Code")
        result = page.evaluate(
            """() => {
                window.__versoPrettyVir = {
                    status: "ready",
                    formatJsonSegmentsJson: () => JSON.stringify({
                        ok: true,
                        segments: [{ text: "from-vir", tags: [] }]
                    }),
                    formatCompatSegments: () => [{ text: "from-object", tags: [] }]
                };
                const measurer = {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                };
                return {
                    js: formatToHtmlWithBackend([5, [4, "hello", [4, 1, "world"]]], {}, 200, measurer, "js"),
                    vir: formatToHtmlWithBackend([5, [4, "hello", [4, 1, "world"]]], {}, 200, measurer, "vir"),
                    object: formatToHtmlWithBackend([5, [4, "hello", [4, 1, "world"]]], {}, 200, measurer, "vir-object"),
                    timed: formatToHtmlTimed([5, [4, "hello", [4, 1, "world"]]], {}, 200, measurer, "vir-object")
                };
            }"""
        )
        assert result["js"] == "hello world"
        assert result["vir"] == "from-vir"
        assert result["object"] == "from-object"
        assert result["timed"]["html"] == "from-object"
        assert result["timed"]["durationMs"] >= 0

    def test_format_to_html_falls_back_on_invalid_vir_segments(self, code_url: str, page: Page):
        """Malformed bridge payloads should not be rendered partially."""
        goto_slide_by_title(page, code_url, "Dark Code")
        html = page.evaluate(
            """() => {
                window.__versoPrettyVir = {
                    status: "ready",
                    formatJsonSegmentsJson: () => JSON.stringify({
                        ok: true,
                        segments: [{ text: "bad", tags: ["not-a-tag"] }]
                    })
                };
                return formatToHtml([5, [4, "hello", [4, 1, "world"]]], {}, 200, {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                });
            }"""
        )
        assert html == "hello world"


class TestPrettyVirComparisonPanel:
    def test_tactic_panel_can_show_js_and_vir_side_by_side(self, code_url: str, page: Page):
        """Comparison mode gives the three renderers a full-width row."""
        slide = goto_slide_by_title(page, code_url, "Proof")
        page.evaluate(
            """() => {
                window.__versoPrettyVirConfig = { compare: true };
                window.__versoPrettyVir = {
                    status: "ready",
                    compare: true,
                    formatJsonSegmentsJson: () => JSON.stringify({
                        ok: true,
                        segments: [{ text: "from-vir", tags: [] }]
                    }),
                    formatCompatSegments: () => [{ text: "from-object", tags: [] }]
                };
            }"""
        )
        block = slide.locator(".code-with-panel").first
        panel = block.locator(".info-panel")
        tactic = block.locator(".tactic").first
        expect(tactic).to_be_visible()
        tactic.click()

        expect(panel.locator(".pretty-compare")).to_be_visible()
        assert panel.locator(".pretty-compare-pane").count() == 3
        assert block.evaluate("el => el.classList.contains('pretty-compare-active')")
        layout = block.evaluate(
            """block => {
                const box = el => {
                    const rect = el.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
                };
                return {
                    code: box(block.querySelector("code.hl.lean.block")),
                    panel: box(block.querySelector(".info-panel")),
                    panes: [...block.querySelectorAll(".pretty-compare-pane")].map(box)
                };
            }"""
        )
        pane_boxes = layout["panes"]
        assert layout["code"]["bottom"] <= layout["panel"]["top"]
        assert pane_boxes[0]["right"] <= pane_boxes[1]["left"]
        assert pane_boxes[1]["right"] <= pane_boxes[2]["left"]
        assert abs(pane_boxes[0]["top"] - pane_boxes[1]["top"]) <= 1
        assert abs(pane_boxes[1]["top"] - pane_boxes[2]["top"]) <= 1
        expect(panel.locator('[data-pretty-backend="js"] .pretty-compare-header')).to_contain_text("JS")
        expect(panel.locator('[data-pretty-backend="vir"] .pretty-compare-header')).to_contain_text("VIR JSON")
        expect(panel.locator('[data-pretty-backend="vir-object"] .pretty-compare-header')).to_contain_text("VIR object")
        expect(panel.locator('[data-pretty-backend="vir"] .pretty-compare-body')).to_contain_text(
            "from-vir"
        )
        expect(panel.locator('[data-pretty-backend="vir-object"] .pretty-compare-body')).to_contain_text(
            "from-object"
        )
        timing_texts = panel.locator(".pretty-compare-time").all_inner_texts()
        assert all("ms" in text for text in timing_texts)
