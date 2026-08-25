#!/usr/bin/env python3
"""Verify a package manifest and copy a self-consistent browser subset."""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path, PurePosixPath
import re
import shutil


SHA256 = re.compile(r"[0-9a-f]{64}")


def parse_manifest(path: Path) -> dict[str, str]:
    entries: dict[str, str] = {}
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if not line.strip():
            continue
        try:
            digest, name = line.split(maxsplit=1)
        except ValueError as error:
            raise ValueError(f"{path}:{line_number}: malformed checksum") from error
        name = name.removeprefix("*")
        relative = PurePosixPath(name)
        if not SHA256.fullmatch(digest) or relative.is_absolute() or ".." in relative.parts:
            raise ValueError(f"{path}:{line_number}: invalid checksum entry")
        if name in entries:
            raise ValueError(f"{path}:{line_number}: duplicate entry {name}")
        entries[name] = digest
    return entries


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            hasher.update(chunk)
    return hasher.hexdigest()


def copy_subset(source: Path, destination: Path, names: list[str]) -> None:
    manifest = parse_manifest(source / "SHA256SUMS")
    selected: list[tuple[str, str]] = []
    for name in names:
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts or name == "SHA256SUMS":
            raise ValueError(f"invalid subset path: {name}")
        expected = manifest.get(name)
        if expected is None:
            raise ValueError(f"SHA256SUMS does not authenticate {name}")
        source_path = source / name
        if not source_path.is_file():
            raise ValueError(f"package is missing {name}")
        actual = digest(source_path)
        if actual != expected:
            raise ValueError(f"checksum mismatch for {name}: expected {expected}, got {actual}")
        selected.append((name, expected))

    destination.mkdir(parents=True, exist_ok=True)
    for name, _expected in selected:
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / name, target)

    temporary = destination / ".SHA256SUMS.tmp"
    temporary.write_text("".join(f"{value}  {name}\n" for name, value in selected))
    os.replace(temporary, destination / "SHA256SUMS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()
    copy_subset(args.source, args.destination, args.files)


if __name__ == "__main__":
    main()
