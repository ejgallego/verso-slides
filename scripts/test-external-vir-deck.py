#!/usr/bin/env python3
"""Build a separate deck against a committed Slides checkout and a supplied SDK."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk-archive", type=Path, required=True)
    args = parser.parse_args()
    archive = args.sdk_archive.resolve()
    (ROOT / "_test").mkdir(exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="external-vir-deck-", dir=ROOT / "_test"))
    project = work / "my-talk"
    shutil.copytree(ROOT / "examples/vir-deck", project)
    logs = work / "logs"
    logs.mkdir()
    env = os.environ.copy()
    for key in list(env):
        if key.startswith("VIR_SDK_") or key.startswith("GIT_CONFIG_"):
            del env[key]
    env["VIR_SDK_ARCHIVE"] = str(archive)
    dependencies = json.loads((ROOT / "lake-manifest.json").read_text())["packages"]
    # Redirect acquisition to independently built consumer clones, never a
    # producer worktree. The checked-in dependency identities stay unchanged.
    env["GIT_CONFIG_COUNT"] = str(len(dependencies))
    for i, dep in enumerate(dependencies):
        local = ROOT / ".lake/packages" / dep["name"]
        env[f"GIT_CONFIG_KEY_{i}"] = f"url.{local.as_uri()}.insteadOf"
        env[f"GIT_CONFIG_VALUE_{i}"] = dep["url"]
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    lakefile = project / "lakefile.lean"
    lakefile.write_text(lakefile.read_text().replace(
        'require «verso-slides» from "../.."',
        f'require «verso-slides» from git "{ROOT}" @ "{commit}"',
    ))

    def run(label, *command, overrides=None, success=True):
        result = subprocess.run(command, cwd=project, env=env | (overrides or {}),
                                capture_output=True, text=True)
        (logs / f"{label}.log").write_text(result.stdout + result.stderr)
        if success and result.returncode:
            raise RuntimeError(f"{label} failed: {result.stdout}{result.stderr}")
        if not success and result.returncode == 0:
            raise RuntimeError(f"{label} unexpectedly succeeded")
        return result.stdout.strip(), result.stderr

    print(f"External deck evidence: {work}", flush=True)
    run("update", "lake", "update")
    # Reuse compiled dependency caches only when the Git identities match.
    # This is not an empty-cache build or a cache-only compiled-input test.
    cached = {dep["name"]: ROOT / ".lake/packages" / dep["name"] for dep in dependencies}
    cached["«verso-slides»"] = ROOT
    actual = json.loads((project / "lake-manifest.json").read_text())["packages"]
    for dep in actual:
        source = cached.get(dep["name"])
        dest = project / ".lake/packages" / dep["name"].strip("«»")
        if source is None or not (source / ".lake/build").exists():
            continue
        source_head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=source, text=True).strip()
        dest_head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=dest, text=True).strip()
        if source_head == dest_head:
            shutil.copytree(source / ".lake/build", dest / ".lake/build", dirs_exist_ok=True)
    run("default", "lake", "exe", "my-talk")
    returned, _ = run("manifest", "lake", "query", "talk-runtime:virWebAssets")
    manifest = Path(returned)
    manifest = manifest if manifest.is_absolute() else project / manifest
    data = json.loads(manifest.read_text())
    assert len(data["programs"]) == 1
    assert data["programs"][0]["module"] == "MyTalk.Runtime"
    assert data["vir"]["gitCommit"] == "6e68a9e7599ffb82ab198566715d345eb6c6c9ed"
    assert "talk-build" in manifest.parts
    previous = manifest.read_bytes()
    run("custom", "lake", "exe", "my-talk", "--output", "published/custom-prefix")
    assert previous == manifest.read_bytes()
    custom = project / "published/custom-prefix"
    (custom / "keep.txt").write_text("unrelated")
    (custom / "vir/stale.irpkg").write_text("stale")
    run("replace", "lake", "exe", "my-talk", "--output", "published/custom-prefix")
    assert (custom / "keep.txt").read_text() == "unrelated"
    assert not (custom / "vir/stale.irpkg").exists()
    assert (project / "_slides/index.html").exists()
    assert not (project / "_slides/keep.txt").exists()
    previous_html = (custom / "index.html").read_bytes()
    stdout, stderr = run("missing-sdk", "lake", "exe", "my-talk", success=False,
                        overrides={"VIR_SDK_ARCHIVE": str(work / "missing-sdk.tar.gz")})
    assert "missing-sdk" in stdout + stderr
    assert (custom / "index.html").read_bytes() == previous_html
    stdout, stderr = run("mismatched-sdk", "lake", "exe", "my-talk", success=False,
                        overrides={"VIR_SDK_EXPECT_COMMIT": "0" * 40})
    assert "mismatch" in (stdout + stderr).lower()
    run("recover", "lake", "exe", "my-talk", "--output", "published/custom-prefix")
    run("managed", "lake", "build", ":slides")
    managed = project / "talk-build/slides/my-talk"
    managed_html = managed / "index.html"
    warm_mtime = managed_html.stat().st_mtime_ns
    run("managed-warm", "lake", "build", ":slides")
    assert managed_html.stat().st_mtime_ns == warm_mtime
    license_file = managed / "vir/sdk/LICENSE"
    expected_license = license_file.read_bytes()
    license_file.write_text("damaged")
    (managed / "vir/stale.irpkg").write_text("stale")
    (managed / "vir/stale-empty").mkdir()
    (managed / "vir/stale-link").symlink_to(project / "assets", target_is_directory=True)
    (managed / "vir/sdk/NOTICE").unlink()
    run("managed-repair", "lake", "build", ":slides")
    assert license_file.read_bytes() == expected_license
    assert (managed / "vir/sdk/NOTICE").exists()
    assert not (managed / "vir/stale.irpkg").exists()
    assert not (managed / "vir/stale-empty").exists()
    assert not (managed / "vir/stale-link").is_symlink()
    (project / "assets/note.txt").write_text("changed without recompiling Main")
    run("managed-source-change", "lake", "build", ":slides")
    assert (managed / "deck-assets/note.txt").read_text() == "changed without recompiling Main"
    result = {
        "slidesCommit": commit, "virCommit": data["vir"]["gitCommit"],
        "sdkSha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
        "manifest": str(manifest), "siteRoot": str(project / "published"),
        "managedSite": str(managed),
        "dependencyCacheReuse": True, "cacheOnlyConsumer": False,
        "checks": ["external Git dependency", "typed manifest path", "custom build directory",
                   "default/custom site output", "same artifact across outputs", "stale installed shard",
                   "unrelated file preservation", "independent outputs", "missing SDK",
                   "mismatched SDK", "recovery", "managed site facet",
                   "warm site not rewritten", "damaged/missing/stale output repaired",
                   "render-time source change tracked"],
    }
    (work / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
