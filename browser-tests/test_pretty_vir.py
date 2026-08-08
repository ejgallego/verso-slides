"""Tests for the optional VIR-backed pretty-printer hook."""

import json

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
        assert "irPackageSetBytes" in body
        assert "./lean-vir/js/vir-runtime.js" in body
        assert "./lean-vir/wasm/vir-upstream.wasm" in body
        assert "VersoSlides.Pretty.formatJsonSegmentsJsonForVir" in body
        assert "VersoSlides.Pretty.formatSegmentsForVir" in body
        assert "jsonRoundTrip" not in body

    def test_pretty_native_asset_written(self, site_dir):
        """The FIR-produced native Wasm bootstrap is also vendored but opt-in."""
        path = site_dir / "code" / "lib" / "pretty-native.js"
        assert path.exists(), f"Expected pretty-native.js at {path}"
        body = path.read_text()
        assert 'id: "native"' in body
        assert "prettyM.wasm" in body
        assert "PrettyTrace" in body
        assert "traceToSegments" in body
        assert "fetchPrettyMAdapter" in body
        assert "compactFormatToAdapterInput" in body
        assert "ConcreteHost" not in body

    def test_pretty_llvm_asset_written(self, site_dir):
        """The LLVM/Emscripten adapter bootstrap is vendored but opt-in."""
        path = site_dir / "code" / "lib" / "pretty-llvm.js"
        assert path.exists(), f"Expected pretty-llvm.js at {path}"
        body = path.read_text()
        assert 'id: "llvm"' in body
        assert "loadEmscriptenPrettyMAdapter" in body
        assert "prettyM.manifest.json" in body
        assert "compactFormatToAdapterInput" in body
        assert "prettyTraceToSegments" in body

    def test_cross_origin_isolation_fallback_assets_written(self, site_dir):
        """Static hosts can bootstrap the isolation required by threaded Wasm."""
        root = site_dir / "code"
        assert (root / "coi-serviceworker.js").exists()
        register = (root / "lib" / "coi-register.js").read_text()
        assert 'updateViaCache: "none"' in register
        assert "reloadOnce" in register
        assert "sessionStorage" in register

    def test_pretty_vir_not_loaded_by_default(self, code_doc: BeautifulSoup):
        """The bootstrap remains opt-in until the VIR package assets are supplied."""
        scripts = [s.get("src", "") for s in code_doc.select("script[src]")]
        assert any(s.endswith("lib/pretty.js") for s in scripts), scripts
        assert not any(s.endswith("lib/pretty-vir.js") for s in scripts), scripts
        assert not any(s.endswith("lib/pretty-native.js") for s in scripts), scripts
        assert not any(s.endswith("lib/pretty-llvm.js") for s in scripts), scripts
        assert not any(s.endswith("lib/coi-register.js") for s in scripts), scripts


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

    def test_js_segments_match_lean_newline_shape(self, code_url: str, page: Page):
        """A newline and its indentation use the same single segment as Lean."""
        goto_slide_by_title(page, code_url, "Dark Code")
        segments = page.evaluate(
            """() => {
                const measurer = createColumnMeasurer(5);
                return renderPrettySegmentsTimed(
                    [5, [4, "left", [3, 2, [4, 1, "right"]]]],
                    {},
                    5,
                    measurer,
                    getPrettyBackend("js")
                ).segments;
            }"""
        )
        assert segments == [
            {"text": "left", "tags": []},
            {"text": "\n  ", "tags": []},
            {"text": "right", "tags": []},
        ]

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
            "output": "segments",
            "width": "columns",
        }
        assert result["status"] == "disabled"

    def test_ready_native_bridge_renders_tagged_segments(self, code_url: str, page: Page):
        """The styled native bridge participates in syntax-aware rendering."""
        goto_slide_by_title(page, code_url, "Dark Code")
        page.evaluate("window.__versoPrettyNativeConfig = { enabled: false }")
        page.add_script_tag(url=urljoin(code_url + "/", "lib/pretty-native.js"))
        html = page.evaluate(
            """() => {
                Object.assign(window.__versoPrettyNative, {
                    enabled: true,
                    status: "ready",
                    formatSegments: () => [{ text: "from-native", tags: [7] }]
                });
                return formatToHtmlWithBackend(
                    [5, [4, "hello", [4, 1, "world"]]],
                    { "7": { cssClass: "keyword" } },
                    200,
                    {
                    spaceWidth: 10,
                    measure: s => s.length * 10,
                    measureElWidth: () => 200,
                    cleanup: () => {}
                    },
                    "native"
                );
            }"""
        )
        assert html == '<span class="keyword token">from-native</span>'

    def test_native_trace_normalizes_nested_tags_and_newlines(self, code_url: str, page: Page):
        """Raw PrettyTrace events become the shared tagged-segment contract."""
        goto_slide_by_title(page, code_url, "Dark Code")
        page.evaluate("window.__versoPrettyNativeConfig = { enabled: false }")
        page.add_script_tag(url=urljoin(code_url + "/", "lib/pretty-native.js"))
        segments = page.evaluate(
            """() => window.__versoPrettyNative.traceToSegments({
                text: "outer inner\\n  end",
                events: [
                    { kind: 2, text: "", value: 7n },
                    { kind: 0, text: "outer ", value: 0n },
                    { kind: 2, text: "", value: 8n },
                    { kind: 0, text: "inner", value: 0n },
                    { kind: 3, text: "", value: 1n },
                    { kind: 1, text: "", value: 2n },
                    { kind: 0, text: "end", value: 0n },
                    { kind: 3, text: "", value: 1n }
                ]
            })"""
        )
        assert segments == [
            {"text": "outer ", "tags": [7]},
            {"text": "inner", "tags": [7, 8]},
            {"text": "\n  ", "tags": []},
            {"text": "end", "tags": [7]},
        ]


class TestPrettyLlvmBridge:
    def test_bootstrap_registers_llvm_candidate(self, code_url: str, page: Page):
        """The LLVM pane is registered synchronously before its runtime loads."""
        goto_slide_by_title(page, code_url, "Dark Code")
        page.evaluate("window.__versoPrettyLlvmConfig = { enabled: false }")
        page.add_script_tag(url=urljoin(code_url + "/", "lib/pretty-llvm.js"))
        result = page.evaluate(
            """() => ({
                backend: (() => {
                    const candidate = getPrettyBackends().find(item => item.id === "llvm");
                    return {
                        id: candidate.id,
                        label: candidate.label,
                        capabilities: candidate.capabilities
                    };
                })(),
                status: window.__versoPrettyLlvm.status
            })"""
        )
        assert result["backend"]["label"] == "LLVM"
        assert result["backend"]["capabilities"] == {
            "output": "segments",
            "width": "columns",
        }
        assert result["status"] == "disabled"



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
                    renderTimed: () => ({
                        segments: [{ text: "from-native", tags: [] }],
                        timings: {
                            marshalMs: 0.4,
                            executeMs: 0.1,
                            decodeMs: 0.2,
                            renderMs: 0,
                            totalMs: 0.7,
                            adapterInputMs: 0.05,
                            normalizeMs: 0.1,
                            allocateMs: 0.05,
                            encodeMs: 0.2,
                            inputBytes: 512,
                            rawObjects: 12,
                            allocationCalls: 1
                        }
                    })
                });
                registerPrettyBackend({
                    id: "llvm",
                    label: "LLVM",
                    renderTimed: () => ({
                        segments: [{ text: "from-llvm", tags: [] }],
                        timings: {
                            marshalMs: 0.5,
                            executeMs: 0.2,
                            decodeMs: 0.1,
                            renderMs: 0,
                            totalMs: 0.8,
                            adapterInputMs: 0.1,
                            encodeMs: 0.4,
                            requestBytes: 300,
                            responseBytes: 400,
                            formatNodes: 12,
                            heapBytesBefore: 16777216,
                            heapBytesAfter: 16777216
                        }
                    })
                });
            }"""
        )
        block = slide.locator(".code-with-panel").first
        panel = block.locator(".info-panel")
        tactic = block.locator(".tactic .keyword").first
        expect(tactic).to_be_visible()
        tactic.click()

        expect(panel.locator(".pretty-compare")).to_be_visible()
        assert panel.locator(".pretty-compare-pane").count() == 5
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
        expect(panel.locator('[data-pretty-backend="llvm"] .pretty-compare-header')).to_contain_text("LLVM")
        expect(panel.locator('[data-pretty-backend="vir"] .pretty-compare-body')).to_contain_text(
            "from-vir"
        )
        expect(panel.locator('[data-pretty-backend="vir-format"] .pretty-compare-body')).to_contain_text(
            "from-format"
        )
        expect(panel.locator('[data-pretty-backend="native"] .pretty-compare-body')).to_contain_text(
            "from-native"
        )
        expect(panel.locator('[data-pretty-backend="llvm"] .pretty-compare-body')).to_contain_text(
            "from-llvm"
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
        native_timing = panel.locator(
            '[data-pretty-backend="native"] .pretty-compare-time'
        ).get_attribute("title")
        assert native_timing is not None
        assert "Verso input:" in native_timing
        assert "Normalize:" in native_timing
        assert "Allocate:" in native_timing
        assert "Encode:" in native_timing
        assert "Input arena: 2048 B, 48 objects, 4 allocations" in native_timing
        llvm_timing = panel.locator(
            '[data-pretty-backend="llvm"] .pretty-compare-time'
        ).get_attribute("title")
        assert llvm_timing is not None
        assert "Verso input:" in llvm_timing
        assert "Encode:" in llvm_timing
        assert "Wire: 1200 B request, 1600 B response, 48 nodes" in llvm_timing
        assert "Emscripten heap: 16777216 → 16777216 B" in llvm_timing

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
        controls.wait_for(state="visible")
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

        timing = controls.locator(".pretty-controls-timing select")
        expect(timing).to_have_value("total")
        timing.select_option("execute")
        assert all(
            text.startswith("Execute · ")
            for text in panel.locator(".pretty-compare-time").all_inner_texts()
        )
        assert "prettyTiming=execute" in page.url

        timing.select_option("tracks")
        assert panel.locator(".pretty-timing-tracks").count() == 2
        assert panel.locator(".pretty-timing-tracks-total").count() == 2
        assert all(
            "Total" in text and "ms" in text
            for text in panel.locator(".pretty-timing-tracks-total").all_inner_texts()
        )
        assert panel.locator(".pretty-timing-track").count() == 8
        assert panel.locator('[data-timing-phase="executeMs"]').count() == 2
        assert "prettyTiming=tracks" in page.url

        controls.locator('input[value="vir"]').uncheck()
        expect(panel.locator('.pretty-compare-pane[data-pretty-backend="js"]')).to_be_visible()
        assert panel.locator(".pretty-compare-pane").count() == 1
        assert "pretty=js" in page.url

        columns = controls.locator(".pretty-controls-columns input")
        columns.fill("24")
        columns.press("Tab")
        expect(columns).to_have_value("24")
        assert "prettyColumns=24" in page.url
