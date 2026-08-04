#!/usr/bin/env python3
"""Browser smoke test for the standalone five-backend demo."""

import argparse
import asyncio

from playwright.async_api import async_playwright


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:18333")
    args = parser.parse_args()
    browser_errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: browser_errors.append(str(error)))
        await page.goto(args.url, wait_until="networkidle")
        await page.wait_for_selector("[data-vir-pretty-demo] .vir-pretty-card")
        await page.wait_for_function(
            """() => ['js', 'vir', 'vir-format', 'native', 'llvm'].every(id => {
              const backend = getPrettyBackend(id);
              return backend && (!backend.status || backend.status() === 'ready');
            })""",
            timeout=60_000,
        )
        await page.locator("[data-vir-pretty-demo] button", has_text="Render").click()

        assert await page.evaluate("crossOriginIsolated") is True
        assert await page.locator(".vir-pretty-card").count() == 5
        badges = await page.locator(".vir-pretty-parity").all_text_contents()
        assert badges == ["reference", "exact", "exact", "exact", "exact"], badges
        outputs = await page.locator(".vir-pretty-output").all_text_contents()
        assert len(set(outputs)) == 1, outputs

        await page.locator("[data-case]").select_option("tags")
        await page.locator("[data-width]").fill("18")
        await page.locator("[data-run-scaling]").click()
        await page.wait_for_selector(".vir-pretty-chart")
        await page.wait_for_function(
            "() => window.__virPrettyDemoReports && window.__virPrettyDemoReports.length > 0"
        )
        report = await page.evaluate("window.__virPrettyDemoReports.at(-1)")
        assert len(report["series"]) == 5, report
        assert all(len(series["points"]) == 6 for series in report["series"]), report
        assert not browser_errors, browser_errors
        await browser.close()

    print("PASS standalone vanilla Verso five-backend browser smoke")


if __name__ == "__main__":
    asyncio.run(main())
