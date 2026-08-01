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


class TestPrettyDifferentialCorpus:
    def test_five_backend_corpus_canonicalizes_segments_and_reports_timings(
        self, code_url: str, page: Page
    ):
        """The reusable runner compares five outputs and retains phase distributions."""
        goto_slide_by_title(page, code_url, "Dark Code")
        result = page.evaluate(
            """async () => {
                const ids = ["js", "vir", "vir-format", "native", "llvm"];
                ids.forEach((id, index) => registerPrettyBackend({
                    id,
                    label: id,
                    status: () => "ready",
                    renderTimed: (fmt, _annotations, width) => {
                        const text = JSON.stringify(fmt) + ":" + width;
                        const split = id === "js" && text.length > 2;
                        return {
                            segments: split
                                ? [
                                    { text: text.slice(0, 2), tags: [7] },
                                    { text: text.slice(2), tags: [7] }
                                ]
                                : [{ text, tags: [7] }],
                            timings: {
                                marshalMs: index + 0.1,
                                executeMs: index + 0.2,
                                decodeMs: index + 0.3,
                                renderMs: 0,
                                totalMs: index + 0.6
                            }
                        };
                    }
                }));
                const options = {
                    backendIds: ids,
                    cases: [
                        { id: "text", label: "Text", format: "hello" },
                        { id: "break", label: "Break", format: [5, [4, "a", [4, 1, "b"]]] }
                    ],
                    widths: [4, 12],
                    warmup: 1,
                    samples: 3,
                    profile: false
                };
                const matching = await runPrettyDifferentialCorpus(options);
                registerPrettyBackend({
                    id: "llvm",
                    label: "llvm",
                    status: () => "ready",
                    renderTimed: () => ({
                        segments: [{ text: "different", tags: [] }],
                        timings: {
                            marshalMs: 0,
                            executeMs: 1,
                            decodeMs: 0,
                            renderMs: 0,
                            totalMs: 1
                        }
                    })
                });
                const differing = await runPrettyDifferentialCorpus({
                    ...options,
                    cases: [options.cases[0]],
                    widths: [4],
                    warmup: 0,
                    samples: 1
                });
                registerPrettyBackend({
                    id: "native",
                    label: "native",
                    status: () => "ready",
                    renderTimed: () => ({
                        segments: null,
                        error: "RangeError: synthetic stack overflow",
                        timings: {
                            marshalMs: 0,
                            executeMs: 0,
                            decodeMs: 0,
                            renderMs: 0,
                            totalMs: 0
                        }
                    })
                });
                const failing = await runPrettyDifferentialCorpus({
                    backendIds: ["native"],
                    cases: [options.cases[0]],
                    widths: [4],
                    warmup: 0,
                    samples: 1,
                    profile: false
                });
                return { matching, differing, failing };
            }"""
        )

        matching = result["matching"]
        assert matching["passed"]
        assert matching["scenarioCount"] == 4
        assert matching["parityCount"] == 4
        assert matching["unavailable"] == []
        assert matching["summaries"]["native"]["timing"]["totalMs"]["samples"] == 12
        assert matching["summaries"]["native"]["timing"]["totalMs"]["median"] == 3.6
        assert matching["scenarios"][0]["backends"]["js"]["segments"] == [
            {"text": '"hello":4', "tags": [7]}
        ]
        assert matching["scenarios"][0]["output"] == {
            "textCodePoints": 9,
            "textBytes": 9,
            "segments": 1,
            "lineBreaks": 0,
            "lines": 1,
            "maxTagDepth": 1,
            "tagTransitions": 2,
        }

        differing = result["differing"]
        assert not differing["passed"]
        assert differing["parityCount"] == 0
        assert differing["mismatches"] == [{"caseId": "text", "label": "Text", "width": 4}]

        failing = result["failing"]
        assert not failing["passed"]
        assert failing["mismatches"][0]["backendErrors"] == {
            "native": ["RangeError: synthetic stack overflow"]
        }

    def test_real_slide_formats_and_scaling_dimensions(self, code_url: str, page: Page):
        """Real generated formats are harvested and scaling points isolate six dimensions."""
        goto_slide_by_title(page, code_url, "Dark Code")
        result = page.evaluate(
            """async () => {
                const real = collectPrettyFormatsFromDocument();
                const ids = ["scale-js", "scale-vir", "scale-format", "scale-native", "scale-llvm"];
                ids.forEach((id, index) => registerPrettyBackend({
                    id,
                    label: id,
                    status: () => "ready",
                    renderTimed: fmt => ({
                        segments: [{ text: JSON.stringify(fmt), tags: [] }],
                        memory: id === "scale-native"
                            ? { frontierBefore: 0, frontierAfterDecode: 1024 }
                            : undefined,
                        timings: {
                            marshalMs: 0.1,
                            executeMs: index + 0.2,
                            decodeMs: 0.1,
                            renderMs: 0,
                            totalMs: index + 0.4
                        }
                    })
                }));
                const scaling = await runPrettyScalingStudy({
                    backendIds: ids,
                    warmup: 0,
                    samples: 1,
                    batchMemoryBudgetBytes: 32 * 1024
                });
                const memory = await runPrettyMemoryScalingStudy({
                    backendIds: ids,
                    pointIndexes: [0, 1]
                });
                const interactions = await runPrettyInteractionStudy({
                    backendIds: ids,
                    warmup: 0,
                    samples: 1,
                    batchTargetMs: 0
                });
                const repeated = await runPrettyRepeatedCallStudy({
                    backendIds: ids,
                    cycles: 3
                });
                const profile = await collectPrettyRuntimeProfile(["js"]);
                return {
                    realCount: real.length,
                    realOrigins: [...new Set(real.map(item => item.origin))],
                    firstMetrics: measureCompactFormat(real[0].format),
                    scaling,
                    memory,
                    interactions,
                    repeated,
                    profile
                };
            }"""
        )

        assert result["realCount"] > 0
        assert result["realOrigins"] == ["slide"]
        assert result["firstMetrics"]["formatNodes"] > 0
        js_profile = result["profile"]["backends"]["js"]
        assert js_profile["assetBytes"] > 0
        assert js_profile["assets"][0]["sha256"]
        assert js_profile["resourceLoadMs"] >= 0
        scaling = result["scaling"]
        assert scaling["passed"]
        assert scaling["scenarioCount"] == 32
        assert scaling["parityCount"] == 32
        assert [dimension["id"] for dimension in scaling["dimensions"]] == [
            "text",
            "nodes",
            "nesting",
            "breaks",
            "tags",
            "width",
        ]
        assert scaling["dimensions"][0]["points"][-1]["input"]["textCodePoints"] == 8192
        assert scaling["dimensions"][1]["points"][-1]["input"]["formatNodes"] == 2047
        assert [phase["id"] for phase in scaling["timingPhases"]] == [
            "executeMs",
            "marshalMs",
            "decodeMs",
            "totalMs",
        ]
        assert scaling["dimensions"][0]["points"][-1]["output"]["textBytes"] == 8194
        assert scaling["dimensions"][0]["phaseTrends"]["executeMs"]["scale-js"]
        assert scaling["batchTargetMs"] == 20
        assert scaling["scenarios"][0]["backends"]["scale-js"]["batchIterations"] > 1
        assert scaling["scenarios"][0]["backends"]["scale-native"]["batchIterations"] == 1
        assert (
            scaling["scenarios"][0]["backends"]["scale-native"]["batchLimitReason"]
            == "resident-memory-budget"
        )
        assert scaling["summaries"]["scale-js"]["invocations"] > scaling["scenarioCount"]

        memory = result["memory"]
        assert memory["passed"]
        assert memory["pointCount"] == 2
        assert memory["parityCount"] == 2
        assert memory["points"][0]["backends"]["scale-js"]["committedDeltaBytes"] is None

        interactions = result["interactions"]
        assert interactions["passed"]
        assert interactions["scenarioCount"] == 36
        assert interactions["parityCount"] == 36
        assert [interaction["id"] for interaction in interactions["interactions"]] == [
            "breaks-width",
            "nodes-depth",
            "tags-transitions",
            "input-output",
        ]
        assert all(len(interaction["points"]) == 9 for interaction in interactions["interactions"])

        repeated = result["repeated"]
        assert repeated["passed"]
        assert repeated["cycles"] == 3
        assert repeated["workloadCount"] == 5
        assert repeated["callsPerBackend"] == 15
        assert repeated["totalBackendCalls"] == 75
        assert repeated["stabilityMismatches"] == []
        assert all(workload["output"] for workload in repeated["workloads"])

    def test_controls_run_corpus_and_open_report(self, code_url: str, page: Page):
        """The testing menu exposes the corpus summary and per-scenario data."""
        goto_slide_by_title(page, code_url, "Dark Code")
        index = page.evaluate("Reveal.getIndices().h")
        page.goto(f"{code_url}/index.html?prettyControls=1#/{index}")
        page.wait_for_function(
            "(i) => window.Reveal && window.Reveal.isReady() && Reveal.getIndices().h === i",
            arg=index,
        )
        page.evaluate(
            """() => {
                ["js", "vir", "vir-format", "native", "llvm"].forEach((id, index) =>
                    registerPrettyBackend({
                        id,
                        label: id,
                        status: () => "ready",
                        renderTimed: fmt => ({
                            segments: [{ text: JSON.stringify(fmt), tags: [] }],
                            timings: {
                                marshalMs: 0.1,
                                executeMs: index + 0.2,
                                decodeMs: 0.1,
                                renderMs: 0,
                                totalMs: index + 0.4
                            }
                        })
                    })
                );
            }"""
        )

        controls = page.locator(".pretty-controls")
        controls.locator("summary").click()
        controls.locator(".pretty-corpus-run").click()
        report = page.locator(".pretty-corpus-overlay")
        expect(report).to_be_visible()
        expect(report.locator(".pretty-corpus-result")).to_contain_text(
            "scenarios agree · 5/5 backends ready"
        )
        assert report.locator(".pretty-corpus-summary tr").count() == 6
        assert report.locator(".pretty-corpus-scenarios tr").count() > 46
        report.locator(".pretty-corpus-close").click()
        expect(report).not_to_be_visible()

        controls.locator(".pretty-scaling-run").click()
        scaling_report = page.locator(".pretty-scaling-overlay")
        expect(scaling_report).to_be_visible()
        expect(scaling_report.locator(".pretty-corpus-result")).to_contain_text(
            "32/32 scaling points agree · 6 dimensions"
        )
        assert scaling_report.locator(".pretty-scaling-chart").count() == 6
        assert scaling_report.locator(".pretty-scaling-table").count() == 6
        phase = scaling_report.locator(".pretty-scaling-phase")
        expect(phase).to_have_value("executeMs")
        expect(scaling_report.locator(".pretty-scaling-table").first).to_contain_text(
            "Output bytes"
        )
        phase.select_option("totalMs")
        expect(scaling_report.locator("h3").first).to_contain_text("Total")
        scaling_report.locator(".pretty-corpus-close").click()
        expect(scaling_report).not_to_be_visible()

        controls.locator(".pretty-memory-run").click()
        memory_report = page.locator(".pretty-memory-overlay")
        expect(memory_report).to_be_visible()
        expect(memory_report.locator(".pretty-corpus-result")).to_contain_text(
            "32/32 one-call memory points agree"
        )
        expect(memory_report.locator(".pretty-memory-metric")).to_have_value(
            "residentDeltaBytes"
        )
        assert memory_report.locator(".pretty-memory-chart").count() == 6
        assert memory_report.locator(".pretty-memory-table").count() == 6
        memory_report.locator(".pretty-corpus-close").click()
        expect(memory_report).not_to_be_visible()

        controls.locator(".pretty-interaction-run").click()
        interaction_report = page.locator(".pretty-interaction-overlay")
        expect(interaction_report).to_be_visible()
        expect(interaction_report.locator(".pretty-corpus-result")).to_contain_text(
            "36/36 interaction points agree"
        )
        expect(interaction_report.locator(".pretty-interaction-backend")).to_have_value("native")
        expect(interaction_report.locator(".pretty-interaction-phase")).to_have_value(
            "executeMs"
        )
        assert interaction_report.locator(".pretty-interaction-chart").count() == 4
        interaction_report.locator(".pretty-corpus-close").click()
        expect(interaction_report).not_to_be_visible()

        controls.locator(".pretty-repeated-run").click()
        repeated_report = page.locator(".pretty-repeated-overlay")
        expect(repeated_report).to_be_visible()
        expect(repeated_report.locator(".pretty-corpus-result")).to_contain_text(
            "800 repeated calls checked without mismatch"
        )
        assert repeated_report.locator(".pretty-repeated-summary tr").count() == 6
        assert repeated_report.locator(".pretty-repeated-workloads tr").count() == 6
        repeated_report.locator(".pretty-corpus-close").click()
        expect(repeated_report).not_to_be_visible()


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
