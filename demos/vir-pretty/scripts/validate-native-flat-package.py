#!/usr/bin/env python3
"""Validate the FIR native-flat package contract consumed by the demo."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from importlib.util import module_from_spec, spec_from_file_location


HERE = Path(__file__).resolve().parent
CONTRACT_PATH = HERE.parent / "contracts" / "fir-native-flat-v1.json"


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
    output = capabilities.get("output", {})
    artifact = build.get("artifact", {})

    require(build.get("format") in expected["formats"], "unsupported BUILD format")
    require(build.get("sourceDirty") is False, "source provenance must be clean")
    require(build.get("entry") == descriptor.get("entry"), "entry mismatch")
    require(build.get("params") == expected["params"], "BUILD parameter ABI mismatch")
    require(descriptor.get("params") == expected["params"], "descriptor parameter ABI mismatch")
    require(build.get("result") == expected["result"], "BUILD result ABI mismatch")
    require(descriptor.get("result") == expected["result"], "descriptor result ABI mismatch")
    require(build.get("functionImports") == expected["functionImports"], "function imports are not zero")
    require(build.get("memoryImports") == expected["memoryImports"], "memory imports are not zero")
    require(build.get("memoryExports") == expected["memoryExports"], "module must export one memory")
    require(descriptor.get("imports") == [], "descriptor imports are not empty")
    require(capabilities.get("representation") == expected["representation"], "representation mismatch")
    require(capabilities.get("memoryOwner") == expected["memoryOwner"], "memory ownership mismatch")
    require(browser.get("module") == files["adapter"], "browser adapter filename mismatch")
    require(browser.get("apiVersion") == expected["browserApiVersion"], "browser API version mismatch")
    require(capabilities.get("inputLayout", {}).get("version") == expected["inputLayoutVersion"], "input layout mismatch")
    require(capabilities.get("ownership", {}).get("version") == expected["ownershipVersion"], "ownership protocol mismatch")
    expected_output = contract["output"]
    require(
        all(output.get(key) == value for key, value in expected_output.items()),
        "flat output capability mismatch",
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
        print(f"invalid FIR native-flat package: {error}", file=sys.stderr)
        raise SystemExit(1) from error
    if args.json:
        print(json.dumps(result, sort_keys=True))
    else:
        print(
            "validated FIR native-flat package: "
            f"source={result['sourceCommit']} wasm={result['wasm']}"
        )


if __name__ == "__main__":
    main()
