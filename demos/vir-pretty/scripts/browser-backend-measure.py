#!/usr/bin/env python3
"""Run the generic formatter corpus against JS, VIR, FIR, or LLVM."""

import argparse
import asyncio
import json
import os
import shutil
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.async_api import async_playwright


class IsolatedHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        pass


def build_lab(demo_root: Path, site: Path) -> None:
    environment = os.environ.copy()
    environment.update({"VIR_PRETTY_PROFILE": "lab", "OUT_DIR": str(site)})
    subprocess.run(
        [str(demo_root / "scripts" / "assemble.sh")],
        cwd=demo_root,
        env=environment,
        check=True,
    )


async def resolve_backends(page, requested: list[str]) -> list[str]:
    return await page.evaluate(
        """requested => {
          const resolved = [];
          const add = id => { if (id && !resolved.includes(id)) resolved.push(id); };
          for (const name of requested) {
            if (name === 'fir') add(getPrettyMatrixBackend('fir', 'layout')?.id);
            else if (name === 'fir-all') getPrettyBackends()
              .filter(backend => backend.capabilities?.runtime === 'fir-native')
              .forEach(backend => add(backend.id));
            else if (name === 'vir') add(getPrettyMatrixBackend('vir', 'layout')?.id);
            else add(name);
          }
          const missing = resolved.filter(id => !getPrettyBackend(id));
          if (missing.length) throw new Error('unknown backends: ' + missing.join(', '));
          return resolved;
        }""",
        requested,
    )


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--backend",
        action="append",
        dest="backends",
        help="backend ID or alias: vir, fir, or fir-all (repeatable)",
    )
    parser.add_argument("--width", action="append", type=int, dest="widths")
    parser.add_argument("--repetitions", type=int, default=7)
    parser.add_argument("--warmups", type=int, default=1)
    parser.add_argument(
        "--code-points",
        type=int,
        default=256,
        help="minimum source code points per timed batch (default: 256)",
    )
    parser.add_argument("--site", type=Path)
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    demo_root = Path(__file__).resolve().parent.parent
    site = (args.site or demo_root / "_profiles" / "lab").resolve()
    if not site.is_relative_to(demo_root.resolve()):
        raise SystemExit("--site must remain inside demos/vir-pretty")
    if args.build:
        build_lab(demo_root, site)
    if not (site / "index.html").is_file():
        raise SystemExit("lab profile is missing; rerun with --build")

    requested = args.backends or ["js", "vir", "fir", "llvm"]
    widths = args.widths or [20, 40, 80]
    handler = partial(IsolatedHandler, directory=str(site))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/"
    errors: list[str] = []

    try:
        async with async_playwright() as playwright:
            chrome = shutil.which("google-chrome")
            browser = await playwright.chromium.launch(
                headless=True,
                executable_path=chrome if chrome else None,
            )
            page = await browser.new_page(viewport={"width": 1440, "height": 1000})
            page.on("pageerror", lambda error: errors.append(str(error)))
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_function("Reveal.isReady()")
            backends = await resolve_backends(page, requested)
            await page.wait_for_function(
                """ids => ids.every(id => {
                  const backend = getPrettyBackend(id);
                  return backend && (!backend.status || backend.status() === 'ready');
                })""",
                arg=backends,
                timeout=60_000,
            )
            cdp = await page.context.new_cdp_session(page)
            await cdp.send("HeapProfiler.collectGarbage")
            heap_before = await cdp.send("Runtime.getHeapUsage")
            await page.add_script_tag(path=str(Path(__file__).with_name("backend-measure.js")))
            result = await page.evaluate(
                "options => runPrettyBackendMeasurement(options)",
                {
                    "backends": backends,
                    "widths": widths,
                    "repetitions": args.repetitions,
                    "warmups": args.warmups,
                    "minimumCodePoints": args.code_points,
                },
            )
            await cdp.send("HeapProfiler.collectGarbage")
            heap_after = await cdp.send("Runtime.getHeapUsage")
            await browser.close()
    finally:
        server.shutdown()
        thread.join()

    result["browserHeap"] = {
        "before": heap_before,
        "after": heap_after,
        "usedDeltaBytes": heap_after["usedSize"] - heap_before["usedSize"],
    }
    result["pageErrors"] = errors
    if errors or result["failures"]:
        raise AssertionError({"pageErrors": errors, "failures": result["failures"]})

    body = json.dumps(result, indent=2) + "\n"
    if args.output:
        output = args.output.resolve()
        if not output.is_relative_to(demo_root.resolve()):
            raise SystemExit("--output must remain inside demos/vir-pretty")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(body)
        print(f"WROTE backend measurements to {output}")
    else:
        print(body, end="")

    for backend, measurement in result["backends"].items():
        timings = measurement["timingsMs"]
        execute = timings.get("executeMs", {}).get("median", 0)
        total = timings.get("committedTotalMs", {}).get("median", 0)
        print(
            f"{backend}: {measurement['samples']} samples, "
            f"execute median {execute:.3f} ms, committed median {total:.3f} ms"
        )


if __name__ == "__main__":
    asyncio.run(main())
