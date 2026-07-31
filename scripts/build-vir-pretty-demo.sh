#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
lean_vir_dir="${LEAN_VIR_DIR:-/tmp/lean-vir}"
native_pretty_dir="${NATIVE_PRETTY_DIR:-}"
llvm_pretty_dir="${LLVM_PRETTY_DIR:-}"
fixture_dir="$repo_root/_test/code"
out_dir="${OUT_DIR:-$repo_root/_test/vir-code}"
publish_target="${PUBLISH_TARGET:-x80.org:/srv/www/vir-verso-slides-demo/}"
build_fixtures=1
publish=0

usage() {
  cat <<'EOF'
Usage: scripts/build-vir-pretty-demo.sh [options]

Build the VIR pretty-printer demo deck under _test/vir-code.
Run npm run build:demo:release in the lean-vir checkout first; this script
refuses to publish if vir-upstream.wasm matches vir-upstream.dev.wasm.

Options:
  --lean-vir-dir DIR   lean-vir checkout to use (default: $LEAN_VIR_DIR or /tmp/lean-vir)
  --native-pretty-dir DIR
                       prepared FIR prettyM package to include (default: $NATIVE_PRETTY_DIR)
  --llvm-pretty-dir DIR
                       prepared LLVM/Emscripten prettyM package (default: $LLVM_PRETTY_DIR)
  --out-dir DIR        output deck directory (default: $OUT_DIR or _test/vir-code)
  --skip-fixtures      do not run lake exe test-fixtures-build first
  --publish            rsync the built deck to $PUBLISH_TARGET
  -h, --help           show this help

Environment:
  LEAN_VIR_DIR         lean-vir checkout
  NATIVE_PRETTY_DIR    prepared FIR prettyM package; omit for the three-way demo
  LLVM_PRETTY_DIR      prepared LLVM/Emscripten prettyM package; omit for no LLVM pane
  OUT_DIR              generated deck output directory
  PUBLISH_TARGET       rsync target for --publish
  VIR_REPORT_PATH      vir_irpkg report path (default: .lake/verso-pretty-report.md)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lean-vir-dir)
      lean_vir_dir="$2"
      shift 2
      ;;
    --native-pretty-dir)
      native_pretty_dir="$2"
      shift 2
      ;;
    --llvm-pretty-dir)
      llvm_pretty_dir="$2"
      shift 2
      ;;
    --out-dir)
      out_dir="$2"
      shift 2
      ;;
    --skip-fixtures)
      build_fixtures=0
      shift
      ;;
    --publish)
      publish=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -d "$lean_vir_dir" ]]; then
  echo "lean-vir checkout not found: $lean_vir_dir" >&2
  exit 1
fi

llvm_enabled=0
if [[ -n "$llvm_pretty_dir" ]]; then
  if [[ ! -d "$llvm_pretty_dir" ]]; then
    echo "LLVM pretty package not found: $llvm_pretty_dir" >&2
    exit 1
  fi
  llvm_pretty_dir="$(cd "$llvm_pretty_dir" && pwd -P)"
  llvm_required=(
    README.md
    SHA256SUMS
    emscripten-loader.mjs
    prettyM-emscripten-adapter.mjs
    prettyM.manifest.json
    prettyM.mjs
    prettyM.wasm
  )
  for llvm_file in "${llvm_required[@]}"; do
    if [[ ! -f "$llvm_pretty_dir/$llvm_file" ]]; then
      echo "LLVM pretty package is incomplete; missing $llvm_file" >&2
      exit 1
    fi
  done
  if ! (cd "$llvm_pretty_dir" && sha256sum -c --quiet SHA256SUMS); then
    echo "LLVM pretty package checksum verification failed: $llvm_pretty_dir" >&2
    exit 1
  fi
  python3 - "$llvm_pretty_dir/prettyM.manifest.json" <<'PY'
import json
from pathlib import Path
import re
import sys

manifest = json.loads(Path(sys.argv[1]).read_text())
abi = manifest.get("abi", {})
artifacts = manifest.get("artifacts", {})
build = manifest.get("build", {})
runtime = manifest.get("runtime", {})
toolchain = manifest.get("toolchain", {})
expected_exports = {
    "fir_lcnf_c_pretty_input_alloc",
    "fir_lcnf_c_pretty_render",
    "fir_lcnf_c_pretty_result_ptr",
    "fir_lcnf_c_pretty_result_len",
    "fir_lcnf_c_pretty_release",
}
digest = re.compile(r"^[0-9a-f]{64}$")

def artifact(label, filename):
    value = artifacts.get(label, {})
    return (
        value.get("file") == filename
        and isinstance(value.get("byteLength"), int)
        and value["byteLength"] > 0
        and isinstance(value.get("sha256"), str)
        and digest.fullmatch(value["sha256"]) is not None
    )

compile_flags = set(build.get("compileFlags", []))
link_flags = set(build.get("linkFlags", []))
checks = [
    (manifest.get("schemaVersion") == 1, "manifest schema"),
    (manifest.get("profile") == "emscripten", "Emscripten profile"),
    (manifest.get("pipeline") == "lean-final-impure-lcnf-to-c-to-wasm", "LLVM pipeline"),
    (toolchain.get("lean", {}).get("version") == "4.32.0", "Lean toolchain"),
    (isinstance(toolchain.get("lean", {}).get("commit"), str), "Lean provenance"),
    (isinstance(toolchain.get("emscripten", {}).get("version"), str), "Emscripten toolchain"),
    (runtime.get("threads") is True, "threaded runtime"),
    (runtime.get("wasmExceptions") is True, "Wasm exceptions"),
    (runtime.get("memoryGrowth") is True, "memory growth"),
    (set(abi.get("exports", [])) == expected_exports, "public bridge exports"),
    ("HEAPU8" in abi.get("runtimeMethods", []), "bulk-transfer heap view"),
    (artifact("module", "prettyM.mjs"), "JavaScript module artifact"),
    (artifact("wasm", "prettyM.wasm"), "Wasm artifact"),
    ({"-O3", "-flto", "-pthread"} <= compile_flags, "optimized compile flags"),
    ({"-O3", "-flto", "-pthread"} <= link_flags, "optimized link flags"),
    (build.get("exactFloatingPoint") is True, "exact floating-point mode"),
]
failed = [label for valid, label in checks if not valid]
if failed:
    raise SystemExit(
        "LLVM pretty package has an incompatible capability contract: "
        + ", ".join(failed)
    )
print(
    "validated LLVM pretty package: "
    f"lean={toolchain['lean']['version']}@{toolchain['lean']['commit']} "
    f"emscripten={toolchain['emscripten']['version']} "
    f"wasm={artifacts['wasm']['sha256']}"
)
PY
  llvm_enabled=1
fi

native_enabled=0
if [[ -n "$native_pretty_dir" ]]; then
  if [[ ! -d "$native_pretty_dir" ]]; then
    echo "native pretty package not found: $native_pretty_dir" >&2
    exit 1
  fi
  # Pin an atomic `prettyM-current` symlink to one immutable release before
  # validating or copying anything, so a concurrent package refresh cannot
  # mix files from two releases.
  native_pretty_dir="$(cd "$native_pretty_dir" && pwd -P)"
  native_required=(
    BUILD.json
    prettyM.wasm
    prettyM.wasm.json
    prettyM-browser-adapter.mjs
    SHA256SUMS
  )
  for native_file in "${native_required[@]}"; do
    if [[ ! -f "$native_pretty_dir/$native_file" ]]; then
      echo "native pretty package is incomplete; missing $native_file" >&2
      exit 1
    fi
  done
  if ! (cd "$native_pretty_dir" && sha256sum -c --quiet SHA256SUMS); then
    echo "native pretty package checksum verification failed: $native_pretty_dir" >&2
    exit 1
  fi
  python3 - "$native_pretty_dir/BUILD.json" "$native_pretty_dir/prettyM.wasm.json" <<'PY'
import json
from pathlib import Path
import sys

build = json.loads(Path(sys.argv[1]).read_text())
manifest = json.loads(Path(sys.argv[2]).read_text())
output = build.get("capabilities", {}).get("output", {})
browser_adapter = build.get("capabilities", {}).get("browserAdapter", {})
input_layout = build.get("capabilities", {}).get("inputLayout", {})
ownership = build.get("capabilities", {}).get("ownership", {})
expected_params = ["tobject", "tobject", "tobject", "tobject"]
checks = [
    (build.get("format") == "fir-prettyM-package-metadata-v2", "package metadata format"),
    (build.get("sourceDirty") is False, "clean source provenance"),
    (build.get("entry") == manifest.get("entry"), "entry point"),
    (build.get("params") == expected_params, "build parameter ABI"),
    (manifest.get("params") == expected_params, "manifest parameter ABI"),
    (build.get("result") == manifest.get("result") == "object", "result ABI"),
    (build.get("functionImports") == 0, "zero function imports"),
    (build.get("memoryImports") == 0, "zero memory imports"),
    (manifest.get("imports") == [], "empty import descriptor"),
    (build.get("capabilities", {}).get("representation") == "wasm32-lean64",
     "runtime representation"),
    (build.get("capabilities", {}).get("memoryOwner") == "module", "memory ownership"),
    (build.get("capabilities", {}).get("functionImportCount") == 0,
     "zero-import capability"),
    (browser_adapter.get("module") == "prettyM-browser-adapter.mjs",
     "browser adapter module"),
    (browser_adapter.get("apiVersion") == "fir.prettyM.browser/v1",
     "browser adapter API"),
    (set(browser_adapter.get("phases", [])) ==
     {"prepare", "execute", "decode", "render"}, "browser adapter phases"),
    ({"normalizeMs", "allocateMs", "encodeMs", "prepareMs", "executeMs", "decodeMs"}
     <= set(browser_adapter.get("timings", [])), "browser adapter timings"),
    (input_layout.get("version") == "lean-4.32-Std.Format.compact/v1",
     "versioned input layout"),
    (ownership.get("version") == "fir.prettyM.module-owned-transfer/v1",
     "versioned ownership contract"),
    (ownership.get("allocator") == "single-bulk-resident-allocation-per-render",
     "bulk resident input allocation"),
    (output.get("semantic") == "PrettyTrace", "styled output semantic"),
    (output.get("taggedSegments") is True, "tagged segment capability"),
]
failed = [label for valid, label in checks if not valid]
if failed:
    raise SystemExit(
        "native pretty package has an incompatible capability contract: "
        + ", ".join(failed)
    )
print(
    "validated native pretty package: "
    f"source={build['sourceCommit']} "
    f"wasm={build['artifact']['sha256']} "
    f"imports={build['functionImports']}"
)
PY
  native_enabled=1
fi

esbuild="$lean_vir_dir/node_modules/.bin/esbuild"
if [[ ! -x "$esbuild" ]]; then
  echo "esbuild not found at $esbuild; run npm install in $lean_vir_dir" >&2
  exit 1
fi

report_path="${VIR_REPORT_PATH:-$repo_root/.lake/verso-pretty-report.md}"

if [[ "$build_fixtures" -eq 1 ]]; then
  (cd "$repo_root" && lake exe test-fixtures-build)
fi

if [[ ! -f "$fixture_dir/index.html" ]]; then
  echo "fixture deck not found: $fixture_dir/index.html" >&2
  echo "run lake exe test-fixtures-build first, or omit --skip-fixtures" >&2
  exit 1
fi

mkdir -p "$out_dir"
out_dir="$(cd "$out_dir" && pwd)"
fixture_dir="$(cd "$fixture_dir" && pwd)"
if [[ "$out_dir" != "$fixture_dir" ]]; then
  rsync -a --delete "$fixture_dir"/ "$out_dir"/
fi
lib_dir="$out_dir/lib"

mkdir -p "$lib_dir/lean-vir/wasm" "$(dirname "$report_path")"
rm -rf "$lib_dir/lean-vir/js"
mkdir -p "$lib_dir/lean-vir/js"
rm -rf "$lib_dir/lean-native"
rm -rf "$lib_dir/lean-llvm"
release_wasm="$lean_vir_dir/web/public/vir-upstream.wasm"
debug_wasm="$lean_vir_dir/web/public/vir-upstream.dev.wasm"

if [[ ! -f "$release_wasm" ]]; then
  echo "release wasm not found: $release_wasm" >&2
  echo "run npm run build:demo:release in $lean_vir_dir" >&2
  exit 1
fi
if [[ ! -f "$debug_wasm" ]]; then
  echo "debug wasm companion not found: $debug_wasm" >&2
  echo "run npm run build:demo:release in $lean_vir_dir" >&2
  exit 1
fi
if cmp -s "$release_wasm" "$debug_wasm"; then
  echo "refusing to publish a dev/unstripped wasm as vir-upstream.wasm" >&2
  echo "release and debug wasm artifacts are byte-identical:" >&2
  echo "  $release_wasm" >&2
  echo "  $debug_wasm" >&2
  echo "run npm run build:demo:release in $lean_vir_dir" >&2
  exit 1
fi

(cd "$lean_vir_dir" && lake exe vir_irpkg \
  "$lib_dir/verso-pretty.irpkg" \
  "$report_path" \
  --target "$repo_root/VersoSlides/Pretty.lean" \
  VersoSlides.Pretty.formatJsonSegmentsJsonForVir \
  VersoSlides.Pretty.formatSegmentsForVir)

cp "$release_wasm" "$lib_dir/lean-vir/wasm/vir-upstream.wasm"

"$esbuild" "$lean_vir_dir/web/src/vir-runtime.js" \
  --bundle \
  --format=esm \
  --platform=browser \
  --target=es2020 \
  --minify \
  --outfile="$lib_dir/lean-vir/js/vir-runtime.js"

if [[ "$native_enabled" -eq 1 ]]; then
  mkdir -p "$lib_dir/lean-native"
  install -m 0644 "$native_pretty_dir/BUILD.json" "$lib_dir/lean-native/BUILD.json"
  install -m 0644 "$native_pretty_dir/prettyM.wasm" "$lib_dir/lean-native/prettyM.wasm"
  install -m 0644 "$native_pretty_dir/prettyM.wasm.json" \
    "$lib_dir/lean-native/prettyM.wasm.json"
  install -m 0644 "$native_pretty_dir/prettyM-browser-adapter.mjs" \
    "$lib_dir/lean-native/prettyM-browser-adapter.mjs"
fi

if [[ "$llvm_enabled" -eq 1 ]]; then
  mkdir -p "$lib_dir/lean-llvm"
  for llvm_file in "${llvm_required[@]}"; do
    install -m 0644 "$llvm_pretty_dir/$llvm_file" "$lib_dir/lean-llvm/$llvm_file"
  done
fi

python3 - "$out_dir/index.html" "$native_enabled" "$llvm_enabled" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
native_enabled = sys.argv[2] == "1"
llvm_enabled = sys.argv[3] == "1"
body = path.read_text()
body = re.sub(
    r'\n\s*<script>\s*window\.__versoPrettyConfig\s*=\s*\{.*?\};\s*</script>\s*'
    r'\n\s*<script src="lib/pretty-vir\.js"></script>'
    r'(?:\s*\n\s*<script src="lib/pretty-(?:native|llvm)\.js"></script>)*',
    "",
    body,
)
needle = '    <script src="lib/pretty.js"></script>\n    <script src="lib/panel.js"></script>'
scripts = (
    '    <script src="lib/pretty.js"></script>\n'
    '    <script>\n'
    '      window.__versoPrettyConfig = { compare: true, controls: true, columns: 40 };\n'
    '    </script>\n'
    '    <script src="lib/pretty-vir.js"></script>\n'
)
if native_enabled:
    scripts += '    <script src="lib/pretty-native.js"></script>\n'
if llvm_enabled:
    scripts += '    <script src="lib/pretty-llvm.js"></script>\n'
replacement = scripts + '    <script src="lib/panel.js"></script>'
if needle not in body:
    raise SystemExit("could not find pretty.js/panel.js script sequence in generated deck")
path.write_text(body.replace(needle, replacement, 1))
PY

if [[ "$llvm_enabled" -eq 1 ]]; then
  python3 - "$out_dir/.htaccess" <<'PY'
from pathlib import Path
import sys

Path(sys.argv[1]).write_text("""<IfModule mod_headers.c>
  Header always set Cross-Origin-Opener-Policy "same-origin"
  Header always set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
""")
PY
else
  rm -f "$out_dir/.htaccess"
fi

if [[ "$publish" -eq 1 ]]; then
  rsync -az --delete "$out_dir"/ "$publish_target"
  echo "Published VIR pretty-printer demo to $publish_target"
fi

echo "Built VIR pretty-printer demo at $out_dir"
