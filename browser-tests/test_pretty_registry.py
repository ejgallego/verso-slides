"""Tests for the deck-specific resident Std.Format registry generator."""

import html
import json
import subprocess
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent.parent


def rich_attribute(payload) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f'data-rich-format="{html.escape(encoded, quote=True)}"'


def test_registry_deduplicates_and_attaches_ids(tmp_path: Path):
    site = tmp_path / "site"
    site.mkdir()
    shared = {"fmt": [7, 4, "α"], "annotations": {"4": {"cssClass": "const"}}}
    goal_payload = [
        {
            "name": None,
            "goalPrefix": "⊢",
            "hypotheses": [
                {"names": ["x"], "ppType": json.dumps(shared, ensure_ascii=False)}
            ],
            "ppConclusion": None,
        }
    ]
    (site / "index.html").write_text(
        f"<div {rich_attribute(goal_payload)}></div>"
        f"<code {rich_attribute(shared)}></code>"
        f"<code {rich_attribute({'fmt': shared['fmt'], 'annotations': {'4': {'cssClass': 'alt', 'binding': 'decl'}}})}></code>"
    )
    docs = {
        "entry": f'<code {rich_attribute({"fmt": [5, "β"], "annotations": {}})}></code>'
    }
    (site / "-verso-docs.json").write_text(json.dumps(docs, ensure_ascii=False))

    lean_output = tmp_path / "PrettyRegistry.lean"
    metadata_output = site / "lib" / "verso-pretty-registry.json"
    subprocess.run(
        [
            "python3",
            str(ROOT / "demos" / "vir-pretty" / "scripts" / "generate-pretty-registry.py"),
            str(site),
            str(lean_output),
            str(metadata_output),
        ],
        check=True,
        cwd=ROOT,
    )

    index = BeautifulSoup((site / "index.html").read_text(), "html.parser")
    goal_after = json.loads(index.select_one("div")["data-rich-format"])
    nested_after = json.loads(goal_after[0]["hypotheses"][0]["ppType"])
    direct_after = json.loads(index.select("code")[0]["data-rich-format"])
    alternate_after = json.loads(index.select("code")[1]["data-rich-format"])
    assert nested_after["formatId"] == 0
    assert direct_after["formatId"] == 0
    assert alternate_after["formatId"] == 1
    docs_after = json.loads((site / "-verso-docs.json").read_text())
    assert '"formatId":2' in html.unescape(docs_after["entry"])

    source = lean_output.read_text()
    assert 'Std.Format.tag 4 (Std.Format.text "α")' in source
    assert 'Std.Format.group (Std.Format.text "β") .allOrNone' in source
    assert "formatRenderedByIdForVir" in source
    assert "formatRenderPlanByIdForVir" in source
    assert '{ tag := 4, annotation := { cssClass := "const", binding := none } }' in source
    assert '{ tag := 4, annotation := { cssClass := "alt", binding := some "decl" } }' in source

    metadata = json.loads(metadata_output.read_text())
    assert metadata == {
        "schemaVersion": 2,
        "formatCount": 3,
        "idField": "formatId",
        "entrypoint": "VersoSlides.PrettyRegistry.formatRenderedByIdForVir",
        "output": "text-events-utf8/v1",
        "renderPlanEntrypoint": "VersoSlides.PrettyRegistry.formatRenderPlanByIdForVir",
        "renderPlanOutput": "semantic-render-plan/v1",
    }


def test_combined_registry_exports_formatter_and_panel_surfaces(tmp_path: Path):
    site = tmp_path / "site"
    site.mkdir()
    payload = {"fmt": [5, "Nat"], "annotations": {}}
    (site / "index.html").write_text(
        f"<code {rich_attribute(payload)}></code>"
    )
    lean_output = tmp_path / "VirPanelRegistry.lean"
    metadata_output = site / "verso-pretty-registry.json"

    subprocess.run(
        [
            "python3",
            str(ROOT / "demos" / "vir-pretty" / "scripts" / "generate-pretty-registry.py"),
            str(site),
            str(lean_output),
            str(metadata_output),
            "--combined-panel",
        ],
        check=True,
        cwd=ROOT,
    )

    source = lean_output.read_text()
    assert "def formatSegments" in source
    assert "def formatRenderedById" in source
    assert "def mountContent" in source
    assert source.count("private initialize formats") == 1

    metadata = json.loads(metadata_output.read_text())
    assert metadata["entrypoint"] == "VirPanelRegistry.formatRenderedById"
    assert metadata["renderPlanEntrypoint"] == "VirPanelRegistry.formatRenderPlanById"
    assert metadata["panelContentCount"] == 1
    assert metadata["panelEntrypoint"] == "VirPanelRegistry.mountContent"


def test_panel_only_registry_omits_formatter_exports(tmp_path: Path):
    site = tmp_path / "site"
    site.mkdir()
    payload = {"fmt": [5, "Nat"], "annotations": {}}
    (site / "index.html").write_text(f"<code {rich_attribute(payload)}></code>")
    lean_output = tmp_path / "VirPanelRegistry.lean"
    metadata_output = site / "verso-pretty-registry.json"

    subprocess.run(
        [
            "python3",
            str(ROOT / "demos" / "vir-pretty" / "scripts" / "generate-pretty-registry.py"),
            str(site),
            str(lean_output),
            str(metadata_output),
            "--panel-only",
        ],
        check=True,
        cwd=ROOT,
    )

    source = lean_output.read_text()
    assert "def mountContent" in source
    assert "def unmount" in source
    assert "def formatSegments" not in source
    assert "def formatRenderedById" not in source

    metadata = json.loads(metadata_output.read_text())
    assert "entrypoint" not in metadata
    assert "renderPlanEntrypoint" not in metadata
    assert metadata["panelContentCount"] == 1
    assert metadata["panelEntrypoint"] == "VirPanelRegistry.mountContent"
