#!/usr/bin/env python3
"""Smoke the resident VIR component through Verso Slides' ordinary panel."""

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


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:18332")
    args = parser.parse_args()
    page_errors: list[str] = []

    async with async_playwright() as playwright:
        chrome = shutil.which("google-chrome")
        browser = await playwright.chromium.launch(
            headless=True, executable_path=chrome if chrome else None
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        await page.goto(args.url, wait_until="networkidle")
        await page.wait_for_function(
            "() => window.__versoVirPanel?.status === 'ready'",
            timeout=60_000,
        )
        # Exercise the path a human sees after revisiting/reloading a served deck.
        await page.reload(wait_until="networkidle")
        await page.wait_for_function(
            "() => window.__versoVirPanel?.status === 'ready'",
            timeout=60_000,
        )
        assert await page.evaluate("typeof window.__versoPanelRenderer?.render") == "function"
        assert await page.locator(".pretty-controls").count() == 0
        has_js_fallback = await page.evaluate(
            """() => {
              window.__productionPanelFallback = {
                goalsToHtml: window.goalsToHtml,
                formatToHtml: window.formatToHtml
              };
              const present = typeof window.goalsToHtml === 'function'
                && typeof window.formatToHtml === 'function';
              window.goalsToHtml = undefined;
              window.formatToHtml = undefined;
              return present;
            }"""
        )

        proof_index = await slide_index(page, "Proof")
        assert proof_index >= 0
        await page.evaluate("index => Reveal.slide(index)", proof_index)
        block = page.locator(".slides > section").nth(proof_index).locator(
            ".code-with-panel"
        ).first
        panel = block.locator(".info-panel")
        await page.evaluate("window.__versoVirPanel.calls.length = 0")
        await block.locator(".tactic .keyword").first.click()
        try:
            await page.wait_for_function(
                """el => el.querySelector('.goal [data-binding]') && window.__versoVirPanel.calls
                  .filter(call => call.kind === 'mount').length >= 2""",
                arg=await panel.element_handle(),
                timeout=30_000,
            )
        except Exception as error:
            diagnostic = await page.evaluate(
                """panel => ({
                  revealReady: Reveal.isReady(),
                  renderer: typeof window.__versoPanelRenderer?.render,
                  virStatus: window.__versoVirPanel?.status,
                  calls: window.__versoVirPanel?.calls,
                  panelHtml: panel.innerHTML,
                  sourceCount: document.querySelectorAll('.tactic .keyword').length
                })""",
                arg=await panel.element_handle(),
            )
            raise AssertionError({"browser": diagnostic, "pageErrors": page_errors}) from error
        assert await panel.locator(".reflowed").count() >= 1
        binding_count = await panel.locator("[data-binding]").count()
        assert binding_count >= 1, await panel.inner_html()
        assert await panel.get_attribute("data-vir-panel-component") is None

        first_calls = await page.evaluate(
            """() => window.__versoVirPanel.calls
              .filter(call => call.kind === 'mount').slice(0, 2)
              .map(call => ({widths: call.widths, measureOnly: call.measureOnly}))"""
        )
        assert first_calls[0] == {"widths": [], "measureOnly": True}
        assert len(first_calls[1]["widths"]) >= 1
        assert first_calls[1]["measureOnly"] is False

        before_resize = await page.evaluate(
            """() => ({
              calls: window.__versoVirPanel.calls.filter(call => call.kind === 'mount').length,
              widths: window.__versoVirPanel.calls.filter(call => call.kind === 'mount').at(-1).widths
            })"""
        )
        block_box = await block.bounding_box()
        divider_box = await block.locator(".panel-divider").bounding_box()
        assert block_box is not None and divider_box is not None
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
              const mounts = window.__versoVirPanel.calls.filter(call => call.kind === 'mount');
              return mounts.length > before.calls
                && JSON.stringify(mounts.at(-1).widths) !== JSON.stringify(before.widths);
            }""",
            arg=before_resize,
            timeout=5_000,
        )
        assert await panel.locator(".goal").count() >= 1

        dark_index = await slide_index(page, "Dark Code")
        assert dark_index >= 0
        await page.evaluate("index => Reveal.slide(index)", dark_index)
        dark_block = page.locator(".slides > section").nth(dark_index).locator(
            ".code-with-panel"
        ).first
        dark_panel = dark_block.locator(".info-panel")
        calls_before_signature = await page.evaluate(
            "window.__versoVirPanel.calls.filter(call => call.kind === 'mount').length"
        )
        await dark_block.locator("[data-verso-hover]").first.click()
        await page.wait_for_function(
            """([el, before]) => el.querySelector('code[data-rich-format] .reflowed')
              && window.__versoVirPanel.calls.filter(call => call.kind === 'mount').length >= before + 2""",
            arg=[await dark_panel.element_handle(), calls_before_signature],
            timeout=30_000,
        )
        await page.evaluate(
            "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
        )

        # Removing the optional renderer must leave the built-in path usable.
        await page.evaluate(
            """panel => {
              window.__versoPanelRenderer.release(panel);
              delete window.__versoPanelRenderer;
              window.goalsToHtml = window.__productionPanelFallback.goalsToHtml;
              window.formatToHtml = window.__productionPanelFallback.formatToHtml;
            }""",
            arg=await dark_panel.element_handle(),
        )
        calls_before_fallback = await page.evaluate(
            "window.__versoVirPanel.calls.filter(call => call.kind === 'mount').length"
        )
        await dark_block.locator("[data-verso-hover]").first.click()
        fallback_selector = (
            "code[data-rich-format] .reflowed"
            if has_js_fallback
            else "code[data-rich-format]"
        )
        await dark_panel.locator(fallback_selector).wait_for()
        calls_after_fallback = await page.evaluate(
            "window.__versoVirPanel.calls.filter(call => call.kind === 'mount').length"
        )
        assert calls_after_fallback == calls_before_fallback, await page.evaluate(
            "window.__versoVirPanel.calls"
        )
        assert not page_errors, page_errors
        await browser.close()

    print(
        "PASS ordinary panel VIR renderer without JS semantic formatters, "
        "plus reload, resize, signature, and fallback"
    )


if __name__ == "__main__":
    asyncio.run(main())
