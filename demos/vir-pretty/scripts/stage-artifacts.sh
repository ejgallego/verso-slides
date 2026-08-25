#!/usr/bin/env bash
set -euo pipefail

demo_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(cd "$demo_root/../.." && pwd)"
seed_dir="${1:-$workspace_root/_test/vir-code/lib}"
artifact_dir="$demo_root/_artifacts"
lean_vir_dir="${LEAN_VIR_DIR:-$workspace_root/_artifacts/lean-vir}"
lean_vir_wasm="$lean_vir_dir/web/public/vir-upstream.wasm"

seed_dir="$(realpath "$seed_dir")"
case "$seed_dir/" in
  "$workspace_root"/*) ;;
  *)
    echo "artifact seed must be inside the workspace: $workspace_root" >&2
    exit 2
    ;;
esac

required=(
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
  lean-llvm-html/README.md
  lean-llvm-html/SHA256SUMS
  lean-llvm-html/emscripten-loader.mjs
  lean-llvm-html/prettyM-emscripten-adapter.mjs
  lean-llvm-html/prettyM-html-emscripten-adapter.mjs
  lean-llvm-html/prettyM-html.manifest.json
  lean-llvm-html/prettyM-html.mjs
  lean-llvm-html/prettyM-html.wasm
)

for path in "${required[@]}"; do
  if [[ ! -f "$seed_dir/$path" ]]; then
    echo "artifact seed is incomplete; missing $path" >&2
    exit 1
  fi
done

if [[ ! -f "$lean_vir_wasm" ]]; then
  echo "missing locally built VIR runtime: $lean_vir_wasm" >&2
  echo "build the matching checkout with 'npm run build:demo:release' first" >&2
  exit 1
fi

(cd "$seed_dir/lean-llvm" && sha256sum -c --quiet SHA256SUMS)
(cd "$seed_dir/lean-llvm-html" && sha256sum -c --quiet SHA256SUMS)

rm -rf "$artifact_dir/lean-vir"
install -D -m 0644 \
  "$lean_vir_wasm" \
  "$artifact_dir/lean-vir/wasm/vir-upstream.wasm"

for path in "${required[@]}"; do
  case "$path" in
    lean-native/*) continue ;;
  esac
  install -D -m 0644 "$seed_dir/$path" "$artifact_dir/$path"
done
python3 "$demo_root/scripts/copy-checksummed-subset.py" \
  "$seed_dir/lean-native" \
  "$artifact_dir/lean-native" \
  BUILD.json prettyM-browser-adapter.mjs prettyM.wasm prettyM.wasm.json

# Optional artifacts describe the current seed, not an accumulation of past
# refreshes. Clear an older candidate before deciding whether this seed has one.
rm -rf "$artifact_dir/lean-native-flat"
if [[ -d "$seed_dir/lean-native-flat" ]]; then
  python3 "$demo_root/scripts/validate-native-flat-package.py" \
    "$seed_dir/lean-native-flat"
  python3 "$demo_root/scripts/copy-checksummed-subset.py" \
    "$seed_dir/lean-native-flat" \
    "$artifact_dir/lean-native-flat" \
    BUILD.json prettyM-browser-adapter.mjs prettyM.wasm prettyM.wasm.json
fi

rm -rf "$artifact_dir/lean-native-html"
if [[ -d "$seed_dir/lean-native-html" ]]; then
  python3 "$demo_root/scripts/validate-native-html-package.py" \
    "$seed_dir/lean-native-html"
  python3 "$demo_root/scripts/copy-checksummed-subset.py" \
    "$seed_dir/lean-native-html" \
    "$artifact_dir/lean-native-html" \
    BUILD.json prettyM-browser-adapter.mjs prettyM.wasm prettyM.wasm.json
fi

echo "Staged VIR runtime from $lean_vir_dir plus available native and LLVM artifacts from $seed_dir"
