"""Test-only publication inventory; run with one or more emitted site directories."""
import hashlib
import json
from pathlib import Path
import re
import sys

runtime = "832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d"
program = "97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58"
manifests = {
    runtime: "637f94bc170e972abcc59d5ddfbce108925a3e962155c7df318477282f5775f6",
    program: "9cdc35248f41eb3459f079cfae11ce9bae545d858260a66f8a827aa8360be5dc",
}
reports = []
for argument in sys.argv[1:]:
    site = Path(argument).resolve()
    html = (site / "index.html").read_text()
    assert html.count("window.__versoVirResourceUrls = ") == 1
    assert not (site / "vir-bootstrap.js").exists()
    assert not (site / "lib/.vir-stage").exists()
    urls = json.loads(re.search(r"window\.__versoVirResourceUrls = (\{.*?\});", html)[1])
    assert set(urls) == {"runtimeManifest", "runtimeModule", "programManifest"}
    assert all(not url.startswith("/") and ".lake" not in url and (site / url).is_file()
               for url in urls.values())
    records = []
    for identity, expected in manifests.items():
        directory = site / "lib/vir" / identity
        raw = (directory / "bundle.json").read_bytes()
        manifest = json.loads(raw)
        assert manifest["contentId"] == identity
        assert hashlib.sha256(raw).hexdigest() == expected
        assert manifest["descriptor"]["compatibility"] == {
            "leanRevision": "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b", "virVersion": 1}
        payloads = []
        for entry in manifest["descriptor"]["files"]:
            data = (directory / entry["path"]).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            assert len(data) == entry["byteLength"] and digest == entry["sha256"]
            payloads.append({"path": entry["path"], "bytes": len(data), "sha256": digest})
        records.append({"contentId": identity, "manifestSha256": expected, "payloads": payloads})
    assert len(list((site / "lib/vir").glob("*/bundle.json"))) == 2
    assert sum(len(record["payloads"]) for record in records) == 15
    reports.append({"site": argument, "urls": urls, "bundles": records})
print(json.dumps(reports, indent=2))
