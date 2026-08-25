#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
integration_dir="$repo_root/integration/vir-panel"
out_dir="${OUT_DIR:-$repo_root/_slides}"
vir_runtime_dir="${LEAN_VIR_RUNTIME_DIR:-$integration_dir/.lake/packages/lean_vir}"
module_set_dir="$integration_dir/.lake/build/vir/module-sets"
registry_source="$integration_dir/VirPanelRegistry.lean"

(cd "$repo_root" && lake build demo-slides && lake exe demo-slides)

# This review profile contains no JavaScript semantic formatter. It retains
# only DOM measurement, while VIR owns resident data, prettyM, and React VDOM.
install -m 0644 "$repo_root/web-lib/vir-panel/panel-measurer.js" "$out_dir/lib/pretty.js"

python3 "$repo_root/scripts/generate-vir-panel-registry.py" \
  "$out_dir" \
  "$registry_source" \
  "$out_dir/vir-panel/registry.json"

(cd "$integration_dir" && lake build +VirPanelRegistry:vir)

if [[ ! -f "$vir_runtime_dir/web/public/vir-upstream.wasm" ]]; then
  echo "building the pinned VIR browser runtime" >&2
  (cd "$vir_runtime_dir" && npm install && npm run install:wasi && npm run build:demo:release)
fi

esbuild="$vir_runtime_dir/node_modules/.bin/esbuild"
if [[ ! -x "$esbuild" ]]; then
  echo "esbuild not found after VIR setup: $esbuild" >&2
  exit 1
fi

browser_runtime="$vir_runtime_dir/web/src/apps/browser-react-runtime.js"
if [[ ! -f "$browser_runtime" ]]; then
  browser_runtime="$vir_runtime_dir/web/src/browser-react-runtime.js"
fi
if [[ ! -f "$browser_runtime" ]]; then
  echo "VIR browser React runtime source not found under $vir_runtime_dir/web/src" >&2
  exit 1
fi

rm -rf "$out_dir/vir-panel/ir" "$out_dir/vir-panel/lean-vir"
rm -f "$out_dir/vir-panel/coi-register.js" "$out_dir/coi-serviceworker.js"
mkdir -p "$out_dir/vir-panel/ir"
install -m 0644 \
  "$module_set_dir/VirPanelRegistry.irpkg-set.json" \
  "$module_set_dir/VirPanelRegistry.irpkg" \
  "$out_dir/vir-panel/ir/"
rsync -a \
  "$module_set_dir/VirPanelRegistry.parts/" \
  "$out_dir/vir-panel/ir/VirPanelRegistry.parts/"

"$esbuild" "$browser_runtime" \
  --bundle \
  --format=esm \
  --platform=browser \
  --target=es2020 \
  --minify \
  --outfile="$out_dir/vir-panel/lean-vir/js/vir-runtime.js"

install -D -m 0644 \
  "$vir_runtime_dir/web/public/vir-upstream.wasm" \
  "$out_dir/vir-panel/lean-vir/wasm/vir-upstream.wasm"
install -m 0644 \
  "$repo_root/web-lib/vir-panel/runtime.js" \
  "$repo_root/web-lib/vir-panel/component.js" \
  "$out_dir/vir-panel/"

echo "built unconditional VIR panel demo at $out_dir"
