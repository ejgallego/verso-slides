#!/usr/bin/env bash
set -euo pipefail

demo_root="$(cd "$(dirname "$0")/.." && pwd)"
artifact_dir="$demo_root/_artifacts"
out_dir="${OUT_DIR:-$demo_root/_site}"
workspace_root="$(cd "$demo_root/../.." && pwd)"
lean_vir_dir="${LEAN_VIR_DIR:-$workspace_root/_artifacts/lean-vir}"
native_flat_dir="$artifact_dir/lean-native-flat"
native_flat_enabled=0
native_html_dir="$artifact_dir/lean-native-html"
native_html_enabled=0

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

if [[ -d "$native_flat_dir" ]]; then
  python3 "$demo_root/scripts/validate-native-flat-package.py" "$native_flat_dir"
  native_flat_enabled=1
fi

if [[ -d "$native_html_dir" ]]; then
  python3 "$demo_root/scripts/validate-native-html-package.py" "$native_html_dir"
  native_html_enabled=1
fi

(cd "$demo_root" &&
  lake build vir-pretty-demo &&
  lake exe vir-pretty-demo)

# The ordinary Verso Slides package ships the compact production panel. This
# standalone lab explicitly replaces those two generated assets with its matrix
# formatter and control surface.
install -m 0644 "$demo_root/web/formatter-lab.js" "$out_dir/lib/pretty.js"
install -m 0644 "$demo_root/web/panel-lab.js" "$out_dir/lib/panel.js"

if [[ "$native_flat_enabled" -eq 1 ]]; then
  python3 - "$out_dir/index.html" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
body = path.read_text()
needle = '    <script src="vir-pretty/pretty-native-flat.js"></script>'
config = '''    <script>
      window.__versoPrettyNativeFlatConfig = {
        adapterUrl: new URL("vir-pretty/lean-native-flat/prettyM-browser-adapter.mjs", window.location.href).href,
        wasmUrl: new URL("vir-pretty/lean-native-flat/prettyM.wasm", window.location.href).href,
        descriptorUrl: new URL("vir-pretty/lean-native-flat/prettyM.wasm.json", window.location.href).href,
        buildUrl: new URL("vir-pretty/lean-native-flat/BUILD.json", window.location.href).href
      };
    </script>
'''
if needle not in body:
    raise SystemExit("could not find native-flat panel plugin in generated deck")
path.write_text(body.replace(needle, config + needle, 1))
PY
fi


if [[ "$native_html_enabled" -eq 1 ]]; then
  python3 - "$out_dir/index.html" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
body = path.read_text()
needle = '    <script src="vir-pretty/pretty-native-html.js"></script>'
config = '''    <script>
      window.__versoPrettyNativeHtmlConfig = {
        adapterUrl: new URL("vir-pretty/lean-native-html/prettyM-browser-adapter.mjs", window.location.href).href,
        wasmUrl: new URL("vir-pretty/lean-native-html/prettyM.wasm", window.location.href).href,
        descriptorUrl: new URL("vir-pretty/lean-native-html/prettyM.wasm.json", window.location.href).href,
        buildUrl: new URL("vir-pretty/lean-native-html/BUILD.json", window.location.href).href
      };
    </script>
'''
if needle not in body:
    raise SystemExit("could not find native-html panel plugin in generated deck")
path.write_text(body.replace(needle, config + needle, 1))
PY
fi

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
  --pretty-source "$workspace_root/VersoSlides/Pretty.lean"

(cd "$lean_vir_dir" && lake exe vir_irpkg \
  "$out_dir/vir-pretty/verso-pretty.irpkg" \
  "$registry_dir/report.md" \
  --target "$registry_source" \
  VersoSlides.Pretty.formatJsonSegmentsJsonForVir \
  VersoSlides.Pretty.formatSegmentsForVir \
  VersoSlides.Pretty.formatRenderedForVir \
  VersoSlides.Pretty.formatRenderPlanForVir \
  VersoSlides.Pretty.formatHtmlForVir \
  VersoSlides.PrettyRegistry.formatCountForVir \
  VersoSlides.PrettyRegistry.formatRenderedByIdForVir \
  VersoSlides.PrettyRegistry.formatRenderPlanByIdForVir)

for asset in pretty-experiments.js pretty-vir.js pretty-native.js pretty-native-flat.js pretty-native-html.js pretty-llvm.js coi-register.js; do
  install -D -m 0644 "$demo_root/web/$asset" "$out_dir/vir-pretty/$asset"
done
install -D -m 0644 "$demo_root/web/coi-serviceworker.js" "$out_dir/coi-serviceworker.js"
install -D -m 0644 "$demo_root/web/htaccess" "$out_dir/.htaccess"

for path in "${required[@]}"; do
  case "$path" in
    lean-native/*) continue ;;
  esac
  install -D -m 0644 "$artifact_dir/$path" "$out_dir/vir-pretty/$path"
done
python3 "$demo_root/scripts/copy-checksummed-subset.py" \
  "$artifact_dir/lean-native" \
  "$out_dir/vir-pretty/lean-native" \
  BUILD.json prettyM-browser-adapter.mjs prettyM.wasm prettyM.wasm.json
rm -rf "$out_dir/vir-pretty/lean-native-flat"
if [[ "$native_flat_enabled" -eq 1 ]]; then
  python3 "$demo_root/scripts/copy-checksummed-subset.py" \
    "$native_flat_dir" \
    "$out_dir/vir-pretty/lean-native-flat" \
    BUILD.json prettyM-browser-adapter.mjs prettyM.wasm prettyM.wasm.json
fi
rm -rf "$out_dir/vir-pretty/lean-native-html"
if [[ "$native_html_enabled" -eq 1 ]]; then
  python3 "$demo_root/scripts/copy-checksummed-subset.py" \
    "$native_html_dir" \
    "$out_dir/vir-pretty/lean-native-html" \
    BUILD.json prettyM-browser-adapter.mjs prettyM.wasm prettyM.wasm.json
fi

echo "Assembled standalone demo at $out_dir"
