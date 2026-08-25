#!/usr/bin/env python3
"""Measure complete HTML backends over controlled structural dimensions."""

import argparse
import asyncio
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
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


def sha256(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def git_output(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=repo, check=True, capture_output=True, text=True
    ).stdout.strip()


def read_uleb(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while offset < len(data):
        byte = data[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if byte & 0x80 == 0:
            return value, offset
        shift += 7
    raise ValueError("truncated WebAssembly LEB128 value")


def read_wasm_name(data: bytes, offset: int) -> tuple[str, int]:
    length, offset = read_uleb(data, offset)
    end = offset + length
    return data[offset:end].decode("utf-8"), end


def wasm_function_names(path: Path) -> dict[int, str]:
    data = path.read_bytes()
    if data[:8] != b"\0asm\x01\0\0\0":
        raise ValueError(f"{path} is not a WebAssembly v1 module")
    names: dict[int, str] = {}
    offset = 8
    while offset < len(data):
        section_id = data[offset]
        section_size, payload = read_uleb(data, offset + 1)
        section_end = payload + section_size
        if section_id == 0:
            section_name, cursor = read_wasm_name(data, payload)
            if section_name == "name":
                while cursor < section_end:
                    subsection_id = data[cursor]
                    subsection_size, subsection = read_uleb(data, cursor + 1)
                    subsection_end = subsection + subsection_size
                    if subsection_id == 1:
                        count, entry = read_uleb(data, subsection)
                        for _ in range(count):
                            index, entry = read_uleb(data, entry)
                            name, entry = read_wasm_name(data, entry)
                            names[index] = name
                    cursor = subsection_end
        elif section_id == 7:
            count, cursor = read_uleb(data, payload)
            for _ in range(count):
                export_name, cursor = read_wasm_name(data, cursor)
                export_kind = data[cursor]
                export_index, cursor = read_uleb(data, cursor + 1)
                if export_kind == 0:
                    names.setdefault(export_index, export_name)
        offset = section_end
    return names


def summarize_cpu_profile(
    profile: dict[str, object], function_names: dict[int, str]
) -> dict[str, object]:
    nodes = {
        int(node["id"]): node
        for node in profile.get("nodes", [])
        if isinstance(node, dict) and isinstance(node.get("id"), int)
    }
    self_microseconds: defaultdict[tuple[str, str, int, int], int] = defaultdict(int)
    hits: defaultdict[tuple[str, str, int, int], int] = defaultdict(int)
    category_microseconds: defaultdict[str, int] = defaultdict(int)
    samples = profile.get("samples", [])
    deltas = profile.get("timeDeltas", [])
    if isinstance(samples, list) and isinstance(deltas, list):
        for node_id, delta in zip(samples, deltas, strict=False):
            if isinstance(node_id, int) and isinstance(delta, int):
                node = nodes.get(node_id, {})
                frame = node.get("callFrame", {}) if isinstance(node, dict) else {}
                if not isinstance(frame, dict):
                    frame = {}
                key = (
                    str(frame.get("functionName", "")),
                    str(frame.get("url", "")),
                    int(frame.get("lineNumber", -1)),
                    int(frame.get("columnNumber", -1)),
                )
                self_microseconds[key] += delta
                hits[key] += 1
                if key[0].startswith("wasm-function["):
                    category_microseconds["wasm"] += delta
                elif key[0] == "(garbage collector)":
                    category_microseconds["garbageCollector"] += delta
                elif key[0] == "(program)":
                    category_microseconds["program"] += delta
                elif key[0] == "(idle)":
                    category_microseconds["idle"] += delta
                else:
                    category_microseconds["adapterJavaScript"] += delta

    top_self: list[dict[str, object]] = []
    for frame_key, microseconds in sorted(
        self_microseconds.items(), key=lambda item: item[1], reverse=True
    )[:40]:
        function_name, url, line_number, column_number = frame_key
        wasm_match = re.fullmatch(r"wasm-function\[(\d+)\]", function_name)
        wasm_index = int(wasm_match.group(1)) if wasm_match else None
        top_self.append(
            {
                "selfMs": microseconds / 1000,
                "hitCount": hits[frame_key],
                "functionName": function_name,
                "wasmFunctionIndex": wasm_index,
                "wasmFunctionName": function_names.get(wasm_index, ""),
                "url": url,
                "lineNumber": line_number,
                "columnNumber": column_number,
            }
        )
    total_microseconds = sum(category_microseconds.values())
    return {
        "sampleCount": len(samples) if isinstance(samples, list) else 0,
        "sampledMs": total_microseconds / 1000,
        "wasmFunctionNames": len(function_names),
        "categories": {
            name: {
                "selfMs": microseconds / 1000,
                "percent": 100 * microseconds / total_microseconds,
            }
            for name, microseconds in sorted(category_microseconds.items())
        },
        "topSelf": top_self,
        "raw": profile,
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", action="append", dest="backends")
    parser.add_argument("--case", action="append", dest="cases")
    parser.add_argument("--repetitions", type=int, default=7)
    parser.add_argument("--warmups", type=int, default=1)
    parser.add_argument("--target-batch-ms", type=float, default=15)
    parser.add_argument("--maximum-batch-calls", type=int, default=128)
    parser.add_argument("--maximum-batch-output-bytes", type=int, default=131072)
    parser.add_argument(
        "--cpu-profile",
        action="store_true",
        help="collect a diagnostic Chrome CPU sample; do not use its timings as headline data",
    )
    parser.add_argument(
        "--vir-linear-lookup-control",
        action="store_true",
        help="add an interleaved VIR HTML control with reversed annotations, forcing linear lookup",
    )
    parser.add_argument("--site", type=Path)
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    demo_root = Path(__file__).resolve().parent.parent
    repo_root = demo_root.parent.parent
    site = (args.site or demo_root / "_profiles" / "lab").resolve()
    if not site.is_relative_to(demo_root.resolve()):
        raise SystemExit("--site must remain inside demos/vir-pretty")
    if args.build:
        build_lab(demo_root, site)
    if not (site / "index.html").is_file():
        raise SystemExit("lab profile is missing; rerun with --build")

    backends = args.backends or ["js-html", "native-html", "vir-html"]
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
            browser_version = browser.version
            page = await browser.new_page(viewport={"width": 1440, "height": 1000})
            page.on("pageerror", lambda error: errors.append(str(error)))
            await page.goto(url, wait_until="networkidle")
            await page.wait_for_function("Reveal.isReady()")
            if args.vir_linear_lookup_control:
                await page.evaluate(
                    """() => {
                      const source = getPrettyBackend("vir-html");
                      if (!source) throw new Error("VIR HTML backend is missing");
                      registerPrettyBackend({
                        id: "vir-html-linear-control",
                        label: "VIR HTML (linear lookup control)",
                        status: source.status,
                        renderTimed: function (fmtJson, annotations, pixelWidth, measurer) {
                          const bridge = window.__versoPrettyVir;
                          const originalTimed = bridge && bridge.formatHtmlTimed;
                          const originalPlain = bridge && bridge.formatHtml;
                          function reverseAnnotations(original) {
                            return function () {
                              const args = Array.prototype.slice.call(arguments);
                              args[1] = args[1].slice().reverse();
                              return original.apply(bridge, args);
                            };
                          }
                          if (typeof originalTimed === "function") {
                            bridge.formatHtmlTimed = reverseAnnotations(originalTimed);
                          }
                          if (typeof originalPlain === "function") {
                            bridge.formatHtml = reverseAnnotations(originalPlain);
                          }
                          try {
                            return source.renderTimed(fmtJson, annotations, pixelWidth, measurer);
                          } finally {
                            if (typeof originalTimed === "function") {
                              bridge.formatHtmlTimed = originalTimed;
                            }
                            if (typeof originalPlain === "function") {
                              bridge.formatHtml = originalPlain;
                            }
                          }
                        },
                      });
                    }"""
                )
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
            await page.add_script_tag(
                path=str(Path(__file__).with_name("html-scaling-measure.js"))
            )
            cpu_profile = None
            if args.cpu_profile:
                await cdp.send("Profiler.enable")
                await cdp.send("Profiler.setSamplingInterval", {"interval": 100})
                await cdp.send("Profiler.start")
            try:
                result = await page.evaluate(
                    "options => runPrettyHtmlScalingMeasurement(options)",
                    {
                        "backends": backends,
                        "caseIds": args.cases or [],
                        "repetitions": args.repetitions,
                        "warmups": args.warmups,
                        "targetBatchMs": args.target_batch_ms,
                        "maximumBatchCalls": args.maximum_batch_calls,
                        "maximumBatchOutputBytes": args.maximum_batch_output_bytes,
                    },
                )
            finally:
                if args.cpu_profile:
                    cpu_profile = (await cdp.send("Profiler.stop"))["profile"]
            bridge_identity = await page.evaluate(
                """() => ({
                  vir: window.__versoPrettyVir?.runtime?.packageInfo || null,
                  fir: window.__versoPrettyNativeHtml?.build || null
                })"""
            )
            await cdp.send("HeapProfiler.collectGarbage")
            heap_after = await cdp.send("Runtime.getHeapUsage")
            await browser.close()
    finally:
        server.shutdown()
        thread.join()

    result["identity"] = {
        "collectedAt": datetime.now(timezone.utc).isoformat(),
        "host": platform.node(),
        "platform": platform.platform(),
        "browser": browser_version,
        "gitHead": git_output(repo_root, "rev-parse", "HEAD"),
        "gitStatus": git_output(repo_root, "status", "--short"),
        "sourceSha256": {
            "harness": sha256(Path(__file__).with_name("html-scaling-measure.js")),
            "formatterLab": sha256(demo_root / "web" / "formatter-lab.js"),
            "virWasm": sha256(site / "vir-pretty" / "lean-vir" / "wasm" / "vir-upstream.wasm"),
            "firWasm": sha256(site / "vir-pretty" / "lean-native-html" / "prettyM.wasm"),
        },
        "bridges": bridge_identity,
        "virLinearLookupControl": args.vir_linear_lookup_control,
    }
    result["browserHeap"] = {
        "before": heap_before,
        "after": heap_after,
        "usedDeltaBytes": heap_after["usedSize"] - heap_before["usedSize"],
    }
    result["pageErrors"] = errors
    if cpu_profile is not None:
        result["cpuProfile"] = summarize_cpu_profile(
            cpu_profile,
            wasm_function_names(
                site / "vir-pretty" / "lean-vir" / "wasm" / "vir-upstream.wasm"
            ),
        )
    if errors or result["failures"]:
        raise AssertionError({"pageErrors": errors, "failures": result["failures"]})

    body = json.dumps(result, indent=2) + "\n"
    if args.output:
        output = args.output.resolve()
        if not output.is_relative_to(demo_root.resolve()):
            raise SystemExit("--output must remain inside demos/vir-pretty")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(body)
        print(f"WROTE HTML scaling measurements to {output}")
    else:
        print(body, end="")

    for case in result["cases"]:
        values = []
        for backend in backends:
            execute = case["backends"][backend]["timingsMs"]["executeMs"]["median"]
            values.append(f"{backend}={execute:.3f}")
        print(f"{case['id']}: execute " + ", ".join(values) + " ms")


if __name__ == "__main__":
    asyncio.run(main())
