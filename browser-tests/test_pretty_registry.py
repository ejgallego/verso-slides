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
        f"<div {rich_attribute(goal_payload)}></div><code {rich_attribute(shared)}></code>"
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
    direct_after = json.loads(index.select_one("code")["data-rich-format"])
    assert nested_after["formatId"] == 0
    assert direct_after["formatId"] == 0
    docs_after = json.loads((site / "-verso-docs.json").read_text())
    assert '"formatId":1' in html.unescape(docs_after["entry"])

    source = lean_output.read_text()
    assert 'Std.Format.tag 4 (Std.Format.text "α")' in source
    assert 'Std.Format.group (Std.Format.text "β") .allOrNone' in source
    assert "formatRenderedByIdForVir" in source

    metadata = json.loads(metadata_output.read_text())
    assert metadata == {
        "schemaVersion": 1,
        "formatCount": 2,
        "idField": "formatId",
        "entrypoint": "VersoSlides.PrettyRegistry.formatRenderedByIdForVir",
        "output": "text-events-utf8/v1",
    }
