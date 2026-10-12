# Slides adoption of VIR 4.35-rc4

VIR tag `4.35-rc4`, annotated tag object
`585729afff251c68b498c2f818c9abde986c5c75`, resolves to
`be01a69de96c49bde7863baf82e3cc4b7cc904fd`.
[Public release](https://github.com/ejgallego/lean-vir/releases/tag/4.35-rc4)
is published, not draft, and is a toolchain prerelease. Its toolchain matches
Slides: Lean 4.35.0-rc4, revision `c29b6dda4f7c20e3eeaa717c4e565663c5cfa364`.

The candidate is three formatter commits above the separate refactor PR83 at
`23daa2e3eb45c5838bd7860cc21d06d5089515d7`. Root native execution used
`db3b10d4816826482f180970fb90f29c9bffa487`; downstream/browser execution finished
on clean `059658e2cdfc153ea3f10842653dca0a94e38da9`. The changes between these
phase revisions are release review notes and copyright headers in the three
new example files. Those headers were present before the example's cold build
completed, warm check and render. Production JS, formatter, integration and test
bytes match; final file hashes are retained. A later review-notes-only commit
amendment does not change those bytes.

## Local execution

- Fresh own worktree, ordinary root `lake --no-cache build`: 625 jobs PASS.
  Fresh Git dependencies and owning runtime cache/stage; no supplied runtime or
  implicit Wasm source build. Rebuilding formatted assets also passed. Existing
  toolchain/ordinary caches were available; this is not global cache isolation.
- Ordinary downstream cold/warm builds and root/downstream rendering: PASS.
  The downstream's independent dependency manifest selects the same tagged VIR
  source. Its own runtime pack matches the public runtime checksum.
- `lake --no-cache test -- --no-playwright`: PASS, including 20 Node checks,
  fragmentize/render/parser/format/config/publication tests and fixture builds.
  Panel TypeScript PASS. The fresh eight-case native wrapper corpus equals the
  complete retained corpus, including segments and tags.
- 30 focused Chromium/Firefox cases: PASS in 20.90s. Actual published files under
  root/nested/downstream URLs, complete native segment/tag comparisons, BigInt
  annotations, classes/bindings/escaping, numeric rejection/reuse, panel resize,
  loading/failure and lightbox readiness. Existing Python 3.10/Playwright test
  environment and browser binaries were used. No full product/mobile/geometry/
  font/retention/offline campaign is claimed.
- Six emitted manifests and 42 payloads: canonical identity, length and SHA256
  checks PASS. Three actual output packs retained. Regenerated program identity
  is stable across the timed builds.
- Tracked-file Prettier, JS config coverage, copyright headers and diff checks:
  PASS. An initial Prettier check found the pre-tag additions unformatted;
  formatting was folded into the same three commits. A later recursive check
  also inspected two ignored generated example setup JSON files. The tracked
  source check passes; no generated files were changed or added to the PR.

## Exact artifacts

Resource compatibility 6; interface manifest 12; runtime ABI 4; binary package
format 11. Public explicit module assets and the direct formatter contract remain
`Std.Format → Nat → Nat → Array Pretty.Segment`.

- Runtime CID `092a746684d66b2c0eea7975a96eecd3f59cd7ec4e4255ffb5092a72e1af70f1`;
  pack SHA256 `02c4a12f6dd4aed6de5cf6abcdde61d4a1f02fb5f9e55159683eb591e4ee4f90`;
  1,016,086 bytes. Ordinary acquisition follows the tagged library lock's
  content-named release URL. Those acquired bytes match the identical asset
  attached to the `4.35-rc4` release.
- Program CID `249096a96d990daaf5d5f9dfb88d2b5dfcbb7ab2a3f53b6f384e79e64c05a945`;
  SHA256 `0a4a2ddba702d9b2fbbe0a04b59232371b86d952a9c6061e47372309e29489d5`;
  78,829 bytes. Fresh owning preparation; old programs were not relabelled.

Full descriptors, public release/tag readbacks, emitted-file hashes, command
results, raw logs, JUnit and actual packs are retained. The earlier 3e/6cdd/00c4
qualification and footprint report remain separate historical records.

## Refreshed footprint and build timing

Old source is PR83 (`23daa2e`); new is release candidate `059658e`. Both use the
same Slides demo, Lean 4.35rc4 and Verso/transitive pins. A fresh old rendering
matches the earlier old inventory byte for byte. Latest site totals are
3,680,917 → 4,767,365 raw bytes and 1,867,581 → 2,136,353 per-file gzip bytes.
Native executable: 129,025,696 → 130,611,768 bytes. Size and per-component data
are in `size-summary.json`; gzip is Python level 9, mtime 0, not measured traffic.

Serial old/new/new/old application-clean timing used already-built dependency
libraries and cached runtime, with setup outside measurement. Application output
was moved aside between samples. Two successful fresh application-build samples
per version: old median 33.075s (32.545–33.605), new 32.434s (30.544–34.324).
Warm alternating samples, eight/version: old median 0.716s (0.681–0.757), new
1.138s (1.120–1.174). GNU time and monotonic records, native binary hashes, scripts
and logs are retained. Binary hashes are stable within each version.

One old-baseline fresh attempt failed with an LLVM linker bus error while demo
external-code extraction built `extract-lakefile`. Its failed log/time record and
measurement-script parsing failure are retained, not counted as a success. The
bounded replay passed without any source change; `measure-resume.py` tolerates
GNU time's nonzero-status prefix and records the successful remaining sample and
warm series. This is not a candidate formatter failure.

Host Ryzen AI 9 HX 370, 24 logical CPUs. Background work, boost and OS cache were
not isolated; disk space fluctuated. These small local samples do not establish
a performance improvement. Downloads, setup, site rendering, browser startup and
per-call formatting latency are outside the timing table.

## Reproduction and boundary

Run the ordinary root build, native driver and render, then ordinary example
build/render. Emit the native wrapper corpus. Assemble root output in SITE, its
copy in nested/deck, example output in downstream/custom, fixture _test/code in
code and native-corpus.json at SITE root. The retained `qualify.py` records the
commands and test selection. Use an activated installed pytest/Playwright
venv so the HTTP server's `python` command is available.

The measurement scripts use the local retained old/new worktrees. Reproduction
requires checking out the two source revisions and preparing identical pinned
dependencies; generated build snapshots and site trees are not committed here.
`ledger.json` hashes all retained evidence files except itself.

No producer source/API/lock mutation, new codec or fallback, shared-contract
extension, merge, release or cleanup was performed. Deferred Slides features
remain after the first formatter landing. This record is local execution, not
an assertion of the new Slides PR's CI results.
