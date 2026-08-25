#!/usr/bin/env python3
"""Smoke the narrow VIR prettyM integration through the ordinary demo deck."""

from __future__ import annotations

import argparse
import asyncio
import shutil

from playwright.async_api import async_playwright


async def slide_index(page, title: str) -> int:
    return await page.evaluate(
        """title => [...document.querySelectorAll('.slides > section')]
          .findIndex(slide => slide.querySelector('h1, h2, h3')?.textContent.trim() === title)""",
        title,
    )


async def exercise(page, url: str) -> None:
    await page.goto(url, wait_until="networkidle")
    await page.wait_for_function(
        "() => window.versoVir?.call !== undefined",
        timeout=60_000,
    )
    assert await page.evaluate("typeof window.prettyM") == "undefined"
    assert await page.evaluate("typeof window.formatToHtml") == "function"
    assert await page.evaluate("window.versoVir.call !== undefined")

    index = await slide_index(page, "Proof with rw Steps")
    assert index >= 0
    await page.evaluate("index => Reveal.slide(index)", index)
    await page.wait_for_function("index => Reveal.getIndices().h === index", arg=index)
    block = page.locator(".slides > section").nth(index).locator(".code-with-panel").first
    panel = block.locator(".info-panel")
    await block.locator(".tactic:visible .keyword:visible").first.click()
    await panel.locator(".goal .reflowed").first.wait_for(timeout=30_000)
    assert await panel.locator(".goal").count() >= 1
    assert await panel.locator(".reflowed .token").count() >= 1


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:18341")
    args = parser.parse_args()
    errors: list[str] = []

    async with async_playwright() as playwright:
        chrome = shutil.which("google-chrome")
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=chrome if chrome else None,
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: errors.append(str(error)))
        await exercise(page, args.url)
        await page.reload(wait_until="networkidle")
        await exercise(page, args.url)
        assert not errors, errors
        await browser.close()

    print("PASS: typed VIR prettyM call, styled panel output, and reload")


if __name__ == "__main__":
    asyncio.run(main())
