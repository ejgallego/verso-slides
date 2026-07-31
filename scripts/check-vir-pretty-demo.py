#!/usr/bin/env python3
"""Run the five-backend differential corpus against a built demo deck."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "url",
        nargs="?",
        default="http://127.0.0.1:18321/",
        help="URL of the built VIR pretty-printer demo",
    )
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--samples", type=int, default=9)
    parser.add_argument("--output", type=Path, help="write the complete JSON report")
    return parser.parse_args()


def timing(value: float) -> str:
    return f"{value:.3f}"


def main() -> int:
    args = parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        page.goto(args.url, wait_until="domcontentloaded")
        page.wait_for_function(
            """() =>
                globalThis.crossOriginIsolated === true &&
                typeof runPrettyDifferentialCorpus === "function" &&
                typeof getPrettyBackends === "function" &&
                getPrettyBackends().length === 5 &&
                getPrettyBackends().every(backend =>
                    (typeof backend.status !== "function" ? "ready" : backend.status()) === "ready"
                )""",
            timeout=120_000,
        )
        report = page.evaluate(
            """async ({ warmup, samples }) =>
                runPrettyDifferentialCorpus({ warmup, samples })""",
            {"warmup": args.warmup, "samples": args.samples},
        )
        browser.close()

    if args.output:
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")

    print(
        f"parity: {report['parityCount']}/{report['scenarioCount']} scenarios; "
        f"backends: {len(report['backendIds']) - len(report['unavailable'])}/"
        f"{len(report['backendIds'])} ready; "
        f"corpus wall: {report['benchmarkMs'] / 1000:.3f}s"
    )
    print("backend      samples  total median  total p95  marshal  execute  decode")
    for backend_id in report["backendIds"]:
        summary = report["summaries"][backend_id]
        phases = summary["timing"]
        print(
            f"{summary['label']:<12}"
            f"{phases['totalMs']['samples']:>7}  "
            f"{timing(phases['totalMs']['median']):>12}  "
            f"{timing(phases['totalMs']['p95']):>9}  "
            f"{timing(phases['marshalMs']['median']):>7}  "
            f"{timing(phases['executeMs']['median']):>7}  "
            f"{timing(phases['decodeMs']['median']):>6}"
        )
    if report["mismatches"]:
        print("mismatches:")
        for mismatch in report["mismatches"]:
            print(f"  {mismatch['caseId']} @ {mismatch['width']} columns")
    if args.output:
        print(f"full report: {args.output}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
