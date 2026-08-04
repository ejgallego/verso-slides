#!/usr/bin/env python3
"""Browser smoke test for the full standalone five-backend panel demo."""

import argparse
import asyncio

from playwright.async_api import async_playwright


BACKEND_IDS = ["js", "vir", "vir-format", "native", "llvm"]


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
        await page.wait_for_function(
            """ids => ids.every(id => {
              const backend = getPrettyBackend(id);
              return backend && (!backend.status || backend.status() === 'ready');
            })""",
            arg=BACKEND_IDS,
            timeout=60_000,
        )

        controls = page.locator(".pretty-controls")
        await controls.wait_for(state="visible")
        assert await controls.locator("summary").inner_text() == "Formatters 5/5"
        await controls.locator("summary").click()
        assert await controls.locator(".pretty-controls-backend").count() == 5
        assert await controls.locator(".pretty-controls-status.status-ready").count() == 5
        for selector in [
            ".pretty-suite-run",
            ".pretty-corpus-run",
            ".pretty-scaling-run",
            ".pretty-repeated-run",
            ".pretty-memory-run",
            ".pretty-interaction-run",
            ".pretty-dashboard-load",
        ]:
            assert await controls.locator(selector).count() == 1, selector

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
            "el => el.querySelectorAll('.pretty-compare-pane').length === 5",
            arg=await block.element_handle(),
            timeout=30_000,
        )
        assert await panes.count() == 5
        assert await panes.evaluate_all(
            "els => els.map(el => el.dataset.prettyBackend)"
        ) == BACKEND_IDS
        timing_titles = await panes.locator(".pretty-compare-time").evaluate_all(
            "els => els.map(el => el.title)"
        )
        assert all("Marshal:" in title and "Execute:" in title for title in timing_titles)

        llvm_toggle = controls.locator('input[value="llvm"]')
        await llvm_toggle.uncheck()
        await page.wait_for_function(
            "el => el.querySelectorAll('.pretty-compare-pane').length === 4",
            arg=await block.element_handle(),
        )
        await llvm_toggle.check()
        shared_columns = controls.locator(".pretty-controls-columns input")
        await shared_columns.fill("32")
        await shared_columns.press("Tab")
        assert await shared_columns.input_value() == "32"

        report = await page.evaluate(
            """async ids => runPrettyDifferentialCorpus({
              backendIds: ids,
              warmup: 0,
              samples: 1,
              batchTargetMs: 0,
              maxBatchIterations: 1,
              scenarios: [{
                case: { id: 'smoke', label: 'smoke', format: [5, [4, 'a', [4, 1, 'b']]], origin: 'smoke' },
                width: 8
              }]
            })""",
            BACKEND_IDS,
        )
        assert report["passed"] is True, report
        assert report["backendIds"] == BACKEND_IDS
        assert report["parityCount"] == report["scenarioCount"] == 1
        assert not page_errors, page_errors
        await browser.close()

    print("PASS full vanilla Verso five-backend panel smoke")


if __name__ == "__main__":
    asyncio.run(main())
