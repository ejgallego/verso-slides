#!/usr/bin/env python3
"""Browser smoke test for the full standalone pretty-printer panel demo."""

import argparse
import asyncio
import shutil
from pathlib import Path

from playwright.async_api import async_playwright


BASE_BACKEND_IDS = [
    "js",
    "js-render",
    "js-html",
    "vir-format",
    "vir-semantic",
    "vir-html",
    "vir-flat",
    "vir-resident",
    "vir-render",
    "vir-dom",
    "native",
    "llvm",
]
HTML_IDS = ["js-html", "vir-html"]
SEMANTIC_IDS = ["js-render", "vir-semantic"]
LAYOUT_IDS = ["js", "vir-format", "native", "llvm"]


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:18332")
    args = parser.parse_args()
    page_errors: list[str] = []
    console_warnings: list[str] = []

    async with async_playwright() as playwright:
        chrome = shutil.which("google-chrome")
        browser = await playwright.chromium.launch(
            headless=True, executable_path=chrome if chrome else None
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "console",
            lambda message: console_warnings.append(message.text)
            if message.type in {"warning", "error"}
            else None,
        )
        await page.goto(args.url, wait_until="networkidle")
        backend_ids = list(BASE_BACKEND_IDS)
        html_ids = list(HTML_IDS)
        if await page.evaluate("getPrettyBackend('native-flat') !== null"):
            backend_ids.insert(backend_ids.index("native") + 1, "native-flat")
        native_html_available = await page.evaluate(
            "getPrettyBackend('native-html') !== null"
        )
        if native_html_available:
            backend_ids.insert(backend_ids.index("native") + 1, "native-html")
            html_ids.append("native-html")
        await page.wait_for_function(
            """ids => ids.every(id => {
              const backend = getPrettyBackend(id);
              return backend && (!backend.status || backend.status() === 'ready');
            })""",
            arg=backend_ids,
            timeout=60_000,
        )

        controls = page.locator(".pretty-controls")
        await controls.wait_for(state="visible")
        assert await controls.locator(":scope > summary").inner_text() == (
            f"Pipeline · HTML rendering · {len(html_ids)}/4 backends"
        )
        await controls.locator(":scope > summary").click()
        matrix = controls.locator(".pretty-matrix")
        assert await matrix.locator(".pretty-matrix-cell").count() == 12
        assert await matrix.locator(".pretty-matrix-cell.is-unsupported").count() == (
            3 if native_html_available else 4
        )
        assert await matrix.locator(".pretty-matrix-cell.is-current").count() == 4
        assert await matrix.locator(".pretty-matrix-cell.is-included").count() == len(
            html_ids
        )
        assert await matrix.locator(
            '.pretty-matrix-cell.is-current.is-unsupported'
        ).count() == (1 if native_html_available else 2)
        matrix_registry = await page.evaluate(
            """() => ({
              primaryLayout: getPrettyMatrixBackend('vir', 'layout').id,
              virLayout: getPrettyMatrixBackends('vir', 'layout').map(x => x.id),
              virSemantic: getPrettyMatrixBackends('vir', 'semantic').map(x => x.id),
              legacyJsonRegistered: getPrettyBackend('vir') !== null,
              legacyJsonInMatrix: getPrettyMatrixBackends('vir', 'layout')
                .some(x => x.id === 'vir')
            })"""
        )
        assert matrix_registry == {
            "primaryLayout": "vir-format",
            "virLayout": ["vir-format", "vir-flat", "vir-resident"],
            "virSemantic": ["vir-semantic", "vir-render", "vir-dom"],
            "legacyJsonRegistered": False,
            "legacyJsonInMatrix": False,
        }
        vir_layout_cell = matrix.locator(
            '.pretty-matrix-cell[data-pretty-backend="vir"]'
            '[data-pretty-breadth="layout"]'
        )
        assert await vir_layout_cell.locator(".pretty-matrix-choice").evaluate_all(
            "els => els.map(el => el.dataset.prettyCandidate)"
        ) == ["vir-format", "vir-flat", "vir-resident"]
        vir_variant_names = await vir_layout_cell.locator(
            ".pretty-matrix-choice.is-variant .pretty-matrix-candidate"
        ).all_inner_texts()
        assert vir_variant_names == ["VIR Flat", "VIR Resident"]
        fir_layout_cell = matrix.locator(
            '.pretty-matrix-cell[data-pretty-backend="fir"]'
            '[data-pretty-breadth="layout"]'
        )
        assert await fir_layout_cell.locator(".pretty-matrix-choice").evaluate_all(
            "els => els.map(el => el.dataset.prettyCandidate)"
        ) == ["native", "native-flat"]
        assert "FIR Wasm Flat" in await fir_layout_cell.inner_text()
        fir_html_cell = matrix.locator(
            '.pretty-matrix-cell[data-pretty-backend="fir"]'
            '[data-pretty-breadth="html"]'
        )
        if native_html_available:
            assert await fir_html_cell.locator(".pretty-matrix-choice").evaluate_all(
                "els => els.map(el => el.dataset.prettyCandidate)"
            ) == ["native-html"]
            assert "FIR Wasm HTML" in await fir_html_cell.inner_text()
        included = await matrix.locator(".pretty-matrix-cell.is-included").evaluate_all(
            "els => els.map(el => el.dataset.prettyBackend)"
        )
        assert included == (["js", "vir", "fir"] if native_html_available else ["js", "vir"])
        boundary = controls.locator(".pretty-matrix-boundary")
        assert "escaping" in await boundary.locator(".pretty-controls-question").inner_text()

        lab = controls.locator(".pretty-controls-lab")
        assert await lab.get_attribute("open") is None
        await lab.locator(":scope > summary").click()
        assert await controls.locator(".pretty-controls-backend").count() == len(backend_ids)
        assert await controls.locator(".pretty-controls-status.status-ready").count() >= len(
            backend_ids
        )

        experiment = controls.locator(".pretty-controls-experiment select")
        options = await experiment.locator("option").evaluate_all("els => els.map(el => el.value)")
        assert "vir-transport" not in options
        assert "fir-output" in options
        await fir_layout_cell.locator('[data-pretty-candidate="native-flat"]').click()
        checked = await controls.locator(".pretty-controls-backend input:checked").evaluate_all(
            "els => els.map(el => el.value)"
        )
        assert checked == ["native", "native-flat"]
        assert "prettyExperiment=fir-output" in page.url
        assert "direct flat text/style events" in await controls.locator(
            ".pretty-controls-question"
        ).inner_text()

        await experiment.select_option("vir-output")
        checked = await controls.locator(".pretty-controls-backend input:checked").evaluate_all(
            "els => els.map(el => el.value)"
        )
        assert checked == ["vir-format", "vir-flat"]
        assert "prettyExperiment=vir-output" in page.url
        assert "typed input held fixed" in await controls.locator(
            ".pretty-controls-question"
        ).inner_text()
        boundary = controls.locator(".pretty-controls-boundary")
        assert await boundary.get_attribute("data-design") == "controlled"
        facts = await boundary.locator("dl > div").all_inner_texts()
        assert any("CHANGES" in fact and "Output representation" in fact for fact in facts)
        assert any("HELD FIXED" in fact and "VIR runtime" in fact for fact in facts)
        selected_rows = controls.locator(".pretty-controls-backend:has(input:checked)")
        assert await selected_rows.locator(".pretty-controls-dimension.is-variable").count() == 2
        assert await selected_rows.locator(
            '.pretty-controls-dimension.is-variable .pretty-controls-dimension-name'
        ).all_inner_texts() == ["OUTPUT", "OUTPUT"]

        await matrix.locator('[data-pretty-breadth="html"]').first.click()
        assert "prettyMode=matrix" in page.url
        assert "prettyBreadth=html" in page.url

        proof_index = await page.evaluate(
            """() => [...document.querySelectorAll('.slides > section')]
              .findIndex(slide => slide.querySelector('h1, h2, h3')?.textContent.trim() === 'Proof')"""
        )
        assert proof_index >= 0
        await page.evaluate("index => Reveal.slide(index)", proof_index)
        slide = page.locator(".slides > section").nth(proof_index)
        block = slide.locator(".code-with-panel").first
        await block.locator(".tactic .keyword").first.click()
        panes = block.locator(".pretty-compare-pane")
        await page.wait_for_function(
            f"el => el.querySelectorAll('.pretty-compare-pane').length === {len(html_ids)}",
            arg=await block.element_handle(),
            timeout=30_000,
        )
        assert await panes.evaluate_all("els => els.map(el => el.dataset.prettyBackend)") == html_ids
        assert await block.locator('[data-pretty-backend="vir-html"]').get_attribute(
            "data-pretty-output"
        ) == "html"
        assert await block.locator('[data-pretty-backend="vir-html"]').get_attribute(
            "data-pretty-input"
        ) == "lean-format"
        assert await block.locator('[data-pretty-backend="vir-html"]').get_attribute(
            "data-pretty-materializer"
        ) == "html-string"
        js_html = await block.locator(
            '[data-pretty-backend="js-html"] .pretty-compare-body'
        ).inner_html()
        vir_html = await block.locator(
            '[data-pretty-backend="vir-html"] .pretty-compare-body'
        ).inner_html()
        assert vir_html == js_html, (
            "VIR complete HTML differs from JavaScript complete HTML\n"
            f"JavaScript: {js_html!r}\n"
            f"VIR: {vir_html!r}\n"
            f"Console: {console_warnings!r}"
        )
        if native_html_available:
            fir_html = await block.locator(
                '[data-pretty-backend="native-html"] .pretty-compare-body'
            ).inner_html()
            assert fir_html == js_html, (
                "FIR complete HTML differs from JavaScript complete HTML\n"
                f"JavaScript: {js_html!r}\n"
                f"FIR: {fir_html!r}\n"
                f"Console: {console_warnings!r}"
            )

        await matrix.locator(
            '.pretty-matrix-breadth[data-pretty-breadth="semantic"]'
        ).click()
        await page.wait_for_function(
            "el => [...el.querySelectorAll('.pretty-compare-pane')].map(x => x.dataset.prettyBackend).join(',') === 'js-render,vir-semantic'",
            arg=await block.element_handle(),
        )
        assert await panes.evaluate_all(
            "els => els.map(el => el.dataset.prettyBackend)"
        ) == SEMANTIC_IDS
        semantic_html = await panes.locator(".pretty-compare-body").evaluate_all(
            "els => els.map(el => el.innerHTML)"
        )
        assert semantic_html[0] == semantic_html[1]

        await matrix.locator(
            '.pretty-matrix-breadth[data-pretty-breadth="layout"]'
        ).click()
        await page.wait_for_function(
            "el => [...el.querySelectorAll('.pretty-compare-pane')].map(x => x.dataset.prettyBackend).join(',') === 'js,vir-format,native,llvm'",
            arg=await block.element_handle(),
        )
        assert await panes.evaluate_all(
            "els => els.map(el => el.dataset.prettyBackend)"
        ) == LAYOUT_IDS
        assert await matrix.locator(
            ".pretty-matrix-cell.is-current.is-unsupported"
        ).count() == 0

        await matrix.locator(
            '.pretty-matrix-breadth[data-pretty-breadth="html"]'
        ).click()
        expected_html_ids = ",".join(html_ids)
        await page.wait_for_function(
            f"el => [...el.querySelectorAll('.pretty-compare-pane')].map(x => x.dataset.prettyBackend).join(',') === '{expected_html_ids}'",
            arg=await block.element_handle(),
        )
        parity = await panes.locator(".pretty-compare-parity").evaluate_all(
            "els => els.map(el => el.dataset.outputParity)"
        )
        assert parity == ["equivalent"] * len(html_ids)
        timing_titles = await panes.locator(".pretty-compare-time").evaluate_all(
            "els => els.map(el => el.title)"
        )
        assert all(
            "Marshal:" in title and "Backend execute (layout + owned output):" in title
            for title in timing_titles
        )

        workload = controls.locator(".pretty-controls-workload select")
        assert await workload.input_value() == "0"
        await workload.select_option("256")
        timing_titles = await panes.locator(".pretty-compare-time").evaluate_all(
            "els => els.map(el => el.title)"
        )
        assert all("Workload:" in title and "code points across" in title for title in timing_titles)
        assert "prettyWorkload=256" in page.url

        timing_display = controls.locator(".pretty-controls-timing select")
        timing_scope = controls.locator(".pretty-controls-timing-scope")
        assert await timing_display.input_value() == "tracks"
        await timing_display.select_option("total")
        assert "equivalent populated DOM" in await timing_scope.inner_text()
        await timing_display.select_option("execute")
        assert "declared endpoint" in await timing_scope.inner_text()
        timing_texts = await panes.locator(".pretty-compare-time").all_inner_texts()
        assert all(text.startswith("Execute · ") for text in timing_texts)
        await timing_display.select_option("tracks")
        total_texts = await panes.locator(".pretty-timing-tracks-total").all_inner_texts()
        assert len(total_texts) == len(html_ids)
        assert all("Total" in text and "ms" in text for text in total_texts)
        assert await panes.locator(".pretty-timing-track").count() == 5 * len(html_ids)
        assert "prettyTiming=tracks" in page.url

        vir_toggle = matrix.locator('.pretty-matrix-backend input[value="vir"]')
        await vir_toggle.uncheck()
        await page.wait_for_function(
            f"el => el.querySelectorAll('.pretty-compare-pane').length === {len(html_ids) - 1}",
            arg=await block.element_handle(),
        )
        await matrix.locator('.pretty-matrix-backend input[value="vir"]').check()
        shared_columns = controls.locator(".pretty-controls-columns input")
        await shared_columns.fill("32")
        await shared_columns.press("Tab")
        assert await shared_columns.input_value() == "32"

        await page.wait_for_function(
            "() => window.__versoVirPanel?.status === 'ready'",
            timeout=60_000,
        )
        await page.add_script_tag(
            path=str(Path(__file__).with_name("panel-parity-corpus.js"))
        )
        corpus = await page.evaluate("runVirPanelParityCorpus()")
        assert corpus["contents"] == 59
        assert corpus["goalContents"] == 17, corpus
        assert corpus["signatureContents"] == 42, corpus
        assert corpus["widths"] == [12, 40, 80, 20, 120, 1, 240, 32], corpus
        assert corpus["cases"] == 59 * len(corpus["widths"])
        assert corpus["failures"] == [], corpus["failures"]
        geometry = await page.evaluate("runVirPanelGeometryCorpus()")
        assert geometry["goalContents"] == 17, geometry
        assert geometry["panelWidths"] == [240, 360, 520, 760], geometry
        assert geometry["cases"] == 68, geometry
        assert geometry["multiWidthCases"] == 64, geometry
        assert geometry["maxCellSpread"] == 6, geometry
        assert geometry["widthVectorMismatchCases"] == 0, geometry
        assert geometry["scalarDifferingCases"] == 14, geometry
        assert geometry["contentMeasuredVectorDifferingCases"] == 7, geometry
        assert geometry["differingCases"] == 3, geometry
        assert [
            (failure["id"], failure["panelWidth"])
            for failure in geometry["failures"]
        ] == [(14, 240), (15, 240), (16, 240)], geometry["failures"]
        component_toggle = controls.locator(
            ".pretty-controls-toggle", has_text="VIR panel component"
        ).locator("input")
        assert not await component_toggle.is_disabled()
        await page.evaluate("window.__versoVirPanel.calls.length = 0")
        await component_toggle.check()
        assert "virPanel=1" in page.url
        panel = block.locator(".info-panel")
        await page.wait_for_function(
            "el => el.dataset.virPanelComponent === 'mounted' && !!el.dataset.virPanelColumns",
            arg=await panel.element_handle(),
            timeout=30_000,
        )
        assert await panel.locator(".goal").count() >= 1
        assert await panel.locator(".reflowed").count() >= 1
        assert await panel.locator("[data-binding]").count() >= 1
        assert await panel.locator(".pretty-compare-pane").count() == 0
        resident_boundary = await page.evaluate(
            """() => ({
              status: window.__versoVirPanel.status,
              contentId: Number(document.querySelector('.info-panel[data-vir-panel-content]')
                ?.dataset.virPanelContent),
              columns: Number(document.querySelector('.info-panel[data-vir-panel-columns]')
                ?.dataset.virPanelColumns),
              packageCount: window.__versoVirPanel.runtime.packageInfo.packageCount,
              interfaceExports: window.__versoVirPanel.runtime.packageInfo.interfaceExports,
              sharedRuntime: window.__versoVirPanel.runtime === window.__versoPrettyVir.runtime,
              totalMs: window.__versoVirPanel.lastCall.timings.totalMs
            })"""
        )
        assert resident_boundary["status"] == "ready"
        assert resident_boundary["contentId"] >= 0
        assert resident_boundary["columns"] >= 1
        assert resident_boundary["packageCount"] == 15
        assert resident_boundary["interfaceExports"] == 10
        assert resident_boundary["sharedRuntime"] is True
        assert resident_boundary["totalMs"] >= 0
        shared_policy = await page.evaluate(
            """async () => {
              const planner = await window.__versoRevealPolicyBackend;
              const commands = planner.plan({
                totalFrames: 12,
                steps: [{frame: 0, pause: false, loop: false}],
                pauseSteps: [],
                autoplay: false
              }, {kind: 'slideEntered', value: 0});
              return {
                sharedRuntime: planner.runtime === window.__versoVirPanel.runtime,
                command: commands[0].kind,
                frame: Number(commands[0].value)
              };
            }"""
        )
        assert shared_policy == {
            "sharedRuntime": True,
            "command": "seek",
            "frame": 0,
        }
        first_boundary = await page.evaluate(
            """() => window.__versoVirPanel.calls
              .filter(call => call.kind === 'mount')
              .slice(0, 2)
              .map(call => ({
                width: call.width,
                widths: call.widths,
                measureOnly: call.measureOnly,
                ...call.timings
              }))"""
        )
        assert len(first_boundary) == 2
        assert first_boundary[0]["width"] == 0
        assert first_boundary[0]["widths"] == []
        assert first_boundary[0]["measureOnly"] is True
        assert first_boundary[1]["width"] >= 1
        assert len(first_boundary[1]["widths"]) >= 1
        assert first_boundary[1]["measureOnly"] is False

        # Exercise the production resize path rather than calling the bridge
        # directly: divider drag -> CSS grid resize -> ResizeObserver -> remount.
        await page.wait_for_timeout(250)
        resize_before = await page.evaluate(
            """() => ({
              columns: Number(document.querySelector('.info-panel[data-vir-panel-columns]')
                ?.dataset.virPanelColumns),
              calls: window.__versoVirPanel.calls.filter(call => call.kind === 'mount').length
            })"""
        )
        block_box = await block.bounding_box()
        divider_box = await block.locator(".panel-divider").bounding_box()
        assert block_box is not None
        assert divider_box is not None
        await page.mouse.move(
            divider_box["x"] + divider_box["width"] / 2,
            divider_box["y"] + divider_box["height"] / 2,
        )
        await page.mouse.down()
        await page.mouse.move(
            block_box["x"] + block_box["width"] * 0.75,
            divider_box["y"] + divider_box["height"] / 2,
        )
        await page.mouse.up()
        await page.wait_for_function(
            """before => {
              const panel = document.querySelector('.info-panel[data-vir-panel-columns]');
              const calls = window.__versoVirPanel.calls
                .filter(call => call.kind === 'mount').length;
              return Number(panel?.dataset.virPanelColumns) !== before.columns
                && calls > before.calls;
            }""",
            arg=resize_before,
            timeout=5_000,
        )
        resize_after = await page.evaluate(
            """() => ({
              columns: Number(document.querySelector('.info-panel[data-vir-panel-columns]')
                ?.dataset.virPanelColumns),
              call: window.__versoVirPanel.calls.filter(call => call.kind === 'mount').at(-1)
            })"""
        )
        assert resize_after["columns"] != resize_before["columns"]
        assert resize_after["call"]["width"] == resize_after["columns"]
        assert await panel.locator(".goal").count() >= 1
        assert await panel.locator(".reflowed").count() >= 1

        repeated_boundary = await page.evaluate(
            """() => {
              const bridge = window.__versoVirPanel;
              const panel = document.querySelector('.info-panel[data-vir-panel-content]');
              const contentId = Number(panel.dataset.virPanelContent);
              const columns = Number(panel.dataset.virPanelColumns);
              const samples = [];
              for (let i = 0; i < 31; i++) {
                if (!bridge.mount(panel, contentId, columns)) throw new Error('resident remount failed');
                if (i > 0) samples.push(bridge.lastCall.timings);
              }
              const median = key => {
                const values = samples.map(value => Number(value[key] || 0)).sort((a, b) => a - b);
                return values[Math.floor(values.length / 2)];
              };
              return {
                calls: samples.length,
                marshalMs: median('marshalMs'),
                executeMs: median('executeMs'),
                hostMs: median('hostMs'),
                decodeMs: median('decodeMs'),
                totalMs: median('totalMs')
              };
            }"""
        )
        assert repeated_boundary["calls"] == 30
        assert repeated_boundary["totalMs"] >= 0
        safe_width = await page.evaluate(
            """() => {
              const bridge = window.__versoVirPanel;
              const panel = document.querySelector('.info-panel[data-vir-panel-content]');
              const contentId = Number(panel.dataset.virPanelContent);
              if (!bridge.mount(panel, contentId, Number.POSITIVE_INFINITY)) {
                throw new Error('bounded-width remount failed');
              }
              return bridge.calls.at(-1).width;
            }"""
        )
        assert safe_width == 40

        dark_index = await page.evaluate(
            """() => [...document.querySelectorAll('.slides > section')]
              .findIndex(slide => slide.querySelector('h1, h2, h3')?.textContent.trim() === 'Dark Code')"""
        )
        assert dark_index >= 0
        await page.evaluate("index => Reveal.slide(index)", dark_index)
        dark_block = page.locator(".slides > section").nth(dark_index).locator(
            ".code-with-panel"
        ).first
        await dark_block.locator("[data-verso-hover]").first.click()
        panel = dark_block.locator(".info-panel")
        await page.wait_for_function(
            "el => el.dataset.virPanelComponent === 'mounted'",
            arg=await panel.element_handle(),
            timeout=30_000,
        )
        assert await panel.locator("code[data-rich-format] .reflowed").count() == 1

        await component_toggle.uncheck()
        await page.wait_for_function(
            "el => !el.dataset.virPanelComponent",
            arg=await panel.element_handle(),
        )
        assert "virPanel=0" in page.url

        assert await page.evaluate("typeof runPrettyDifferentialCorpus") == "undefined"
        assert not page_errors, page_errors
        await browser.close()

    print(
        "PASS backend × compiled-breadth panel smoke; "
        "resident component repeated median "
        f"first={first_boundary[0]['totalMs']:.3f} ms, "
        f"measured-remount={first_boundary[1]['totalMs']:.3f} ms, "
        f"total={repeated_boundary['totalMs']:.3f} ms, "
        f"execute={repeated_boundary['executeMs']:.3f} ms, "
        f"host={repeated_boundary['hostMs']:.3f} ms"
    )


if __name__ == "__main__":
    asyncio.run(main())
