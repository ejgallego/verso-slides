#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
lean_vir_dir="${LEAN_VIR_DIR:-/tmp/lean-vir}"
out_dir="${OUT_DIR:-$repo_root/_test/code}"
publish_target="${PUBLISH_TARGET:-x80.org:/srv/www/vir-verso-slides-demo/}"
build_fixtures=1
publish=0

usage() {
  cat <<'EOF'
Usage: scripts/build-vir-pretty-demo.sh [options]

Build the VIR pretty-printer demo deck under _test/code.

Options:
  --lean-vir-dir DIR   lean-vir checkout to use (default: $LEAN_VIR_DIR or /tmp/lean-vir)
  --out-dir DIR        output deck directory (default: $OUT_DIR or _test/code)
  --skip-fixtures      do not run lake exe test-fixtures-build first
  --publish            rsync the built deck to $PUBLISH_TARGET
  -h, --help           show this help

Environment:
  LEAN_VIR_DIR         lean-vir checkout
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

esbuild="$lean_vir_dir/node_modules/.bin/esbuild"
if [[ ! -x "$esbuild" ]]; then
  echo "esbuild not found at $esbuild; run npm install in $lean_vir_dir" >&2
  exit 1
fi

mkdir -p "$out_dir"
out_dir="$(cd "$out_dir" && pwd)"
lib_dir="$out_dir/lib"
report_path="${VIR_REPORT_PATH:-$repo_root/.lake/verso-pretty-report.md}"

if [[ "$build_fixtures" -eq 1 ]]; then
  (cd "$repo_root" && lake exe test-fixtures-build)
fi

mkdir -p "$lib_dir/lean-vir/wasm" "$(dirname "$report_path")"
rm -rf "$lib_dir/lean-vir/js"
mkdir -p "$lib_dir/lean-vir/js"
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
  VersoSlides.Pretty.formatCompatSegmentsForVir)

cp "$release_wasm" "$lib_dir/lean-vir/wasm/vir-upstream.wasm"

"$esbuild" "$lean_vir_dir/web/src/vir-runtime.js" \
  --bundle \
  --format=esm \
  --platform=browser \
  --target=es2020 \
  --minify \
  --outfile="$lib_dir/lean-vir/js/vir-runtime.js"

python3 - "$out_dir/index.html" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
body = path.read_text()
body = re.sub(
    r'\n\s*<script>\s*window\.__versoPrettyVirConfig\s*=\s*\{\s*compare:\s*true\s*\};\s*</script>\s*'
    r'\n\s*<script src="lib/pretty-vir\.js"></script>',
    "",
    body,
)
needle = '    <script src="lib/pretty.js"></script>\n    <script src="lib/panel.js"></script>'
replacement = (
    '    <script src="lib/pretty.js"></script>\n'
    '    <script>\n'
    '      window.__versoPrettyVirConfig = { compare: true };\n'
    '    </script>\n'
    '    <script src="lib/pretty-vir.js"></script>\n'
    '    <script src="lib/panel.js"></script>'
)
if needle not in body:
    raise SystemExit("could not find pretty.js/panel.js script sequence in generated deck")
path.write_text(body.replace(needle, replacement, 1))
PY

if [[ "$publish" -eq 1 ]]; then
  rsync -az --delete "$out_dir"/ "$publish_target"
  echo "Published VIR pretty-printer demo to $publish_target"
fi

echo "Built VIR pretty-printer demo at $out_dir"
