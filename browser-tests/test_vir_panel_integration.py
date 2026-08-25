import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_PATH = ROOT / "scripts" / "generate-vir-panel-registry.py"


def load_generator():
    spec = importlib.util.spec_from_file_location("vir_panel_registry", GENERATOR_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_generator_accepts_signed_nest_indents():
    generator = load_generator()
    assert generator.format_expr([3, -2, "x"]) == (
        'Std.Format.nest (-2) (Std.Format.text "x")'
    )


def test_generated_package_is_only_the_resident_panel_surface():
    generator = load_generator()
    registry = generator.Registry()
    signature = {
        "fmt": [5, [7, 4, "Nat"]],
        "annotations": {"4": {"cssClass": "const", "binding": "Nat"}},
    }
    encoded = json.dumps(signature, separators=(",", ":"))
    body = f'<code data-rich-format="{encoded.replace(chr(34), "&quot;")}"></code>'
    patched = registry.patch_html(body)
    source = registry.panel_module()

    assert 'data-vir-panel-content="0"' in patched
    assert "@[vir_export]\ndef mountContent" in source
    assert "@[vir_export]\ndef unmount" in source
    assert "VersoSlides.VirPanel.view" in source
    assert "formatSegments" not in source
    assert "formatHtml" not in source
    assert "planRevealPolicy" not in source


def test_demo_selects_direct_vir_assets_without_backend_controls():
    main = (ROOT / "Main.lean").read_text()
    assert '"vir-panel/runtime.js"' in main
    assert '"vir-panel/component.js"' in main
    assert "coi-register" not in main
    assert "panelPlugins" not in main

    component = (ROOT / "web-lib" / "vir-panel" / "component.js").read_text()
    assert 'root.__versoPanelRenderer = { render: renderPanel, release: releasePanel }' in component
    assert "callTimed" not in component
    assert "pretty-controls" not in component
