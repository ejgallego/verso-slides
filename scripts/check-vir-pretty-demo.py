#!/usr/bin/env python3
"""Run correctness, startup, scaling, memory, interaction, and repeat studies."""

import argparse
import json
import math
import statistics
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright


WORKSPACE = Path(__file__).resolve().parent.parent
DEFAULT_REPORT = Path("_test/pretty-reports/pretty-benchmark.json")


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
    parser.add_argument("--scaling-warmup", type=int, default=2)
    parser.add_argument("--scaling-samples", type=int, default=9)
    parser.add_argument("--batch-target-ms", type=float, default=20.0)
    parser.add_argument("--max-batch-iterations", type=int, default=512)
    parser.add_argument("--batch-memory-mib", type=float, default=64.0)
    parser.add_argument("--interaction-warmup", type=int, default=1)
    parser.add_argument("--interaction-samples", type=int, default=5)
    parser.add_argument("--repeat-cycles", type=int, default=32)
    parser.add_argument(
        "--skip-isolated-repeats",
        action="store_true",
        help="skip fresh-context VIR JSON and VIR Format repeated-call traces",
    )
    parser.add_argument(
        "--allow-isolated-failures",
        action="store_true",
        help="return success when only isolated memory/repeat studies fail",
    )
    parser.add_argument(
        "--skip-isolated-memory",
        action="store_true",
        help="skip fresh-context memory points",
    )
    parser.add_argument("--cold-runs", type=int, default=5)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_REPORT,
        help=f"workspace-relative JSON output (default: {DEFAULT_REPORT})",
    )
    return parser.parse_args()


def workspace_path(path: Path) -> Path:
    resolved = (WORKSPACE / path).resolve() if not path.is_absolute() else path.resolve()
    try:
        resolved.relative_to(WORKSPACE)
    except ValueError as error:
        raise SystemExit(f"refusing to write outside {WORKSPACE}: {resolved}") from error
    return resolved


def wait_for_backends(page: Page, url: str) -> None:
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_function(
        """() =>
            globalThis.crossOriginIsolated === true &&
            typeof runPrettyDifferentialCorpus === "function" &&
            typeof runPrettyScalingStudy === "function" &&
            typeof runPrettyRepeatedCallStudy === "function" &&
            typeof runPrettyMemoryScalingPoint === "function" &&
            typeof runPrettyMemoryScalingStudy === "function" &&
            typeof runPrettyInteractionStudy === "function" &&
            typeof collectPrettyMemorySnapshot === "function" &&
            typeof collectPrettyRuntimeProfile === "function" &&
            typeof getPrettyBackends === "function" &&
            getPrettyBackends().length === 5 &&
            getPrettyBackends().every(backend =>
                (typeof backend.status !== "function" ? "ready" : backend.status()) === "ready"
            )""",
        timeout=120_000,
    )


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    return ordered[min(len(ordered) - 1, math.ceil(len(ordered) * fraction) - 1)]


def distribution(values: list[float]) -> dict[str, float | int]:
    if not values:
        return {"samples": 0, "min": 0.0, "median": 0.0, "p95": 0.0, "max": 0.0}
    return {
        "samples": len(values),
        "min": min(values),
        "median": statistics.median(values),
        "p95": percentile(values, 0.95),
        "max": max(values),
    }


def collect_cold_profiles(browser: Browser, url: str, runs: int) -> list[dict[str, Any]]:
    profiles = []
    for _ in range(runs):
        context = browser.new_context()
        page = context.new_page()
        wait_for_backends(page, url)
        profiles.append(page.evaluate("() => collectPrettyRuntimeProfile()"))
        context.close()
    return profiles


def summarize_cold_profiles(
    profiles: list[dict[str, Any]], backend_ids: list[str]
) -> dict[str, Any]:
    backends: dict[str, Any] = {}
    for backend_id in backend_ids:
        entries = [profile["backends"][backend_id] for profile in profiles]
        backends[backend_id] = {
            "label": entries[0]["label"] if entries else backend_id,
            "startupMs": distribution(
                [entry["startupMs"] for entry in entries if entry["startupMs"] is not None]
            ),
            "resourceLoadMs": distribution(
                [
                    entry["resourceLoadMs"]
                    for entry in entries
                    if entry["resourceLoadMs"] is not None
                ]
            ),
            "assetBytes": entries[0]["assetBytes"] if entries else 0,
            "wasmBytes": entries[0]["wasmBytes"] if entries else 0,
            "memoryBytes": entries[0]["memoryBytes"] if entries else None,
            "provenance": entries[0]["provenance"] if entries else None,
        }
    return {"runs": len(profiles), "backends": backends, "profiles": profiles}


def collect_isolated_memory(
    browser: Browser,
    url: str,
    backend_ids: list[str],
    point_count: int,
) -> dict[str, Any]:
    """Run every point in a fresh browser context and fresh Wasm instances."""
    points: list[dict[str, Any]] = []
    for point_index in range(point_count):
        context = browser.new_context()
        page = context.new_page()
        wait_for_backends(page, url)
        point = page.evaluate(
            """async ({ pointIndex, backendIds }) =>
                runPrettyMemoryScalingPoint(pointIndex, { backendIds })""",
            {"pointIndex": point_index, "backendIds": backend_ids},
        )
        context.close()
        points.append(point)
        print(
            f"isolated memory: {point_index + 1}/{point_count} "
            f"{point['dimension']} {point['sizeLabel']}",
            flush=True,
        )

    dimensions: list[dict[str, Any]] = []
    for point in points:
        dimension = next(
            (item for item in dimensions if item["id"] == point["dimension"]),
            None,
        )
        if dimension is None:
            dimension = {
                "id": point["dimension"],
                "label": point["dimensionLabel"],
                "points": [],
            }
            dimensions.append(dimension)
        dimension["points"].append(point)
    mismatches = [point for point in points if not point["parity"]]
    return {
        "schemaVersion": 1,
        "kind": "memory-isolated",
        "mode": "fresh-browser-context",
        "backendIds": backend_ids,
        "pointCount": len(points),
        "parityCount": len(points) - len(mismatches),
        "passed": not mismatches,
        "mismatches": [
            {
                "caseId": point["caseId"],
                "label": point["label"],
                "width": point["width"],
                "backendErrors": {
                    backend_id: point["backends"][backend_id]["errors"]
                    for backend_id in backend_ids
                    if point["backends"][backend_id]["errors"]
                },
            }
            for point in mismatches
        ],
        "dimensions": dimensions,
        "points": points,
    }


def collect_isolated_repeats(
    browser: Browser,
    url: str,
    backend_ids: list[str],
    cycles: int,
) -> dict[str, Any]:
    """Run each VIR entry point in its own fresh runtime instance."""
    reports: dict[str, Any] = {}
    selected_ids = [
        backend_id
        for backend_id in ("vir", "vir-format")
        if backend_id in backend_ids
    ]
    for backend_id in selected_ids:
        context = browser.new_context()
        page = context.new_page()
        wait_for_backends(page, url)
        reports[backend_id] = page.evaluate(
            """async ({ backendId, cycles }) =>
                runPrettyRepeatedCallStudy({ backendIds: [backendId], cycles })""",
            {"backendId": backend_id, "cycles": cycles},
        )
        context.close()
        print(
            f"isolated repeats: {backend_id} · {cycles} cycles · "
            f"{'pass' if reports[backend_id]['passed'] else 'fail'}",
            flush=True,
        )
    return {
        "schemaVersion": 1,
        "kind": "repeated-isolated-vir-modes",
        "mode": "fresh-browser-context-per-mode",
        "cycles": cycles,
        "backendIds": selected_ids,
        "passed": len(reports) == len(selected_ids)
        and all(report["passed"] for report in reports.values()),
        "reports": reports,
    }


def timing(value: float) -> str:
    return f"{value:.3f}"


def print_runtime_table(report: dict[str, Any]) -> None:
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


def print_cold_table(
    cold: dict[str, Any], backend_ids: list[str], post_run: dict[str, Any]
) -> None:
    print("\ncold startup and footprint")
    print(
        "backend       startup median  startup p95  resource wall  assets KiB  "
        "wasm KiB  initial MiB  post-run MiB"
    )
    for backend_id in backend_ids:
        entry = cold["backends"][backend_id]
        memory = entry["memoryBytes"]
        memory_text = f"{memory / (1024 * 1024):.2f}" if memory is not None else "—"
        post_memory = post_run["backends"][backend_id]["memoryBytes"]
        post_memory_text = (
            f"{post_memory / (1024 * 1024):.2f}" if post_memory is not None else "—"
        )
        print(
            f"{entry['label']:<13}"
            f"{timing(entry['startupMs']['median']):>14}  "
            f"{timing(entry['startupMs']['p95']):>11}  "
            f"{timing(entry['resourceLoadMs']['median']):>13}  "
            f"{entry['assetBytes'] / 1024:>10.1f}  "
            f"{entry['wasmBytes'] / 1024:>8.1f}  "
            f"{memory_text:>11}  "
            f"{post_memory_text:>12}"
        )


def print_scaling_tables(scaling: dict[str, Any]) -> None:
    for phase in scaling["timingPhases"]:
        print(f"\ninput scaling: endpoint median {phase['label'].lower()} (ms)")
        heading = "dimension              size  out KiB  segments"
        for backend_id in scaling["backendIds"]:
            heading += f"  {scaling['summaries'][backend_id]['label']:>11}"
        print(heading)
        for dimension in scaling["dimensions"]:
            point = dimension["points"][-1]
            output = point["output"]
            row = (
                f"{dimension['label']:<22}{point['sizeLabel']:>12}"
                f"  {output['textBytes'] / 1024:>7.1f}  {output['segments']:>8}"
            )
            for backend_id in scaling["backendIds"]:
                median = point["backends"][backend_id]["summary"][phase["id"]]["median"]
                row += f"  {timing(median):>11}"
            print(row)


def memory_bytes(value: int | float | None) -> str:
    if value is None:
        return "—"
    if abs(value) < 1024:
        return f"{value:.0f} B"
    if abs(value) < 1024 * 1024:
        return f"{value / 1024:.1f} KiB"
    return f"{value / (1024 * 1024):.2f} MiB"


def print_memory_table(memory: dict[str, Any], label: str) -> None:
    print(f"\n{label}: endpoint per-call memory deltas")
    print("dimension              size       backend      resident       committed")
    for dimension in memory["dimensions"]:
        point = dimension["points"][-1]
        for index, backend_id in enumerate(memory["backendIds"]):
            backend = point["backends"][backend_id]
            prefix = (
                f"{dimension['label']:<22}{point['sizeLabel']:>12}"
                if index == 0
                else " " * 34
            )
            print(
                f"{prefix}  {backend['label']:<12}"
                f"{memory_bytes(backend['residentDeltaBytes']):>12}  "
                f"{memory_bytes(backend['committedDeltaBytes']):>14}"
            )


def print_interaction_table(interactions: dict[str, Any]) -> None:
    print("\ninteraction endpoints: median execute (ms)")
    heading = "interaction                 x × y"
    for backend_id in interactions["backendIds"]:
        heading += f"  {interactions['summaries'][backend_id]['label']:>11}"
    print(heading)
    for interaction in interactions["interactions"]:
        point = interaction["points"][-1]
        row = f"{interaction['label']:<27}{point['xLabel']} × {point['yLabel']}"
        for backend_id in interactions["backendIds"]:
            median = point["backends"][backend_id]["summary"]["executeMs"]["median"]
            row += f"  {timing(median):>11}"
        print(row)


def print_repeated_table(repeated: dict[str, Any]) -> None:
    print(
        f"\nrepeated calls: {repeated['totalBackendCalls']} calls; "
        f"{repeated['cycles']} rotated cycles; "
        f"stability mismatches: {len(repeated['stabilityMismatches'])}"
    )
    print(
        "backend       calls  total median  total p95  marshal  execute  decode  "
        "memory growth MiB"
    )
    for backend_id in repeated["backendIds"]:
        summary = repeated["summaries"][backend_id]
        phases = summary["timing"]
        growth = repeated["memoryGrowth"][backend_id]["deltaBytes"]
        growth_text = f"{growth / (1024 * 1024):.2f}" if growth is not None else "—"
        print(
            f"{summary['label']:<12}"
            f"{phases['totalMs']['samples']:>7}  "
            f"{timing(phases['totalMs']['median']):>12}  "
            f"{timing(phases['totalMs']['p95']):>9}  "
            f"{timing(phases['marshalMs']['median']):>7}  "
            f"{timing(phases['executeMs']['median']):>7}  "
            f"{timing(phases['decodeMs']['median']):>6}  "
            f"{growth_text:>17}"
        )
    isolated = repeated.get("isolated")
    if isolated:
        print("\nisolated VIR repeated-call committed-memory tails")
        print("backend       calls     growth  tail cycles  tail growth  assessment")
        for backend_id in isolated["backendIds"]:
            report = isolated["reports"][backend_id]
            series = next(
                item for item in report["memoryTrace"]["series"] if item["id"] == "vir-runtime"
            )
            summary = series["committed"]
            assessment = (
                "plateau"
                if summary["plateau"] is True
                else "growing"
                if summary["plateau"] is False
                else "unknown"
            )
            print(
                f"{report['summaries'][backend_id]['label']:<12}"
                f"{report['callsPerBackend']:>7}  "
                f"{memory_bytes(summary['growthBytes']):>9}  "
                f"{summary['tailCycles']:>11}  "
                f"{memory_bytes(summary['tailGrowthBytes']):>11}  "
                f"{assessment}"
            )


def main() -> int:
    args = parse_args()
    if args.cold_runs < 1:
        raise SystemExit("--cold-runs must be positive")
    if args.batch_target_ms <= 0:
        raise SystemExit("--batch-target-ms must be positive")
    if args.max_batch_iterations < 1:
        raise SystemExit("--max-batch-iterations must be positive")
    if args.batch_memory_mib <= 0:
        raise SystemExit("--batch-memory-mib must be positive")
    output = workspace_path(args.output)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        cold_profiles = collect_cold_profiles(browser, args.url, args.cold_runs)
        context = browser.new_context()
        page = context.new_page()
        wait_for_backends(page, args.url)
        results = page.evaluate(
            """async options => {
                const corpus = await runPrettyDifferentialCorpus({
                    warmup: options.warmup,
                    samples: options.samples,
                    profile: true
                });
                const scaling = await runPrettyScalingStudy({
                    warmup: options.scalingWarmup,
                    samples: options.scalingSamples,
                    batchTargetMs: options.batchTargetMs,
                    maxBatchIterations: options.maxBatchIterations,
                    batchMemoryBudgetBytes: options.batchMemoryBudgetBytes
                });
                const memory = await runPrettyMemoryScalingStudy();
                const interactions = await runPrettyInteractionStudy({
                    warmup: options.interactionWarmup,
                    samples: options.interactionSamples,
                    batchTargetMs: options.batchTargetMs,
                    maxBatchIterations: options.maxBatchIterations,
                    batchMemoryBudgetBytes: options.batchMemoryBudgetBytes
                });
                const repeated = await runPrettyRepeatedCallStudy({
                    cycles: options.repeatCycles
                });
                return {
                    corpus,
                    scaling,
                    memory,
                    interactions,
                    repeated,
                    postRunProfile: await collectPrettyRuntimeProfile()
                };
            }""",
            {
                "warmup": args.warmup,
                "samples": args.samples,
                "scalingWarmup": args.scaling_warmup,
                "scalingSamples": args.scaling_samples,
                "batchTargetMs": args.batch_target_ms,
                "maxBatchIterations": args.max_batch_iterations,
                "batchMemoryBudgetBytes": args.batch_memory_mib * 1024 * 1024,
                "interactionWarmup": args.interaction_warmup,
                "interactionSamples": args.interaction_samples,
                "repeatCycles": args.repeat_cycles,
            },
        )
        context.close()
        isolated_memory = (
            None
            if args.skip_isolated_memory
            else collect_isolated_memory(
                browser,
                args.url,
                results["corpus"]["backendIds"],
                results["memory"]["pointCount"],
            )
        )
        isolated_repeats = (
            None
            if args.skip_isolated_repeats
            else collect_isolated_repeats(
                browser,
                args.url,
                results["corpus"]["backendIds"],
                args.repeat_cycles,
            )
        )
        browser.close()

    corpus = results["corpus"]
    scaling = results["scaling"]
    memory = results["memory"]
    interactions = results["interactions"]
    repeated = results["repeated"]
    repeated["isolated"] = isolated_repeats
    corpus["coldStart"] = summarize_cold_profiles(cold_profiles, corpus["backendIds"])
    corpus["scaling"] = scaling
    memory["isolated"] = isolated_memory
    corpus["memory"] = memory
    corpus["interactions"] = interactions
    corpus["repeated"] = repeated
    corpus["postRunProfile"] = results["postRunProfile"]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(corpus, indent=2, ensure_ascii=False) + "\n")

    real_cases = sum(case["origin"] == "slide" for case in corpus["cases"])
    print(
        f"parity: {corpus['parityCount']}/{corpus['scenarioCount']} scenarios; "
        f"{real_cases} real slide formats; "
        f"backends: {len(corpus['backendIds']) - len(corpus['unavailable'])}/"
        f"{len(corpus['backendIds'])} ready; "
        f"corpus wall: {corpus['benchmarkMs'] / 1000:.3f}s"
    )
    print_runtime_table(corpus)
    print_cold_table(corpus["coldStart"], corpus["backendIds"], corpus["postRunProfile"])
    print_scaling_tables(scaling)
    print_memory_table(memory, "retained instance")
    if isolated_memory is not None:
        print_memory_table(isolated_memory, "fresh context")
    print_interaction_table(interactions)
    print_repeated_table(repeated)
    all_mismatches = (
        corpus["mismatches"]
        + scaling["mismatches"]
        + memory["mismatches"]
        + interactions["mismatches"]
        + repeated["mismatches"]
        + (
            []
            if isolated_repeats is None
            else [
                mismatch
                for report in isolated_repeats["reports"].values()
                for mismatch in report["mismatches"]
            ]
        )
        + ([] if isolated_memory is None else isolated_memory["mismatches"])
    )
    if all_mismatches:
        print("mismatches:")
        for mismatch in all_mismatches:
            print(f"  {mismatch['caseId']} @ {mismatch['width']} columns")
            for backend_id, errors in mismatch.get("backendErrors", {}).items():
                for error in errors:
                    print(f"    {backend_id}: {error}")
    print(f"full report: {output}")
    core_passed = (
        corpus["passed"]
        and scaling["passed"]
        and memory["passed"]
        and interactions["passed"]
        and repeated["passed"]
    )
    isolated_passed = (isolated_repeats is None or isolated_repeats["passed"]) and (
        isolated_memory is None or isolated_memory["passed"]
    )
    passed = core_passed and (args.allow_isolated_failures or isolated_passed)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
