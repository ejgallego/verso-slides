"""Fresh default Lake build; test orchestration, never a production build API."""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import time

checkout = Path(sys.argv[1]).resolve()
revision = sys.argv[2]
scratch = Path(sys.argv[3]).resolve()
mode = sys.argv[4] if len(sys.argv) > 4 else "enabled"
assert mode in ("default", "enabled")
scratch.mkdir()  # Refuse to reuse an earlier acquisition/build.
source = scratch / "source"
source.mkdir()
archive = subprocess.check_output(["git", "archive", "--format=tar", revision], cwd=checkout)
with tarfile.open(fileobj=io.BytesIO(archive)) as stream:
    stream.extractall(source, filter="data")
deck = source / "examples/default-deck"
cache = scratch / "lake-cache"
cache.mkdir()
tmp = scratch / "tmp"
tmp.mkdir()
config = scratch / "lake-config.toml"
config.write_text("")
observer = scratch / "observe-bin"
shutil.copytree(checkout / "docs/evidence/public-runtime/observe-bin", observer)
for entry in observer.iterdir():
    entry.chmod(0o755)
env = dict(os.environ)
for key in ("LAKE_NO_CACHE", "LAKE_ARTIFACT_CACHE", "LAKE_RESTORE_ARTIFACTS",
            "LAKE_CACHE_KEY", "LAKE_CACHE_SERVICE", "LAKE_CACHE_ARTIFACT_ENDPOINT",
            "LAKE_CACHE_REVISION_ENDPOINT", "LAKE_PKG_URL_MAP", "LEAN_PATH",
            "LEAN_SRC_PATH", "LAKE_OVERRIDE_LEAN"):
    env.pop(key, None)
env.update(LAKE_CACHE_DIR=str(cache), LAKE_CONFIG=str(config), TMPDIR=str(tmp),
           SLIDES_QUAL_TRANSPORT_LOG=str(scratch / "transport.jsonl"),
           SLIDES_QUAL_NETWORK="online")
env["PATH"] = str(observer) + os.pathsep + env["PATH"]
if mode == "enabled":
    env["LAKE_ARTIFACT_CACHE"] = "true"
results = {
    "slides": subprocess.check_output(["git", "rev-parse", revision], cwd=checkout, text=True).strip(),
    "initial": {"sourceLakeAbsent": not (source / ".lake").exists(),
                "deckLakeAbsent": not (deck / ".lake").exists(),
                "stageAbsent": not any(source.rglob("*.virres")),
                "artifactCacheEmpty": not any(cache.iterdir())},
    "cachePolicy": {"flags": "default; no --no-cache", "lakeCacheDir": "fresh owned directory",
                    "userConfig": "empty isolated config", "artifactCacheOverride": env.get("LAKE_ARTIFACT_CACHE"),
                    "runtimeSeeding": False},
    "steps": [],
}
assert all(results["initial"].values())


def save():
    (scratch / "results.json").write_text(json.dumps(results, indent=2) + "\n")


save()
for name, command in (("update", ["lake", "update"]),
                      ("build", ["lake", "build"]),
                      ("render", ["lake", "exe", "my-talk"]),
                      ("warm-build", ["lake", "build"])):
    print(name + ": " + " ".join(command), flush=True)
    start = time.monotonic()
    with (scratch / (name + ".log")).open("w") as log:
        result = subprocess.run(command, cwd=deck, env=env, stdout=log, stderr=subprocess.STDOUT)
    results["steps"].append({"name": name, "command": command, "exit": result.returncode,
                             "seconds": round(time.monotonic() - start, 3)})
    save()
    print(name + ": exit " + str(result.returncode), flush=True)
    if result.returncode:
        sys.exit(result.returncode)
    if name == "update":
        vir = deck / ".lake/packages/lean_vir"
        lock = json.loads((vir / "vir-resources/runtime.json").read_text())
        rid = lock["contentId"]
        pack = vir / ".lake/build/vir/resources/runtime" / (rid + ".virres")
        stage = vir / ".vir-generated/VirResourceRuntime.virres"
        results["prebuild"] = {
            "vir": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=vir, text=True).strip(),
            "runtimeContentId": rid, "runtimeSource": lock["source"],
            "runtimeCacheAbsent": not pack.exists(), "runtimeStageAbsent": not stage.exists(),
            "artifactCacheEmpty": not any(cache.iterdir()),
        }
        assert results["prebuild"]["runtimeCacheAbsent"] and results["prebuild"]["runtimeStageAbsent"]
        save()

results["packs"] = []
for name, path in (("runtime-cache", pack), ("runtime-stage", stage),
                   ("program-stage", source / ".vir-generated/VersoSlidesVirPrettyMResources.virres")):
    data = path.read_bytes()
    results["packs"].append({"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
results["artifactCacheFiles"] = sum(1 for path in cache.rglob("*") if path.is_file())
save()
