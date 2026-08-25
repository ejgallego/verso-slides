"""Tests for browser artifact subsets and FIR Flat/HTML contracts."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).parents[1]
DEMO = ROOT / "demos" / "vir-pretty"
COPY_SUBSET = DEMO / "scripts" / "copy-checksummed-subset.py"
VALIDATE_FLAT = DEMO / "scripts" / "validate-native-flat-package.py"
VALIDATE_HTML = DEMO / "scripts" / "validate-native-html-package.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_manifest(package: Path, names: list[str]) -> None:
    (package / "SHA256SUMS").write_text(
        "".join(f"{sha256(package / name)}  {name}\n" for name in names)
    )


def make_flat_package(package: Path) -> None:
    package.mkdir()
    wasm = package / "prettyM.wasm"
    wasm.write_bytes(b"direct-flat-wasm-fixture")
    descriptor = {
        "entry": "Fixture.prettyFormatRenderedRaw",
        "imports": [],
        "params": ["tobject", "tobject", "tobject", "tobject"],
        "result": "object",
    }
    (package / "prettyM.wasm.json").write_text(json.dumps(descriptor))
    (package / "prettyM-browser-adapter.mjs").write_text(
        "export const PRETTY_M_BROWSER_API_VERSION = 'fir.prettyM.flat.browser/v1';\n"
        "export const PrettyFormat = {};\n"
        "export async function fetchPrettyMAdapter() {}\n"
    )
    build = {
        "format": "fir-prettyM-package-metadata-v2",
        "sourceCommit": "fixture",
        "sourceDirty": False,
        "artifact": {
            "file": "prettyM.wasm",
            "bytes": wasm.stat().st_size,
            "sha256": sha256(wasm),
        },
        "entry": descriptor["entry"],
        "params": descriptor["params"],
        "result": "object",
        "functionImports": 0,
        "memoryImports": 0,
        "memoryExports": 1,
        "capabilities": {
            "representation": "wasm32-lean64",
            "memoryOwner": "module",
            "browserAdapter": {
                "module": "prettyM-browser-adapter.mjs",
                "apiVersion": "fir.prettyM.flat.browser/v1",
            },
            "inputLayout": {
                "version": "lean-4.32-Std.Format.compact/v1",
                "leanVersion": "4.32.0",
                "rawTarget": "Lean 4.32 Std.Format",
                "representation": "compact-discriminated-union",
                "constructors": ["nil", "line", "align", "text", "nest", "append", "group", "tag"],
            },
            "ownership": {"version": "fir.prettyM.module-owned-transfer/v1"},
            "output": {
                "semantic": "RenderedTextEvents",
                "schema": "text-events-utf8/v1",
                "physical": "object",
                "textProjection": "String",
                "offsetUnit": "utf8-byte",
                "eventKinds": {"startTag": 0, "endTags": 1, "unstyledNewline": 2},
            },
        },
        "lean": {
            "toolchain": "leanprover/lean4:v4.32.0",
            "version": "Lean (version 4.32.0, fixture)",
        },
    }
    (package / "BUILD.json").write_text(json.dumps(build))
    write_manifest(
        package,
        ["BUILD.json", "prettyM-browser-adapter.mjs", "prettyM.wasm", "prettyM.wasm.json"],
    )


def make_html_package(package: Path) -> None:
    package.mkdir()
    wasm = package / "prettyM.wasm"
    wasm.write_bytes(b"complete-html-wasm-fixture")
    descriptor = {
        "entry": "VersoSlides.Pretty.formatHtmlForRuntime",
        "imports": [],
        "params": ["tobject", "object", "tobject", "tobject", "tobject"],
        "result": "object",
    }
    (package / "prettyM.wasm.json").write_text(json.dumps(descriptor))
    (package / "prettyM-browser-adapter.mjs").write_text(
        "export const PRETTY_M_BROWSER_API_VERSION = 'fir.prettyM.html.browser/v1';\n"
        "export const PrettyFormat = {};\n"
        "export async function fetchPrettyMAdapter() {}\n"
    )
    build = {
        "format": "fir-prettyM-package-metadata-v2",
        "sourceCommit": "fixture",
        "sourceDirty": False,
        "artifact": {
            "file": "prettyM.wasm",
            "bytes": wasm.stat().st_size,
            "sha256": sha256(wasm),
        },
        "entry": descriptor["entry"],
        "params": descriptor["params"],
        "result": "object",
        "functionImports": 0,
        "memoryImports": 0,
        "memoryExports": 1,
        "capabilities": {
            "representation": "wasm32-lean64",
            "memoryOwner": "module",
            "browserAdapter": {
                "module": "prettyM-browser-adapter.mjs",
                "apiVersion": "fir.prettyM.html.browser/v1",
            },
            "inputLayout": {
                "version": "lean-4.32-Std.Format.compact/v1",
                "leanVersion": "4.32.0",
                "rawTarget": "Lean 4.32 Std.Format",
                "representation": "compact-discriminated-union-plus-tagged-annotations",
                "constructors": ["nil", "line", "align", "text", "nest", "append", "group", "tag"],
                "annotations": "Array VersoSlides.Pretty.TaggedAnnotation",
            },
            "ownership": {"version": "fir.prettyM.module-owned-transfer/v1"},
            "output": {
                "semantic": "EscapedHtmlString",
                "schema": "verso-token-html/v1",
                "physical": "object",
                "escaping": "html-text-and-double-quoted-attribute/v1",
            },
        },
        "lean": {
            "toolchain": "leanprover/lean4:v4.32.0",
            "version": "Lean (version 4.32.0, fixture)",
        },
    }
    (package / "BUILD.json").write_text(json.dumps(build))
    write_manifest(
        package,
        ["BUILD.json", "prettyM-browser-adapter.mjs", "prettyM.wasm", "prettyM.wasm.json"],
    )


def test_checksummed_subset_has_a_self_contained_manifest(tmp_path: Path):
    source = tmp_path / "source"
    destination = tmp_path / "browser"
    source.mkdir()
    for name, body in {"BUILD.json": b"{}", "prettyM.wasm": b"wasm", "extra.txt": b"extra"}.items():
        (source / name).write_bytes(body)
    write_manifest(source, ["BUILD.json", "prettyM.wasm", "extra.txt"])

    subprocess.run(
        [sys.executable, COPY_SUBSET, source, destination, "BUILD.json", "prettyM.wasm"],
        check=True,
    )

    assert sorted(path.name for path in destination.iterdir()) == [
        "BUILD.json",
        "SHA256SUMS",
        "prettyM.wasm",
    ]
    assert "extra.txt" not in (destination / "SHA256SUMS").read_text()
    subprocess.run(["sha256sum", "-c", "SHA256SUMS"], cwd=destination, check=True)


def test_native_flat_contract_accepts_the_declared_boundary(tmp_path: Path):
    package = tmp_path / "flat"
    make_flat_package(package)
    result = subprocess.run(
        [sys.executable, VALIDATE_FLAT, package, "--json"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert json.loads(result.stdout)["contract"] == "verso.pretty.fir-native-flat-package/v1"


def test_native_flat_contract_rejects_trace_output(tmp_path: Path):
    package = tmp_path / "flat"
    make_flat_package(package)
    build_path = package / "BUILD.json"
    build = json.loads(build_path.read_text())
    build["capabilities"]["output"]["semantic"] = "PrettyTrace"
    build_path.write_text(json.dumps(build))
    write_manifest(
        package,
        ["BUILD.json", "prettyM-browser-adapter.mjs", "prettyM.wasm", "prettyM.wasm.json"],
    )
    result = subprocess.run(
        [sys.executable, VALIDATE_FLAT, package],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "flat output capability mismatch" in result.stderr


def test_native_flat_contract_rejects_provisional_package(tmp_path: Path):
    package = tmp_path / "flat"
    make_flat_package(package)
    build_path = package / "BUILD.json"
    build = json.loads(build_path.read_text())
    build["provisional"] = True
    build_path.write_text(json.dumps(build))
    write_manifest(
        package,
        ["BUILD.json", "prettyM-browser-adapter.mjs", "prettyM.wasm", "prettyM.wasm.json"],
    )
    result = subprocess.run(
        [sys.executable, VALIDATE_FLAT, package],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "provisional package is not publishable" in result.stderr


def test_native_html_contract_accepts_the_declared_boundary(tmp_path: Path):
    package = tmp_path / "html"
    make_html_package(package)
    result = subprocess.run(
        [sys.executable, VALIDATE_HTML, package, "--json"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert json.loads(result.stdout)["contract"] == "verso.pretty.fir-native-html-package/v1"


def test_native_html_contract_rejects_render_plan_output(tmp_path: Path):
    package = tmp_path / "html"
    make_html_package(package)
    build_path = package / "BUILD.json"
    build = json.loads(build_path.read_text())
    build["capabilities"]["output"]["semantic"] = "RenderPlan"
    build_path.write_text(json.dumps(build))
    write_manifest(
        package,
        ["BUILD.json", "prettyM-browser-adapter.mjs", "prettyM.wasm", "prettyM.wasm.json"],
    )
    result = subprocess.run(
        [sys.executable, VALIDATE_HTML, package],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "HTML output capability mismatch" in result.stderr


def test_native_html_contract_rejects_provisional_package(tmp_path: Path):
    package = tmp_path / "html"
    make_html_package(package)
    build_path = package / "BUILD.json"
    build = json.loads(build_path.read_text())
    build["provisional"] = True
    build_path.write_text(json.dumps(build))
    write_manifest(
        package,
        ["BUILD.json", "prettyM-browser-adapter.mjs", "prettyM.wasm", "prettyM.wasm.json"],
    )
    result = subprocess.run(
        [sys.executable, VALIDATE_HTML, package],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "provisional package is not publishable" in result.stderr
