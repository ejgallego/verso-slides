#!/usr/bin/env python3
"""Validate the FIR native-HTML package contract consumed by the demo."""

from __future__ import annotations

import argparse
import json
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import re
import sys


HERE = Path(__file__).resolve().parent
CONTRACT_PATH = HERE.parent / "contracts" / "fir-native-html-v1.json"


def load_subset_module():
    path = HERE / "copy-checksummed-subset.py"
    spec = spec_from_file_location("copy_checksummed_subset", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate(package: Path) -> dict[str, object]:
    contract = json.loads(CONTRACT_PATH.read_text())
    files: dict[str, str] = contract["files"]
    subset = load_subset_module()
    manifest = subset.parse_manifest(package / files["checksums"])
    for name in files.values():
        if name == files["checksums"]:
            continue
        require(name in manifest, f"SHA256SUMS does not authenticate {name}")
        path = package / name
        require(path.is_file(), f"package is missing {name}")
        require(subset.digest(path) == manifest[name], f"checksum mismatch for {name}")

    build = json.loads((package / files["build"]).read_text())
    descriptor = json.loads((package / files["descriptor"]).read_text())
    expected = contract["build"]
    capabilities = build.get("capabilities", {})
    browser = capabilities.get("browserAdapter", {})
    input_layout = capabilities.get("inputLayout", {})
    output = capabilities.get("output", {})
    artifact = build.get("artifact", {})

    require(build.get("format") in expected["formats"], "unsupported BUILD format")
    require(build.get("sourceDirty") is False, "source provenance must be clean")
    require(build.get("provisional") is not True, "provisional package is not publishable")
    require(build.get("entry") == descriptor.get("entry"), "entry mismatch")
    require(build.get("params") == expected["params"], "BUILD parameter ABI mismatch")
    require(descriptor.get("params") == expected["params"], "descriptor parameter ABI mismatch")
    require(build.get("result") == expected["result"], "BUILD result ABI mismatch")
    require(descriptor.get("result") == expected["result"], "descriptor result ABI mismatch")
    require(build.get("functionImports") == 0, "function imports are not zero")
    require(build.get("memoryImports") == 0, "memory imports are not zero")
    require(build.get("memoryExports") == 1, "module must export one memory")
    require(descriptor.get("imports") == [], "descriptor imports are not empty")
    require(capabilities.get("representation") == expected["representation"], "representation mismatch")
    require(capabilities.get("memoryOwner") == expected["memoryOwner"], "memory ownership mismatch")
    require(browser.get("module") == files["adapter"], "browser adapter filename mismatch")
    require(browser.get("apiVersion") == expected["browserApiVersion"], "browser API version mismatch")
    lean_version = input_layout.get("leanVersion")
    require(
        isinstance(lean_version, str) and re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", lean_version) is not None,
        "invalid input-layout Lean version",
    )
    lean_series = ".".join(lean_version.split(".")[:2])
    require(input_layout.get("version") == f"lean-{lean_series}-Std.Format.compact/v1", "input layout mismatch")
    require(input_layout.get("rawTarget") == f"Lean {lean_series} Std.Format", "input-layout target mismatch")
    require(build.get("lean", {}).get("toolchain") == f"leanprover/lean4:v{lean_version}", "Lean toolchain mismatch")
    require(f"Lean (version {lean_version}," in build.get("lean", {}).get("version", ""), "Lean version mismatch")
    require(
        all(input_layout.get(key) == value for key, value in contract["inputLayout"].items()),
        "input layout structure mismatch",
    )
    require(capabilities.get("ownership", {}).get("version") == expected["ownershipVersion"], "ownership protocol mismatch")
    require(
        all(output.get(key) == value for key, value in contract["output"].items()),
        "HTML output capability mismatch",
    )
    require(artifact.get("file") == files["module"], "artifact filename mismatch")
    require(artifact.get("sha256") == manifest[files["module"]], "artifact digest mismatch")

    adapter_source = (package / files["adapter"]).read_text()
    for exported in (
        contract["adapter"]["apiVersionExport"],
        contract["adapter"]["formatFactoryExport"],
        contract["adapter"]["factoryExport"],
    ):
        require(exported in adapter_source, f"adapter does not mention required export {exported}")

    return {
        "contract": contract["contract"],
        "sourceCommit": build.get("sourceCommit"),
        "entry": build.get("entry"),
        "wasm": artifact.get("sha256"),
        "bytes": artifact.get("bytes"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("package", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        result = validate(args.package)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"invalid FIR native-HTML package: {error}", file=sys.stderr)
        raise SystemExit(1) from error
    if args.json:
        print(json.dumps(result, sort_keys=True))
    else:
        print(
            "validated FIR native-HTML package: "
            f"source={result['sourceCommit']} wasm={result['wasm']}"
        )


if __name__ == "__main__":
    main()
