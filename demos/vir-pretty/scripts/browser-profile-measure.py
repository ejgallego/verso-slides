#!/usr/bin/env python3
"""Measure one production-shaped panel profile in a real browser."""

import argparse
import asyncio
import gzip
import json
import shutil
import statistics
import time
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.async_api import Page, async_playwright


async def slide_index(page: Page, title: str) -> int:
    return await page.evaluate(
        """title => [...document.querySelectorAll('.slides > section')]
          .findIndex(slide => slide.querySelector('h1, h2, h3')?.textContent.trim() === title)""",
        title,
    )


async def render_once(page: Page, block, panel, target, vir: bool) -> dict:
    return await page.evaluate(
        """async ({block, panel, target, vir}) => {
          const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
          if (vir) window.__versoPanelRenderer.release(panel);
          block._activeSource = null;
          panel.innerHTML = '';
          const calls = vir ? window.__versoVirPanel.calls : [];
          const before = vir ? calls.filter(call => call.kind === 'mount').length : 0;
          const started = performance.now();
          target.click();
          const deadline = started + 30000;
          while (true) {
            const ready = vir
              ? panel.querySelector('.goal [data-binding]')
                && calls.filter(call => call.kind === 'mount').length >= before + 2
              : panel.querySelector('.goal .reflowed');
            if (ready) break;
            if (performance.now() > deadline) throw new Error('panel render timed out');
            await frame();
          }
          await frame();
          await frame();
          const mounts = vir
            ? calls.filter(call => call.kind === 'mount').slice(before)
                .map(call => ({measureOnly: call.measureOnly, timings: call.timings}))
            : [];
          return {wallMs: performance.now() - started, mounts};
        }""",
        {"block": block, "panel": panel, "target": target, "vir": vir},
    )


async def resize_once(page: Page, block, panel, vir: bool) -> dict:
    return await page.evaluate(
        """async ({block, panel, vir}) => {
          const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
          const calls = vir ? window.__versoVirPanel.calls : [];
          const before = vir ? calls.filter(call => call.kind === 'mount').length : 0;
          const marker = panel.querySelector('.goal');
          if (marker) marker.setAttribute('data-profile-resize-marker', '1');
          const started = performance.now();
          block.style.setProperty('--code-ratio', '0.7fr');
          block.style.setProperty('--panel-ratio', '0.3fr');
          const deadline = started + 30000;
          while (true) {
            const markerGone = !panel.querySelector('[data-profile-resize-marker]');
            const ready = vir
              ? panel.querySelector('.goal [data-binding]')
                && calls.filter(call => call.kind === 'mount').length >= before + 2
              : markerGone && panel.querySelector('.goal .reflowed');
            if (ready) break;
            if (performance.now() > deadline) throw new Error('panel resize timed out');
            await frame();
          }
          await frame();
          await frame();
          const mounts = vir
            ? calls.filter(call => call.kind === 'mount').slice(before)
                .map(call => ({measureOnly: call.measureOnly, timings: call.timings}))
            : [];
          return {wallMs: performance.now() - started, mounts};
        }""",
        {"block": block, "panel": panel, "vir": vir},
    )


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return ordered[round((len(ordered) - 1) * fraction)]


def timing_summary(samples: list[dict]) -> dict:
    walls = [sample["wallMs"] for sample in samples]
    result = {
        "samples": len(samples),
        "wallMs": {
            "median": statistics.median(walls),
            "p90": percentile(walls, 0.9),
            "min": min(walls),
            "max": max(walls),
        },
    }
    measured_calls = [
        mount["timings"]
        for sample in samples
        for mount in sample["mounts"]
        if not mount["measureOnly"]
    ]
    if measured_calls:
        result["measuredMountMs"] = {
            key: statistics.median([call[key] for call in measured_calls])
            for key in ["marshalMs", "executeMs", "decodeMs", "hostMs", "totalMs"]
        }
    return result


def file_set_metrics(site: Path, relative_paths: set[str]) -> dict:
    files = []
    raw = 0
    compressed = 0
    for relative in sorted(relative_paths):
        path = site / relative
        if not path.is_file():
            continue
        body = path.read_bytes()
        raw += len(body)
        compressed += len(gzip.compress(body, compresslevel=9, mtime=0))
        files.append(relative)
    return {"files": len(files), "rawBytes": raw, "gzipBytes": compressed, "paths": files}


def site_metrics(site: Path) -> dict:
    paths = {str(path.relative_to(site)) for path in site.rglob("*") if path.is_file()}
    return file_set_metrics(site, paths)


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("profile", choices=["js", "vir-fallback", "vir-only"])
    parser.add_argument("url")
    parser.add_argument("site", type=Path)
    parser.add_argument("--repetitions", type=int, default=9)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    vir = args.profile != "js"
    errors: list[str] = []

    async with async_playwright() as playwright:
        chrome = shutil.which("google-chrome")
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=chrome if chrome else None,
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: errors.append(str(error)))
        wall_started = time.perf_counter()
        await page.goto(args.url, wait_until="networkidle")
        await page.wait_for_function("Reveal.isReady()")
        if vir:
            await page.wait_for_function(
                "window.__versoVirPanel?.status === 'ready'", timeout=60_000
            )
        cold_ready_ms = (time.perf_counter() - wall_started) * 1000
        cdp = await page.context.new_cdp_session(page)
        await cdp.send("HeapProfiler.collectGarbage")
        heap_before = await cdp.send("Runtime.getHeapUsage")

        proof = await slide_index(page, "Proof")
        assert proof >= 0
        await page.evaluate("index => Reveal.slide(index)", proof)
        block_locator = page.locator(".slides > section").nth(proof).locator(
            ".code-with-panel"
        ).first
        panel_locator = block_locator.locator(".info-panel")
        target_locator = block_locator.locator(".tactic .keyword").first
        block = await block_locator.element_handle()
        panel = await panel_locator.element_handle()
        target = await target_locator.element_handle()
        assert block is not None and panel is not None and target is not None

        first = await render_once(page, block, panel, target, vir)
        repeated = [
            await render_once(page, block, panel, target, vir)
            for _ in range(args.repetitions)
        ]
        resized = await resize_once(page, block, panel, vir)
        await cdp.send("HeapProfiler.collectGarbage")
        heap_after = await cdp.send("Runtime.getHeapUsage")
        navigation = await page.evaluate(
            """() => {
              const nav = performance.getEntriesByType('navigation')[0];
              return nav ? {domContentLoadedMs: nav.domContentLoadedEventEnd,
                loadMs: nav.loadEventEnd, durationMs: nav.duration} : null;
            }"""
        )
        startup = (
            await page.evaluate("window.__versoPrettyVir?.startupTimings || null")
            if vir
            else None
        )
        resource_urls = await page.evaluate(
            "performance.getEntriesByType('resource').map(entry => entry.name)"
        )
        await browser.close()

    origin = urlparse(args.url)
    loaded_paths = {"index.html"}
    for url in resource_urls:
        parsed = urlparse(url)
        if parsed.netloc == origin.netloc:
            relative = unquote(parsed.path).lstrip("/")
            if relative:
                loaded_paths.add(relative)
    pipeline_paths = {
        path
        for path in loaded_paths
        if path in {"index.html", "lib/pretty.js", "lib/panel.js"}
        or path.startswith("vir-pretty/")
    }
    js_paths = {path for path in loaded_paths if path.endswith((".js", ".mjs"))}
    result = {
        "profile": args.profile,
        "cold": {
            "readyWallMs": cold_ready_ms,
            "navigation": navigation,
            "virStartup": startup,
        },
        "render": {
            "first": timing_summary([first]),
            "repeated": timing_summary(repeated),
            "resize": timing_summary([resized]),
        },
        "memory": {
            "before": heap_before,
            "after": heap_after,
            "usedHeapDeltaBytes": heap_after["usedSize"] - heap_before["usedSize"],
            "backingStorageDeltaBytes": heap_after.get("backingStorageSize", 0)
            - heap_before.get("backingStorageSize", 0),
        },
        "delivery": {
            "loaded": file_set_metrics(args.site, loaded_paths),
            "loadedJavaScript": file_set_metrics(args.site, js_paths),
            "panelPipeline": file_set_metrics(args.site, pipeline_paths),
            "publishedSite": site_metrics(args.site),
        },
        "pageErrors": errors,
    }
    assert not errors, errors
    body = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(body)
        print(f"WROTE {args.profile} profile metrics to {args.output}")
    else:
        print(body, end="")


if __name__ == "__main__":
    asyncio.run(main())
