#!/usr/bin/env bash
set -euo pipefail

demo_root="$(cd "$(dirname "$0")/.." && pwd)"
artifact_dir="$demo_root/_artifacts"
out_dir="${OUT_DIR:-$demo_root/_site}"
workspace_root="$(cd "$demo_root/../.." && pwd)"
lean_vir_dir="${LEAN_VIR_DIR:-$workspace_root/_artifacts/lean-vir}"

required=(
  lean-vir/js/vir-runtime.js
  lean-vir/wasm/vir-upstream.wasm
  lean-native/BUILD.json
  lean-native/SHA256SUMS
  lean-native/prettyM-browser-adapter.mjs
  lean-native/prettyM.wasm
  lean-native/prettyM.wasm.json
  lean-llvm/README.md
  lean-llvm/SHA256SUMS
  lean-llvm/emscripten-loader.mjs
  lean-llvm/prettyM-emscripten-adapter.mjs
  lean-llvm/prettyM.manifest.json
  lean-llvm/prettyM.mjs
  lean-llvm/prettyM.wasm
)

for path in "${required[@]}"; do
  if [[ ! -f "$artifact_dir/$path" ]]; then
    echo "missing staged artifact: $path" >&2
    echo "run scripts/stage-artifacts.sh first" >&2
    exit 1
  fi
done

(cd "$demo_root" &&
  lake build vir-pretty-demo VirPrettyDemo.Pretty &&
  lake exe vir-pretty-demo)

if [[ ! -x "$lean_vir_dir/.lake/build/bin/vir_irpkg" ]]; then
  echo "lean-vir package generator not found: $lean_vir_dir/.lake/build/bin/vir_irpkg" >&2
  echo "set LEAN_VIR_DIR to a built lean-vir checkout" >&2
  exit 1
fi

registry_dir="$demo_root/.lake/verso-pretty-registry"
registry_source="$registry_dir/PrettyRegistry.lean"
python3 "$demo_root/scripts/generate-pretty-registry.py" \
  "$out_dir" \
  "$registry_source" \
  "$out_dir/vir-pretty/verso-pretty-registry.json" \
  --pretty-source "$demo_root/VirPrettyDemo/Pretty.lean"

(cd "$lean_vir_dir" && lake exe vir_irpkg \
  "$out_dir/vir-pretty/verso-pretty.irpkg" \
  "$registry_dir/report.md" \
  --target "$registry_source" \
  VersoSlides.Pretty.formatJsonSegmentsJsonForVir \
  VersoSlides.Pretty.formatSegmentsForVir \
  VersoSlides.Pretty.formatRenderedForVir \
  VersoSlides.PrettyRegistry.formatCountForVir \
  VersoSlides.PrettyRegistry.formatRenderedByIdForVir)

for asset in pretty-experiments.js pretty-vir.js pretty-native.js pretty-llvm.js coi-register.js; do
  install -D -m 0644 "$demo_root/web/$asset" "$out_dir/vir-pretty/$asset"
done
install -D -m 0644 "$demo_root/web/coi-serviceworker.js" "$out_dir/coi-serviceworker.js"
install -D -m 0644 "$demo_root/web/htaccess" "$out_dir/.htaccess"

for path in "${required[@]}"; do
  install -D -m 0644 "$artifact_dir/$path" "$out_dir/vir-pretty/$path"
done

echo "Assembled standalone demo at $out_dir"
