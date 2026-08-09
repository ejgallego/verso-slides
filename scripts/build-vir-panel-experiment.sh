#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
experiment_dir="$repo_root/experiments/vir-panel"
lean_vir_dir="${LEAN_VIR_DIR:-$repo_root/_artifacts/lean-vir}"
out_dir="${OUT_DIR:-$repo_root/_test/vir-panel}"
module_set_dir="$experiment_dir/.lake/build/vir/module-sets"
esbuild="$lean_vir_dir/node_modules/.bin/esbuild"

if [[ ! -x "$esbuild" ]]; then
  echo "esbuild not found: $esbuild" >&2
  exit 1
fi
if [[ ! -f "$lean_vir_dir/web/public/vir-upstream.wasm" ]]; then
  echo "VIR release runtime not found under $lean_vir_dir/web/public" >&2
  exit 1
fi

(cd "$experiment_dir" && lake build +VirPanelExperiment:vir)

mkdir -p "$out_dir/ir"
rsync -a --delete "$module_set_dir/" "$out_dir/ir/"
install -m 0644 "$experiment_dir/index.html" "$out_dir/index.html"
install -m 0644 "$experiment_dir/app.js" "$out_dir/app.js"
install -m 0644 "$lean_vir_dir/web/public/vir-upstream.wasm" "$out_dir/vir-upstream.wasm"

"$esbuild" "$lean_vir_dir/web/src/browser-react-runtime.js" \
  --bundle \
  --format=esm \
  --platform=browser \
  --target=es2020 \
  --minify \
  --outfile="$out_dir/vir-react-runtime.js"

echo "built VIR panel experiment at $out_dir"
