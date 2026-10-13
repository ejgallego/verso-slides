# PR85: stable Lean 4.35.0 consumer acceptance

Executed consumer head **78331bcf9c04047a6853be8103c75842c53833bd** on Slides main
**b43d452d8023773b0731899b51bc6d373c17b111**. Four review commits remain: the
unchanged shared-rendering refactor patch, then the three formatter commits.
The earlier rc4 PR head `db12f3a9` is retained by `archive/slides-pr85-rc4` and
the pre-cleanup Git bundle. No producer, lab, benchmark or deferred implementation
was changed.

## Exact pair

| Component | Selected identity |
| --- | --- |
| Lean | 4.35.0 Release, `eb6cafb7290e8bd5f2937522d8d804f58f02bafc` |
| VIR | Public tag `4.35`, `225218e18a3ae554acc571a93aab484453d857a6` |
| Runtime | `c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60` |
| Runtime pack | 1,016,086 bytes; SHA256 `caa48b273d3a01d7582444b9611c5070b2bcdd39330569ffdf6778f930a33687` |
| Regenerated program | `8b168629f82e2c893a59d1eab6f126ccf7e327ae23f651d9ba001a3cf913cca3` |
| Program pack | 78,773 bytes; SHA256 `6b73f074b016590f61423a47b49b29740b786e803753ca46178917ac76614ac7` |

Descriptor2 / compatibility6 / ABI4 / binary11 / interface manifest12 remain
unchanged. The compiler revision changes, and the program was regenerated.
`lakefile.lean` selects tag4.35; the lock selects exact225218. All non-VIR manifest
records equal current Slides main. The downstream example inherits that exact
pair and uses stable4.35.0 too.

Runtime acquisition uses VIR's public locked content-addressed HTTPS URL. No
runtime bytes, producer directory, SDK/source override, manual manifest or Wasm
source build was supplied. Both actual packs and all payload hashes are retained.
The direct SDK `6c747aab` is the producer's separately qualified public artifact;
Slides uses the owning library's resource bundle, not that direct SDK archive.
The copied producer receipt credits its SDK/both-profile/anonymous gates as
reported evidence, not client executions.

## Executed local acceptance

- Fresh parent `.lake`: `lake --no-cache build`, PASS625 jobs. Existing compiler/
  system tooling and OS caches were available; no global cold-install claim.
- Ordinary downstream `lake build`, PASS625 jobs, with no child `.lake`, build
  directory or inherited manifest. The parent was already built. Native ordinary
  `lake exe my-talk` and parent `lake exe demo-slides` publication both pass.
- Final-head `lake test -- --no-playwright`: PASS. 20 Node checks; native51
  fragmentize,24 rendering,36 parsers,8 prettyM,17 configuration checks; actual
  publication tests and fixture/native-corpus generation.
- Final ordinary serial `uv run pytest -v` from `browser-tests`: **310 PASS**,
  Chromium and Firefox. No alternate site/opt-in flag, manual site assembly,
  whitespace normalization or skipped formatter comparisons.
- Fresh Chromium/Firefox instances at the actual downstream nested URL
  `/examples/default-deck/_slides/index.html`: exact eight-case native text and
  complete tag-stack equality, goal-panel rendering and no page errors PASS.
- Normal warm parent build and warm parent/downstream builds with closed localhost
  HTTP(S) proxies pass. This is warm offline behavior; no new cold-offline deck
  campaign or anonymous global-install claim.
- Six selected emitted manifests and42 payload occurrences across parent demo,
  ordinary code fixture and downstream site verified against actual packs.
- JS coverage, panel/widget/math TypeScript, tracked Prettier and actual Git
  whitespace checks PASS. Source26 files (formatter, renderer/carrier and web
  assets) remain byte-identical to rc4; no application/runtime-contract fix needed.

`*.json` command receipts and raw logs retain commands, working directories,
elapsed times, cleared override names and exit codes. Those elapsed times are
execution records, not an old/new build-time experiment. The complete JUnit
report retains the310 final results. `pack-identity.json`, `site-audit.json`,
`source/`, `unchanged-production-source.json`, `final-commits.txt` and
`range-diff.txt` retain the exact source/artifact binding.

## Retained initial failures and corrections

The first browser suite was308 PASS /2 FAIL: static inventory assertions found
old rc4 resource directories in the pre-existing fixture output. The established
writer intentionally preserves stale files. The active stable path's semantic/
interaction cases passed. Retained the initial output/manifest listing and logs,
then regenerated fresh scratch `_test` fixtures using the ordinary test driver.
The same assertions and source passed all310; none was relaxed. CI starts from
fresh output. Future test-inventory robustness across pin changes is deferred.

One task-local pack inspection initially omitted the v2 CID hash domain prefix;
its program assertion failed. The corrected evidence inspector uses the actual
published algorithm and checks both CIDs/compatibility/payloads. No product code
changed. npm's initial cache write was sandbox-blocked; the authorized replay
passed. Prettier initially required rewrapping the updated guide; its corrected
run passes. These are recorded separately from application failures.

## Limits / next action

No fresh CI result is asserted here. Stable source is locally qualified and
ready for the existing PR85 branch update. No merge/release, producer edits,
benchmark retarget, new API or postponed feature is authorized by these results.
Historical rc4/4.34 qualification remains historical. No fresh geometry,
font-loading/retention/performance campaign or both-profile direct SDK smoke was
run by Slides; those follow-up or producer scopes remain separate.
