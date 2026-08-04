#!/usr/bin/env bash
set -euo pipefail

demo_root="$(cd "$(dirname "$0")/.." && pwd)"
artifact_dir="$demo_root/_artifacts"
out_dir="${OUT_DIR:-$demo_root/_site}"

required=(
  lean-vir/js/vir-runtime.js
  lean-vir/wasm/vir-upstream.wasm
  verso-pretty.irpkg
  lean-native/BUILD.json
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

for asset in pretty-vir.js pretty-native.js pretty-llvm.js coi-register.js; do
  install -D -m 0644 "$demo_root/web/$asset" "$out_dir/vir-pretty/$asset"
done
install -D -m 0644 "$demo_root/web/coi-serviceworker.js" "$out_dir/coi-serviceworker.js"
install -D -m 0644 "$demo_root/web/htaccess" "$out_dir/.htaccess"

for path in "${required[@]}"; do
  install -D -m 0644 "$artifact_dir/$path" "$out_dir/vir-pretty/$path"
done

echo "Assembled standalone demo at $out_dir"
