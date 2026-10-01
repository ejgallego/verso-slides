"""Check published bytes against the already qualified immutable identities."""
import hashlib
import json
from pathlib import Path
import sys

runtime = "832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d"
program = "97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58"
expected_manifests = {
    runtime: "637f94bc170e972abcc59d5ddfbce108925a3e962155c7df318477282f5775f6",
    program: "9cdc35248f41eb3459f079cfae11ce9bae545d858260a66f8a827aa8360be5dc",
}
for argument in sys.argv[1:]:
    scratch = Path(argument).resolve()
    site = scratch / "source/examples/default-deck/_slides"
    bootstrap = (site / "vir-bootstrap.js").read_text()
    for identity in (runtime, program):
        assert "lib/vir/" + identity + "/bundle.json" in bootstrap
    assert "/home/" not in bootstrap and "file://" not in bootstrap
    records = []
    for identity in (runtime, program):
        directory = site / "lib/vir" / identity
        raw = (directory / "bundle.json").read_bytes()
        manifest = json.loads(raw)
        manifest_sha = hashlib.sha256(raw).hexdigest()
        assert manifest["contentId"] == identity
        assert manifest_sha == expected_manifests[identity]
        assert manifest["descriptor"]["compatibility"] == {
            "leanRevision": "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b", "virVersion": 1}
        if identity == program:
            assert manifest["descriptor"]["exports"] == [{
                "role": "formatSegments", "declaration": "VersoSlides.VirPrettyM.formatSegments",
                "interfaceId": "verso-slides-format-segments-hostabi-v2"}]
        payloads = []
        for entry in manifest["descriptor"]["files"]:
            data = (directory / entry["path"]).read_bytes()
            sha = hashlib.sha256(data).hexdigest()
            assert len(data) == entry["byteLength"] and sha == entry["sha256"]
            payloads.append({"path": entry["path"], "bytes": len(data), "sha256": sha})
        records.append({"contentId": identity, "manifestSha256": manifest_sha, "payloads": payloads})
    assert sum(len(record["payloads"]) for record in records) == 15
    (scratch / "publication.json").write_text(json.dumps(records, indent=2) + "\n")
    print(scratch.name + ": two exact manifests, 15 payloads, relative bootstrap URLs")
