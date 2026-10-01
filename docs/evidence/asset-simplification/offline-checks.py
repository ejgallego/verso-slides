"""Bounded acquisition checks after ordinary-downstream.py; transport denial is not an OS airgap."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

scratch = Path(sys.argv[1]).resolve()
deck = scratch / "source/examples/default-deck"
pkg = deck / ".lake/packages/lean_vir"
lock = json.loads((pkg / "vir-resources/runtime.json").read_text())
rid = lock["contentId"]
paths = [pkg / ".lake/build/vir/resources/runtime" / (rid + ".virres"),
         pkg / ".vir-generated/VirResourceRuntime.virres"]
expected = "d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1"
assert all(hashlib.sha256(path.read_bytes()).hexdigest() == expected for path in paths)
env = dict(os.environ, SLIDES_QUAL_NETWORK="offline", TMPDIR=str(scratch / "tmp"),
           LAKE_CACHE_DIR=str(scratch / "lake-cache"), LAKE_CONFIG=str(scratch / "lake-config.toml"))
env["PATH"] = str(scratch / "observe-bin") + os.pathsep + env["PATH"]
results = []


def run(name, command, failure=None):
    transport = scratch / (name + "-transport.jsonl")
    assert not transport.exists()
    env["SLIDES_QUAL_TRANSPORT_LOG"] = str(transport)
    result = subprocess.run(command, cwd=deck, env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    (scratch / (name + ".log")).write_text(result.stdout)
    events = [json.loads(line) for line in transport.read_text().splitlines()] if transport.exists() else []
    results.append({"name": name, "command": command, "exit": result.returncode, "transport": events})
    assert result.returncode != 0 if failure else result.returncode == 0, result.stdout
    if failure:
        assert failure in result.stdout and rid in result.stdout, result.stdout
    else:
        assert not events
    print(name + ": exit " + str(result.returncode))


run("warm-offline", ["lake", "--no-cache", "exe", "my-talk"])
empty = scratch / "empty-offline"
empty.mkdir()
run("native-cold-offline", [str(pkg / ".lake/build/bin/vir_resource_pack"), "acquire",
    str(pkg / "vir-resources/compatibility.json"), rid, lock["source"],
    str(empty / "cache.virres"), str(empty / "stage.virres"), "--offline"], "RESOURCE_OFFLINE_MISS:")
assert not list(empty.iterdir()) and not results[-1]["transport"]
held = scratch / "held-runtime"
held.mkdir()
try:
    for index, path in enumerate(paths):
        path.rename(held / str(index))
    run("ordinary-cold-offline", ["lake", "--no-cache", "build"], "RESOURCE_DOWNLOAD_FAILED:")
    assert len(results[-1]["transport"]) == 1
    assert results[-1]["transport"][0]["mode"] == "offline"
    assert not any(path.exists() for path in paths)
finally:
    for index, path in enumerate(paths):
        if (held / str(index)).exists():
            (held / str(index)).rename(path)
assert all(hashlib.sha256(path.read_bytes()).hexdigest() == expected for path in paths)
run("restored-warm-offline", ["lake", "--no-cache", "exe", "my-talk"])
(scratch / "offline-results.json").write_text(json.dumps(results, indent=2) + "\n")
