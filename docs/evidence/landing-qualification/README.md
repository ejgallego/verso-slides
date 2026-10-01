# Final landing qualification

Executed downstream source: `17c91144c1d9d8e136db0b94bed73d9c023925ab`.
Namespace assertions and enabled-cache runner source:
`2cc8c62b00abc4a9f0d8d970cda47e1df8b5d8a0`.
Production bytes are identical between those commits. Full exact pair, commands,
results, pack hashes and published inventories are in [results.json](results.json).

## Local execution

- 54 configuration/namespace tests passed, including three actual renderer
  rejections with no output writes. They check the expected namespace/collision
  diagnostic, rather than treating an arbitrary thrown error as success.
- Fresh ordinary downstream builds passed with Lake defaults and with
  `LAKE_ARTIFACT_CACHE=true`. Both used an empty isolated artifact cache, fresh
  source archive and dependencies, and no seeded runtime/cache/stage packs.
- Each ran `lake update`, `lake build`, `lake exe my-talk`, then `lake build`.
  Neither used `--no-cache`, source-build overrides or manual resource commands.
- Both acquired the public runtime once and passed without retry. The explicit
  enabled run populated 3,184 artifact-cache files. Defaults enable reads and
  leave writes disabled; that run left zero cache files. No remote artifact-cache
  hit is claimed.
- Four exact manifests and 30 payloads matched the earlier qualified identities;
  both bootstrap URL pairs are site relative.

The isolated `LAKE_CACHE_DIR`, empty `LAKE_CONFIG` and task-owned `TMPDIR` are
test-environment controls. They prevent inherited cache contents/configuration
from changing the experiment; they are not production build requirements.
The online observer forwards curl arguments to the real curl. This is public
anonymous resource acquisition, not reuse of a supplied pack.

## Replay

From a checkout containing the retained historical source revisions:

```sh
lake build test-config-validation
.lake/build/bin/test-config-validation
python3 docs/evidence/landing-qualification/ordinary-downstream.py \
  . 17c91144c1d9d8e136db0b94bed73d9c023925ab /path/to/fresh/default default
python3 docs/evidence/landing-qualification/ordinary-downstream.py \
  . 17c91144c1d9d8e136db0b94bed73d9c023925ab /path/to/fresh/enabled enabled
python3 docs/evidence/landing-qualification/verify-downstream.py \
  /path/to/fresh/default /path/to/fresh/enabled
```

The runner refuses an existing scratch directory. Use workspace storage with
several GiB available per build. The archive's downstream example depends on
the archived Slides source through its ordinary relative Lake dependency.

`original-default-runner.diff` reconstructs the exact initial default runner
from the retained runner. Its only functional difference is the absence of the
explicit mode option/override; replaying `default` above uses the same policy.
[Raw hashes](raw-sha256.txt) identify the full local logs and transport traces;
short actual build/render/test results are retained next to this README.

## Coverage boundaries

No new browser, formatter bounds, Node lifecycle, offline or remote CI campaign
ran here. The independently accepted offline gate keeps its original
`2461cfa` source. Browser semantics/geometry/font/retention keep their executed
`16e748a` source; their program/runtime and presentation bytes are unchanged.
These earlier checks do not replace the newly executed namespace assertions.
The generic mobile panel lifecycle issue remains deferred until after landing.
