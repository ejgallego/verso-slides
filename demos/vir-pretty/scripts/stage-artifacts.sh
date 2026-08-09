#!/usr/bin/env bash
set -euo pipefail

demo_root="$(cd "$(dirname "$0")/.." && pwd)"
workspace_root="$(cd "$demo_root/../.." && pwd)"
seed_dir="${1:-$workspace_root/_test/vir-code/lib}"
artifact_dir="$demo_root/_artifacts"

seed_dir="$(realpath "$seed_dir")"
case "$seed_dir/" in
  "$workspace_root"/*) ;;
  *)
    echo "artifact seed must be inside the workspace: $workspace_root" >&2
    exit 2
    ;;
esac

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
  if [[ ! -f "$seed_dir/$path" ]]; then
    echo "artifact seed is incomplete; missing $path" >&2
    exit 1
  fi
done

(cd "$seed_dir/lean-llvm" && sha256sum -c --quiet SHA256SUMS)

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

echo "Staged VIR runtime plus available native and LLVM artifacts from $seed_dir"
