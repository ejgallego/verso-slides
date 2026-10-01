# Public runtime consumer evidence

Executed source and results are in [results.json](results.json); selected actual
stdout/stderr is in [events.txt](events.txt). [raw-log-sha256.txt](raw-log-sha256.txt)
identifies full local build logs, whose excerpts are retained here. Complete build
transcripts are not required to inspect the assertions or replay the gate.

The Python runners and `observe-bin` files are exact executed test sources. They
are not production build commands or an acquisition implementation: online curl
passes its original arguments to `/usr/bin/curl`; offline mode denies transport.

## Replay

Use a fresh scratch directory with enough disk space (the two source builds used
several GiB), a working Lean toolchain, Git, curl and Python. From a Slides checkout:

```sh
qualification_dir=/path/to/fresh/scratch
mkdir -p "$qualification_dir/root" "$qualification_dir/downstream" "$qualification_dir/tmp"
cp docs/evidence/public-runtime/*.py "$qualification_dir/"
cp -R docs/evidence/public-runtime/observe-bin "$qualification_dir/"
chmod +x "$qualification_dir/observe-bin/"*
git archive 2461cfa777ec66073f0f2dfe21778ebf47d3edd1 | tar -x -C "$qualification_dir/root"
git archive 2461cfa777ec66073f0f2dfe21778ebf47d3edd1 | tar -x -C "$qualification_dir/downstream"
python3 "$qualification_dir/cold-build.py" root
python3 "$qualification_dir/cold-build.py" downstream
# If a release download fails, preserve its logs and retry the ordinary build:
# python3 "$qualification_dir/retry-build.py" root
# python3 "$qualification_dir/retry-build.py" downstream
python3 "$qualification_dir/offline-checks.py"
python3 "$qualification_dir/verify-publication.py"
```

A retry reuses already compiled native dependencies. It does not seed runtime
packs or change their source. `offline-checks.py` temporarily holds only this
scratch directory's acquired cache/stage aside and restores both in `finally`.
Native empty-offline paths are independent. Each run writes commands/results and
transport observations into the scratch directory.

Publication assertions are static hash/length and URL checks, including a copied
renderer plus its existing demo image. They do not assert browser execution,
geometry or a completely self-contained deck with arbitrary external images.
