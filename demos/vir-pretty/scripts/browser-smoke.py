#!/usr/bin/env python3
"""Browser smoke test for the full standalone pretty-printer panel demo."""

import argparse
import asyncio

from playwright.async_api import async_playwright


BASE_BACKEND_IDS = ["js", "vir", "vir-format", "vir-flat", "vir-resident", "native", "llvm"]
IMPLEMENTATION_IDS = ["js", "vir-format", "native", "llvm"]


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:18332")
    args = parser.parse_args()
    page_errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        await page.goto(args.url, wait_until="networkidle")
        backend_ids = list(BASE_BACKEND_IDS)
        if await page.evaluate("getPrettyBackend('native-flat') !== null"):
            backend_ids.insert(backend_ids.index("native") + 1, "native-flat")
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
        assert await controls.locator("summary").inner_text() == (
            f"Formatters {len(IMPLEMENTATION_IDS)}/{len(backend_ids)} · End-to-end implementations"
        )
        await controls.locator("summary").click()
        assert await controls.locator(".pretty-controls-backend").count() == len(backend_ids)
        assert await controls.locator(".pretty-controls-status.status-ready").count() == len(backend_ids)
        assert await controls.locator("button").count() == 0

        experiment = controls.locator(".pretty-controls-experiment select")
        assert await experiment.input_value() == "implementations"
        checked = await controls.locator(".pretty-controls-backend input:checked").evaluate_all(
            "els => els.map(el => el.value)"
        )
        assert checked == IMPLEMENTATION_IDS
        await experiment.select_option("vir-output")
        checked = await controls.locator(".pretty-controls-backend input:checked").evaluate_all(
            "els => els.map(el => el.value)"
        )
        assert checked == ["vir-format", "vir-flat"]
        assert "prettyExperiment=vir-output" in page.url
        assert "typed input held fixed" in await controls.locator(
            ".pretty-controls-question"
        ).inner_text()
        if "native-flat" in backend_ids:
            await experiment.select_option("fir-output")
            checked = await controls.locator(
                ".pretty-controls-backend input:checked"
            ).evaluate_all("els => els.map(el => el.value)")
            assert checked == ["native", "native-flat"]
        await experiment.select_option("all")
        assert await controls.locator("summary").inner_text() == (
            f"Formatters {len(backend_ids)}/{len(backend_ids)} · All backends"
        )

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
            f"el => el.querySelectorAll('.pretty-compare-pane').length === {len(backend_ids)}",
            arg=await block.element_handle(),
            timeout=30_000,
        )
        assert await panes.count() == len(backend_ids)
        assert await panes.evaluate_all(
            "els => els.map(el => el.dataset.prettyBackend)"
        ) == backend_ids
        assert await block.locator('[data-pretty-backend="vir-flat"]').get_attribute(
            "data-pretty-input"
        ) == "lean-format"
        assert await block.locator('[data-pretty-backend="vir-resident"]').get_attribute(
            "data-pretty-input"
        ) == "resident-id"
        timing_titles = await panes.locator(".pretty-compare-time").evaluate_all(
            "els => els.map(el => el.title)"
        )
        assert all("Marshal:" in title and "Execute:" in title for title in timing_titles)

        workload = controls.locator(".pretty-controls-workload select")
        assert await workload.input_value() == "0"
        await workload.select_option("256")
        timing_titles = await panes.locator(".pretty-compare-time").evaluate_all(
            "els => els.map(el => el.title)"
        )
        assert all("Workload:" in title and "code points across" in title for title in timing_titles)
        assert "prettyWorkload=256" in page.url

        timing_display = controls.locator(".pretty-controls-timing select")
        assert await timing_display.input_value() == "total"
        await timing_display.select_option("execute")
        timing_texts = await panes.locator(".pretty-compare-time").all_inner_texts()
        assert all(text.startswith("Execute · ") for text in timing_texts)
        await timing_display.select_option("tracks")
        total_texts = await panes.locator(".pretty-timing-tracks-total").all_inner_texts()
        assert len(total_texts) == len(backend_ids)
        assert all("Total" in text and "ms" in text for text in total_texts)
        assert await panes.locator(".pretty-timing-track").count() == 4 * len(backend_ids)
        assert "prettyTiming=tracks" in page.url

        llvm_toggle = controls.locator('input[value="llvm"]')
        await llvm_toggle.uncheck()
        await page.wait_for_function(
            f"el => el.querySelectorAll('.pretty-compare-pane').length === {len(backend_ids) - 1}",
            arg=await block.element_handle(),
        )
        await llvm_toggle.check()
        shared_columns = controls.locator(".pretty-controls-columns input")
        await shared_columns.fill("32")
        await shared_columns.press("Tab")
        assert await shared_columns.input_value() == "32"

        assert await page.evaluate("typeof runPrettyDifferentialCorpus") == "undefined"
        assert not page_errors, page_errors
        await browser.close()

    print("PASS full vanilla Verso seven-backend panel smoke")


if __name__ == "__main__":
    asyncio.run(main())
