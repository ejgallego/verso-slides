from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_observability_keeps_direct_vir_backend_with_explicit_js_baseline():
    pretty = (ROOT / "web-lib" / "panel" / "pretty.js").read_text()
    assert "function prettyM(" in pretty
    assert "function be(" in pretty
    assert 'window.versoVir.call(' in pretty
    assert '"VersoSlides.VirPrettyM.formatSegments"' in pretty
    runtime = (ROOT / "web-lib" / "vir-prettym" / "runtime.js").read_text()
    assert "window.versoVirReady" in runtime
    assert "__versoPrettyM" not in runtime
    assert "function goalsToHtml(" in pretty
    assert "function segmentsToHtml(" in pretty
    assert "function createDOMMeasurer(" in pretty


def test_narrow_runtime_remains_available_below_panel_followup():
    export = (ROOT / "VirPrettyM.lean").read_text()
    assert export.count("@[vir_export]") == 1
    assert "def formatSegments" in export
    pretty = (ROOT / "web-lib" / "panel" / "pretty.js").read_text()
    assert 'window.versoVir.call(' in pretty
    assert '"VersoSlides.VirPrettyM.formatSegments"' in pretty
