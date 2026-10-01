# Publication plan and exact successor qualification

Two separate implementation checkpoints, followed by this evidence-only commit:

- Publication plan: Slides `d0aee5e0f028b7b799857709766faa59ca7526f2`, tested first against the unchanged VIR `47e82e9a` / runtime `401b115e` pair.
- Successor adoption: Slides `ea079cd7bff00f986e5f4a7edcd2e74aafb59bda`, exact VIR `af3052cac2740f41bd701de3646df348b7e2dbb3`.
- Historical accepted baseline `781cab8da2beb0bb96c77884abbb152cc9fd3582` remains in history. Publication implementation was separately authorized and committed before the narrower adoption handoff; adoption adds no publication redesign or upstream writes.

## Exact adopted resources

| Identity | Value |
| --- | --- |
| Lean revision / VIR compatibility | `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b` / `virVersion: 1` |
| Native ABI / interface / IR | 4 / 9 / 11 |
| Runtime content ID | `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d` |
| Supplied runtime pack SHA-256 | `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1` |
| Pack length | 1,120,731 bytes |
| Runtime JS SHA-256 | `b9fa28797af2787b4bae53a4d4a6a440b718512b54553717c65630b239b5829a` |
| Unchanged Wasm SHA-256 | `e74e7f8e663537a4f0035c0edf594fbea9699f40b4b683ffe563922b4f453ec4` |
| Unchanged program content ID | `97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58` |

Root source/manifest and root/downstream dependency checkouts agree on exact VIR `af3052c`. The supplied handoff pack was independently checked and copied to the owning library's consumer caches. Ordinary library acquisition then prepared the resources. The application has no producer-path dependency, private loader or validator; no Wasm source build ran. The resource lock source remains `"-"`: this is supplied-pack local qualification, **not anonymous cold installation**.

The public carrier import becomes `Vir.Resources.Embed`. Role `formatSegments`, declaration `VersoSlides.VirPrettyM.formatSegments`, pure Except/v2 signature, independent complete ABI reference, bounds, application adapter, bootstrap and presentation bytes are unchanged. Strict expected exports and pending-only cancellation remain the agreed APIs.

## Publication behavior and measurements

`VirResourceSite.prepare` validates the complete resource set once and retains manifest bytes, owned files and site-relative URLs. The renderer reuses the same plan for bootstrap construction and writing; it collects ordinary assets once. Inspection of the application call graph shows three full resource validations reduced to one; `write` performs no descriptor/bundle validation. Embedding and browser integrity validation remain separate trust boundaries.

Four new casing negatives fail on the prior configuration code (`config-red.log`); 32 configuration checks pass after the fix. Publication/installation tests cover deduplication, invalid payload/identity rejection, exact bytes, nested URLs, stale files, invalid directory types, symlinks and denied staging writes. Generic shared-directory casing admission is additionally checked after successor adoption.

All **115 emitted files are byte-identical** before/after the publication change on the unchanged 47/401 pair. The real-pack local measurements below compare that same pair, not two runtime versions:

| Measurement | Before | Reused plan |
| --- | --- | --- |
| Native demo rendering, median of five wall-time samples | 261.9 ms | 172.1 ms |
| Warm build, median of three wall-time samples | 1,161.8 ms | 1,160.3 ms |
| Prepare, median of five monotonic samples | — | 70.4 ms |
| Write an already prepared plan, median of five monotonic samples | — | 0.63 ms |

These small local samples establish the measured costs here, not a general latency guarantee. No speculative cache was added. Raw samples are retained in the timing JSON files; `publication-summary.json` records comparison results.

Publication is **single-writer and nontransactional**. Directory type preflight precedes mutation. A staging failure preserves installed resources and may leave a partial stage, removed on the next attempt. After staging, the writer removes the installed resource directory before renaming the stage; failure/interruption in that gap can leave resources absent. Other site files are written separately. The tests exercise preflight/staging and stale-file behavior, not an atomic whole-site deployment guarantee.

## Fresh executed acceptance

All entries below are local executions. Logs are retained beside this document, with candidate/scratch prefixes replaced by `<candidate>` and `<qualification>`.

| Check | Result |
| --- | --- |
| Publication targeted build on historical pair | Pass, 754 jobs |
| Adoption targeted build | Pass, 764 jobs |
| Ordinary downstream example build | Pass, 745 jobs |
| Root library-managed `:slides` build | Pass, 746 jobs |
| Native publication and asset installation tests | Pass |
| Native configuration / HTML rendering | 32 / 24 cases pass |
| Bootstrap, admission and presentation Node tests | 50 pass |
| Independent emitted ABI-reference Node check | 1 pass |
| Focused Chromium/Firefox creation, site and lifecycle | 46 pass, 0 deselected |

Representative commands, from the candidate root unless indicated:

```sh
lake update lean_vir
lake build demo-slides test-vir-publication test-config-validation test-asset-installation test-pretty test-render
.lake/build/bin/test-vir-publication
.lake/build/bin/test-config-validation
.lake/build/bin/test-asset-installation
.lake/build/bin/test-render
.lake/build/bin/test-vir-publication --benchmark /tmp/verso-publication-adoption/bench-site
lake build :slides
# From examples/default-deck:
lake update
lake build
# From the candidate root:
node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs Tests/pretty-presentation.test.cjs
VIR_ACCEPTANCE_SITE=/tmp/verso-publication-adoption/site node --test Tests/vir-reference.test.mjs
uv run --project browser-tests pytest browser-tests/test_vir_prettym_creation.py browser-tests/test_vir_prettym_site.py browser-tests/test_vir_prettym_lifecycle.py --vir-site-acceptance --site-dir /tmp/verso-publication-adoption/site --browser=all -q
```

Root, nested and downstream published manifests/payloads were checked against their declared SHA-256 and lengths. The actual new loader rejects conflicting shared-directory spelling in the integrity phase before any payload fetch or Wasm instance; a fresh valid instance recovers. Browser checks cover strict v2 creation, exact native semantic segments, cancellation phases, raw secondary cleanup, retry/current-promise ordering, stale completion, terminal versus persisted pagehide and reflow.

The seven-case semantic corpus and 29-case native bounds corpus are byte-identical to the previous accepted outputs. Their source/program/Wasm are unchanged; this comparison does not relabel the earlier browser bounds campaign as new-runtime qualification.

Relocated native rendering used a copied executable in an unrelated working directory, with the consumer program source pack temporarily withheld and restored in `finally`. Only the deck's declared image inputs were copied into that working directory. All 17 emitted resource files match. This establishes this native carrier's independence from its program source-pack path; runtime caches were not withdrawn. Initial setup attempts hit a cross-filesystem rename restriction and a missing ordinary image input; the corrected setup passed without production changes.

## Limits and remaining gates

No new GitHub CI query was made. The handoff reported running upstream runs; that is another agent's report, not a fresh CI pass. Development used Beam probes before targeted batch builds; this is not a clean-cache complete build campaign.

No broad 101-check native/29-case browser bounds campaign, 105-check presentation campaign, new JS typecheck, anonymous installation, cold/warm offline matrix, exhaustive geometry/font-download, retention or performance campaign ran in this slice. Prior campaigns and their exact pairs remain separately credited in the checklist. Changed loader bytes were qualified freshly with the focused matrix above; unchanged program/formatter evidence is retained explicitly.

Next: bounded review of these checkpoints, then VIR-owned durable exact-source handoff and Slides' remaining distribution/product acceptance. No new shared API decision was needed. `identities.json` records exact committed-source, manifest and retained-evidence hashes so review does not depend solely on temporary paths.
