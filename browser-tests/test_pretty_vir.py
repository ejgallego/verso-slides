"""Tests for the optional VIR-backed pretty-printer hook."""

from urllib.parse import urljoin

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
        assert "VersoSlides.Pretty.formatSegmentsForVir" in body

    def test_pretty_native_asset_written(self, site_dir):
        """The FIR-produced native Wasm bootstrap is also vendored but opt-in."""
        path = site_dir / "code" / "lib" / "pretty-native.js"
        assert path.exists(), f"Expected pretty-native.js at {path}"
        body = path.read_text()
        assert 'id: "native"' in body
        assert "prettyM.wasm" in body
        assert "ConcreteHost" in body

    def test_pretty_vir_not_loaded_by_default(self, code_doc: BeautifulSoup):
        """The bootstrap remains opt-in until the VIR package assets are supplied."""
        scripts = [s.get("src", "") for s in code_doc.select("script[src]")]
        assert any(s.endswith("lib/pretty.js") for s in scripts), scripts
        assert not any(s.endswith("lib/pretty-vir.js") for s in scripts), scripts
        assert not any(s.endswith("lib/pretty-native.js") for s in scripts), scripts


class TestPrettyVirBridge:
    def test_format_to_html_stays_on_js_with_ready_vir_bridge(self, code_url: str, page: Page):
        """The ordinary formatter stays deterministic when a VIR bridge is ready."""
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
                return formatToHtml([5, [4, "hello", [4, 1, "world"]]], {}, 200, {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                });
            }"""
        )
        assert html == "hello world"

    def test_format_to_html_uses_js_when_bridge_not_ready(self, code_url: str, page: Page):
        """A loading bridge does not affect the existing JS printer."""
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
                    formatSegments: () => [{ text: "from-format", tags: [] }]
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
                    format: formatToHtmlWithBackend([5, [4, "hello", [4, 1, "world"]]], {}, 200, measurer, "vir-format"),
                    timed: formatToHtmlTimed([5, [4, "hello", [4, 1, "world"]]], {}, 200, measurer, "vir-format")
                };
            }"""
        )
        assert result["js"] == "hello world"
        assert result["vir"] == "from-vir"
        assert result["format"] == "from-format"
        assert result["timed"]["html"] == "from-format"
        assert result["timed"]["durationMs"] >= 0
        assert set(result["timed"]["timings"]) == {
            "marshalMs",
            "executeMs",
            "decodeMs",
            "renderMs",
            "totalMs",
        }
        assert all(value >= 0 for value in result["timed"]["timings"].values())

    def test_column_measurer_gives_js_an_explicit_budget(self, code_url: str, page: Page):
        """Differential mode can run JS with the same character budget as Lean."""
        goto_slide_by_title(page, code_url, "Dark Code")
        result = page.evaluate(
            """() => {
                const measurer = createColumnMeasurer(5);
                return formatToHtmlTimed(
                    [5, [4, [4, "left", 1], "right"]],
                    {},
                    5,
                    measurer,
                    "js"
                );
            }"""
        )
        assert result["html"] == "left\nright"
        assert result["timings"]["executeMs"] >= 0
        assert result["timings"]["totalMs"] >= result["timings"]["executeMs"]

    def test_explicit_vir_backend_rejects_invalid_segments(self, code_url: str, page: Page):
        """Malformed bridge payloads stay visible instead of falling back to JS."""
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
                return formatToHtmlWithBackend([5, [4, "hello", [4, 1, "world"]]], {}, 200, {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                }, "vir");
            }"""
        )
        assert html is None


class TestPrettyNativeBridge:
    def test_bootstrap_registers_native_candidate(self, code_url: str, page: Page):
        """The native pane is registered synchronously, before its runtime is ready."""
        goto_slide_by_title(page, code_url, "Dark Code")
        page.evaluate("window.__versoPrettyNativeConfig = { enabled: false }")
        page.add_script_tag(url=urljoin(code_url + "/", "lib/pretty-native.js"))
        result = page.evaluate(
            """() => ({
                backend: (() => {
                    const candidate = getPrettyBackends().find(item => item.id === "native");
                    return {
                        id: candidate.id,
                        label: candidate.label,
                        capabilities: candidate.capabilities
                    };
                })(),
                status: window.__versoPrettyNative.status
            })"""
        )
        assert result["backend"]["label"] == "Native"
        assert result["backend"]["capabilities"] == {
            "output": "text",
            "width": "columns",
        }
        assert result["status"] == "disabled"

    def test_ready_native_bridge_renders_plain_string(self, code_url: str, page: Page):
        """The current prettyM ABI compares layout but has no tag segments."""
        goto_slide_by_title(page, code_url, "Dark Code")
        page.evaluate("window.__versoPrettyNativeConfig = { enabled: false }")
        page.add_script_tag(url=urljoin(code_url + "/", "lib/pretty-native.js"))
        html = page.evaluate(
            """() => {
                Object.assign(window.__versoPrettyNative, {
                    enabled: true,
                    status: "ready",
                    format: () => "from-native"
                });
                return formatToHtmlWithBackend([5, [4, "hello", [4, 1, "world"]]], {}, 200, {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                }, "native");
            }"""
        )
        assert html == "from-native"


class TestPrettyVirComparisonPanel:
    def test_tactic_panel_renders_registered_backends_side_by_side(
        self, code_url: str, page: Page
    ):
        """Comparison mode renders all registered candidates in horizontal panes."""
        slide = goto_slide_by_title(page, code_url, "Proof")
        page.evaluate(
            """() => {
                window.__versoPrettyConfig = { compare: true };
                window.__versoPrettyVir = {
                    status: "ready",
                    formatJsonSegmentsJson: () => JSON.stringify({
                        ok: true,
                        segments: [{ text: "from-vir", tags: [] }]
                    }),
                    formatSegments: () => [{ text: "from-format", tags: [] }]
                };
                registerPrettyBackend({
                    id: "native",
                    label: "Native",
                    renderSegments: () => [{ text: "from-native", tags: [] }]
                });
            }"""
        )
        block = slide.locator(".code-with-panel").first
        panel = block.locator(".info-panel")
        tactic = block.locator(".tactic .keyword").first
        expect(tactic).to_be_visible()
        tactic.click()

        expect(panel.locator(".pretty-compare")).to_be_visible()
        assert panel.locator(".pretty-compare-pane").count() == 4
        assert block.evaluate("el => el.classList.contains('pretty-compare-active')")
        layout = block.evaluate(
            """block => {
                const box = el => {
                    const rect = el.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
                };
                return {
                    code: box(block.querySelector("code.hl.lean.block")),
                    panel: box(block.querySelector(".info-panel")),
                    panes: [...block.querySelectorAll(".pretty-compare-pane")].map(box)
                };
            }"""
        )
        pane_boxes = layout["panes"]
        assert layout["code"]["right"] <= layout["panel"]["left"]
        assert all(left["right"] <= right["left"] for left, right in zip(pane_boxes, pane_boxes[1:]))
        assert all(abs(left["top"] - right["top"]) <= 1 for left, right in zip(pane_boxes, pane_boxes[1:]))
        before_width = layout["panel"]["width"]
        block_box = block.bounding_box()
        divider_box = block.locator(".panel-divider").bounding_box()
        assert block_box is not None
        assert divider_box is not None
        page.mouse.move(
            divider_box["x"] + divider_box["width"] / 2,
            divider_box["y"] + divider_box["height"] / 2,
        )
        page.mouse.down()
        page.mouse.move(
            block_box["x"] + block_box["width"] * 0.35,
            divider_box["y"] + divider_box["height"] / 2,
        )
        page.mouse.up()
        after_width = panel.evaluate("el => el.getBoundingClientRect().width")
        assert abs(after_width - before_width) > 20
        expect(panel.locator('[data-pretty-backend="js"] .pretty-compare-header')).to_contain_text("JS")
        expect(panel.locator('[data-pretty-backend="vir"] .pretty-compare-header')).to_contain_text("VIR JSON")
        expect(panel.locator('[data-pretty-backend="vir-format"] .pretty-compare-header')).to_contain_text("VIR Format")
        expect(panel.locator('[data-pretty-backend="native"] .pretty-compare-header')).to_contain_text("Native")
        expect(panel.locator('[data-pretty-backend="vir"] .pretty-compare-body')).to_contain_text(
            "from-vir"
        )
        expect(panel.locator('[data-pretty-backend="vir-format"] .pretty-compare-body')).to_contain_text(
            "from-format"
        )
        expect(panel.locator('[data-pretty-backend="native"] .pretty-compare-body')).to_contain_text(
            "from-native"
        )
        timing_texts = panel.locator(".pretty-compare-time").all_inner_texts()
        assert all("ms" in text for text in timing_texts)
        timing_titles = panel.locator(".pretty-compare-time").evaluate_all(
            "elements => elements.map(element => element.title)"
        )
        assert all("Marshal:" in title for title in timing_titles)
        assert all("Execute:" in title for title in timing_titles)
        assert all("Decode:" in title for title in timing_titles)
        assert all("HTML:" in title for title in timing_titles)

    def test_controls_select_processors_and_share_column_budget(
        self, code_url: str, page: Page
    ):
        """The opt-in control filters execution and persists a reproducible URL."""
        goto_slide_by_title(page, code_url, "Proof")
        index = page.evaluate("Reveal.getIndices().h")
        controlled_url = (
            code_url
            + "/index.html?prettyControls=1&prettyCompare=1"
            + "&pretty=js,vir&prettyColumns=32#/"
            + str(index)
        )
        page.goto(controlled_url)
        page.wait_for_function(
            "(i) => window.Reveal && window.Reveal.isReady() && Reveal.getIndices().h === i",
            arg=index,
        )
        slide = page.locator(".slides > section").nth(index)
        controls = page.locator(".pretty-controls")
        expect(controls).to_be_visible()
        controls.locator("summary").click()
        expect(controls.locator('input[value="js"]')).to_be_checked()
        expect(controls.locator('input[value="vir"]')).to_be_checked()
        expect(controls.locator('input[value="vir-format"]')).not_to_be_checked()
        expect(controls.locator(".pretty-controls-columns input")).to_have_value("32")

        block = slide.locator(".code-with-panel").first
        panel = block.locator(".info-panel")
        block.locator(".tactic .keyword").first.click()
        assert panel.locator(".pretty-compare-pane").count() == 2

        controls.locator('input[value="vir"]').uncheck()
        expect(panel.locator('.pretty-compare-pane[data-pretty-backend="js"]')).to_be_visible()
        assert panel.locator(".pretty-compare-pane").count() == 1
        assert "pretty=js" in page.url

        columns = controls.locator(".pretty-controls-columns input")
        columns.fill("24")
        columns.press("Tab")
        expect(columns).to_have_value("24")
        assert "prettyColumns=24" in page.url
