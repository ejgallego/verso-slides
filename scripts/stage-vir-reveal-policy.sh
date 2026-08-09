#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
lean_vir_dir="${LEAN_VIR_DIR:-$repo_root/_artifacts/lean-vir}"
policy_dir="${POLICY_DIR:-$repo_root/.lake/verso-reveal-policy}"
deck_dir="${DECK_DIR:-$repo_root/_test/diagramanim}"
stage_dir="$deck_dir/lib/verso-reveal-vir"
esbuild="$lean_vir_dir/node_modules/.bin/esbuild"

LEAN_VIR_DIR="$lean_vir_dir" OUT_DIR="$policy_dir" \
  "$repo_root/scripts/build-vir-reveal-policy.sh"

if [[ ! -f "$deck_dir/index.html" ]]; then
  echo "generated animation fixture not found: $deck_dir/index.html" >&2
  echo "run lake exe test-fixtures-build first" >&2
  exit 1
fi
if [[ ! -x "$esbuild" ]]; then
  echo "esbuild not found: $esbuild" >&2
  exit 1
fi

mkdir -p "$stage_dir"
install -m 0644 \
  "$policy_dir/verso-reveal-policy.irpkg" \
  "$stage_dir/verso-reveal-policy.irpkg"
install -m 0644 \
  "$lean_vir_dir/web/public/vir-upstream.wasm" \
  "$stage_dir/vir-upstream.wasm"
"$esbuild" "$lean_vir_dir/web/src/vir-runtime.js" \
  --bundle \
  --format=esm \
  --platform=browser \
  --target=es2020 \
  --minify \
  --outfile="$stage_dir/vir-runtime.js"

echo "staged optional VIR Reveal policy under $stage_dir"
echo "open the deck with ?revealPolicy=vir to enable it"
