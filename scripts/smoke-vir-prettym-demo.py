#!/usr/bin/env python3
"""Smoke the two-package, one-live-runtime VIR demo."""

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


async def exercise(page) -> None:
    await page.wait_for_function(
        "() => window.versoVir?.call !== undefined",
        timeout=60_000,
    )
    assert await page.evaluate("typeof window.prettyM") == "undefined"
    assert await page.evaluate("typeof window.formatToHtml") == "function"
    assert await page.evaluate("window.versoVir.call !== undefined")
    assert await page.evaluate("window.versoVirLifecycle.createRuntime") == 1
    assert await page.evaluate("window.versoVirLifecycle.startup") == 1
    assert await page.evaluate("window.versoVirLifecycle.dispose") == 0

    ranking_index = await slide_index(page, "One Runtime, Two Lean Packages")
    assert ranking_index >= 0
    await page.evaluate("index => Reveal.slide(index)", ranking_index)
    await page.wait_for_function(
        "index => Reveal.getIndices().h === index", arg=ranking_index
    )
    ranking = page.locator("[data-verso-vir-ranking][data-vir-ranking-ready='true']")
    await ranking.wait_for(timeout=30_000)
    assert await ranking.locator("li").all_text_contents() == [
        "semantic: API documentation (score 1.00)",
        "semantic: runtime guide (score 0.90)",
        "fullText: benchmark report (score 0.80)",
    ]

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


async def assert_composite_descriptor(page) -> None:
    descriptor = await page.evaluate(
        """async () => {
          const manifestUrl = new URL('vir-prettym/VIR_WEB_ASSETS.json', location.href);
          const assets = await (await fetch(manifestUrl)).json();
          const program = assets.programs[0];
          const packageSet = await (
            await fetch(new URL(program.descriptor, manifestUrl))
          ).json();
          return {
            programs: assets.programs.map(({id}) => id),
            packages: packageSet.packages.map(({path}) => path),
          };
        }"""
    )
    assert descriptor["programs"] == ["vir-prettym"]
    packages = descriptor["packages"]
    assert any("VersoSearch.ExperimentalRanking" in path for path in packages)
    assert any("VersoSlides.Pretty" in path for path in packages)


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
        await page.add_init_script(
            """const key = 'verso-vir-lifecycle-smoke';
            if (sessionStorage.getItem(key) === null) {
              sessionStorage.setItem(key, '[]');
            }
            window.addEventListener('verso-vir-lifecycle', ({detail}) => {
              const log = JSON.parse(sessionStorage.getItem(key) ?? '[]');
              log.push(detail);
              sessionStorage.setItem(key, JSON.stringify(log));
            });"""
        )
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(args.url, wait_until="networkidle")
        await exercise(page)
        await assert_composite_descriptor(page)
        assert await page.evaluate(
            "JSON.parse(sessionStorage.getItem('verso-vir-lifecycle-smoke'))"
        ) == ["createRuntime", "startup"]
        await page.reload(wait_until="networkidle")
        await exercise(page)
        assert await page.evaluate(
            "JSON.parse(sessionStorage.getItem('verso-vir-lifecycle-smoke'))"
        ) == ["createRuntime", "startup", "dispose", "createRuntime", "startup"]
        assert not errors, errors
        await browser.close()

    print("PASS: two visible package contributions, one runtime lifecycle, and reload")


if __name__ == "__main__":
    asyncio.run(main())
