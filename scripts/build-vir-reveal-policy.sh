#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
lean_vir_dir="${LEAN_VIR_DIR:-$repo_root/_artifacts/lean-vir}"
out_dir="${OUT_DIR:-$repo_root/.lake/verso-reveal-policy}"
generator="$lean_vir_dir/.lake/build/bin/vir_irpkg"
runtime="$lean_vir_dir/web/src/vir-runtime-node.js"
wasm="$lean_vir_dir/web/public/vir-upstream.wasm"

for required in "$generator" "$runtime" "$wasm"; do
  if [[ ! -f "$required" ]]; then
    echo "missing VIR asset: $required" >&2
    exit 1
  fi
done

mkdir -p "$out_dir"

cd "$repo_root"
lake build +Illuminate.Animation.Types:ir VersoSlides.Animate.RevealPolicy
lake env "$generator" \
  "$out_dir/verso-reveal-policy.irpkg" \
  "$out_dir/REPORT.md" \
  --target "$repo_root/VersoSlides/Animate/RevealPolicy.lean" \
  VersoSlides.RevealPolicy.Policy.plan

node "$repo_root/scripts/test-vir-reveal-policy.mjs" \
  "$lean_vir_dir" \
  "$out_dir/verso-reveal-policy.irpkg"

echo "staged Verso Reveal policy under $out_dir"
