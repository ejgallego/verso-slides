# Bounded consumer acceptance — 2026-09-13

## Reusable Lake build API

Implementation `716ba652818e208646e59b63674842b3e544c477` supersedes
the per-deck launcher recipe. `lake exe demo-slides` now builds and
uses the selected VIR artifact automatically. Downstream executables
select it with one ``moreLinkObjs := #[`@/LIB:slidesRuntime]`` entry
and call `virSlidesMain`. The linked host object transports the actual
manifest location; it contains no second runtime and does not invoke
Lake from the presentation process.

The reusable package `:slides` facet produces tracked managed sites,
checks all output contents and records render-time input dependencies.
The author-facing example no longer declares a facet result type or
combines/launches build jobs. Custom output is an ordinary executable
argument, not `-R -K` configuration. See
[the current author guide](vir-deck-build.md).

Final exact-source external evidence is retained at
`_test/external-vir-deck-i61nuogj/result.json` and `logs/`. All 15
checks pass: the prior SDK/path/output checks plus managed site
generation, unchanged warm build (index modification time preserved),
repair of damaged/missing/stale files, empty directories and symlinks,
and regeneration after a render-time source changes. The consumer has
its own Git dependency clone and custom `talk-build`. Producer/SDK
identities are unchanged. Matching compilation caches were reused;
this is not a clean-cache or cache-only claim. The earlier
`ad8d4c5/uqh77stz` checkpoint preceded directory/symlink receipt
hardening and is historical only.

Final browser results: six focused Chromium/Firefox tests pass on the
`i61nuogj` output; the general suite passes 284 tests with six
external-site tests skipped there and run separately. The Lean suite
passes (including 25 configuration cases), as do JS typechecking and
configuration coverage.

## Review follow-up

Implementation `d5b20bab36efb2ed452cb184c56fe2e9ba4326dc` adds
explicit protection of the built-in `lib/` directory, retains the
runtime across persisted page transitions, and checks the root
formatter export/arity before startup. The matching external Git
consumer at `_test/external-vir-deck-8i8h72ec` passes the same 11
build/SDK/output checks using the unchanged producer and archive
identified below.

All six focused browser tests pass in Chromium/Firefox: real
formatting and reload, deterministic persisted transitions, early
missing-formatter errors, and real away/back navigation. The
actual-history run did not obtain a bfcache hit, so object retention
is covered deterministically, not claimed as a browser-selected
cache-hit result. The Lean suite passes including 25 configuration
cases (one new reserved-directory regression), and panel/VIR JS
typechecking passes. The original acceptance checkpoint below is
retained as historical evidence, not silently attributed to the newer
commit.

Local lane: `feat/reusable-deck-assets`, worktree
`.worktrees/reusable-deck-assets`. No publication or live pin
adoption.

## Exact inputs

| Input                          | Identity                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| Slides base                    | `a51f7e581893042eb317edf50216060a26f38ac3`                         |
| Preserved prerequisites        | `3489228`, `7b4ce00fc62fc65f461b438dffff6922c9b6afcb`              |
| Tested consumer implementation | `5b59ae8727551c47d0e31b5e3a22e050c845d30b`                         |
| VIR source                     | `6e68a9e7599ffb82ab198566715d345eb6c6c9ed`                         |
| SDK archive SHA-256            | `75ae0554f0175d9a3dd4f12107b5883d364a72994e24da18192bc5ef55d9db1b` |
| Lean                           | `4.34.0-rc2`, githash `6a10ac8c22beadecabdbb0919c2b50214762f91d`   |

VIR was independently cloned into consumer-owned inputs/dependencies
and its accepted SDK archive copied into `_inputs`. The original
producer worktree was neither built nor changed. The external project
consumed the exact Slides implementation by Git, not a path dependency
or shared Lake directory.

## Results

- Root `lake build demo-site`: passes; the default Slides root
  generates one seven-member package set, 94 declarations and one
  formatter export.
- `python3 scripts/test-external-vir-deck.py --sdk-archive _inputs/lean-vir-sdk.tar.gz`:
  passes all 11 checks. Evidence is retained at
  `_test/external-vir-deck-l8c200il/result.json` and `logs/` in the
  owned worktree.
- The external `MyTalk.Runtime` singleton includes both Slides prettyM
  and the deck-owned answer, with seven members, 96 declarations and
  three interface entries (formatter, answer, startup). Actual
  returned manifest path is under the deck's `talk-build`, not an
  assumed dependency `.lake/build` path.
- Default `_slides` and `published/custom-prefix` both render. The
  artifact manifest contents are identical across outputs.
  Re-rendering replaces a planted stale `vir/stale.irpkg`, preserves
  an unrelated `keep.txt`, and leaves the other deck output
  independent. This does not assert that the producer never rewrites
  its manifest or provide a new producer incrementality claim.
- Missing archive fails explicitly. `VIR_SDK_EXPECT_COMMIT` set to
  forty zeros fails with
  `SDK commit mismatch: expected ... got 6e68...`. Restoring the
  accepted archive/expectation succeeds.
- Focused external browser test: **2 passed**, Chromium and Firefox,
  against the new `l8c200il` output. Both show styled infoview tokens
  and `Deck contribution: 42`. Direct typed tagged output returns
  `hello` with tag `"7"`; answer returns `"42"`, as required by the
  current Nat ABI.
- Test-only observation at the real SDK factory/runtime boundary
  records `create, startup, dispose, create, startup` across reload,
  and exactly one Wasm request per page load. Browser requests outside
  the local static server are blocked and none are attempted. The site
  is served under `/custom-prefix/`.
- Existing Lean tests: 51 fragmentize, 24 render, 36 comment-parser, 7
  prettyM, 24 configuration cases, plus generated-asset installation
  tests pass.
- General Chromium/Firefox suite: **284 passed, 2 skipped** (the two
  focused external tests require their separate site, tested above).
  Panel and VIR JavaScript type checks, JS configuration coverage, and
  diff checks pass.

## Limits and next boundary

This is consumer integration evidence, not a repeated producer
qualification. Matching dependency compilation caches were copied into
independent clones to bound test cost. No empty-cache or cache-only
compiled-input consumer claim is made; producer cache-only evidence
remains attributed to the producer lane. The frozen module-acquisition
contract was not changed or replaced by the separate, unlanded API
work.

The bootstrap intentionally supports one composite application root,
not automatic aggregation of independently initialized programs.
JavaScript still owns DOM measurement, compact input adaptation and
HTML annotation rendering. No new DSL, runtime build fallback, global
SDK installation or site publication is part of this slice. A public
dependency/release decision is separate work.

The only configuration caveat found here is ordinary Lake behavior at
this version: changing an elaborated `get_config?` value requires
`-R`. The practical example documents
`lake -R -KdeckOutput=... build deck-site`.
