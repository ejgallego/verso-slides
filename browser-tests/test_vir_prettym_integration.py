from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_review_surface_replaces_only_prettym_layout():
    pretty = (ROOT / "web-lib" / "panel" / "pretty.js").read_text()
    assert "function prettyM(" not in pretty
    assert "function be(" not in pretty
    assert 'window.versoVir.call(' in pretty
    assert '"VersoSlides.VirPrettyM.formatSegments"' in pretty
    runtime = (ROOT / "web-lib" / "vir-prettym" / "runtime.js").read_text()
    assert "window.versoVirReady" in runtime
    assert "__versoPrettyM" not in runtime
    assert "function goalsToHtml(" in pretty
    assert "function segmentsToHtml(" in pretty
    assert "function createDOMMeasurer(" in pretty


def test_demo_selects_the_narrow_vir_runtime():
    main = (ROOT / "Main.lean").read_text()
    assert 'filename := "vir-prettym-runtime.js"' in main
    assert 'destination := "vir-prettym"' in main
    assert 'source := ".lake/build/vir/browser/VirPrettyM"' in main
    assert "coi-register" not in main
    assert "vir-panel" not in main

    export = (ROOT / "VirPrettyM.lean").read_text()
    assert export.count("@[vir_export]") == 1
    assert "def formatSegments" in export


def test_demo_uses_the_declarative_vir_browser_facet():
    lakefile = (ROOT / "lakefile.lean").read_text()
    assert "require lean_vir from git" in lakefile
    assert "needs := #[`+VirPrettyM:virBrowser]" in lakefile
    assert "target virPrettyMDemoAssets" not in lakefile
    assert "IO.Process" not in lakefile
    assert "integration/vir-prettym" not in lakefile
    assert not (ROOT / "integration" / "vir-prettym").exists()
