# Bounded maintainer-approved review corrections

Executed source: `d1cf6f62e01fd7d91b46b00f902d23e14a2b8fd8` on `feat/vir-prettym-review-fixes-integration`.
Final source/test bytes were unchanged during the focused campaign; the commit
records those bytes. Public successor regroups exactly three commits, allowing
only short review notes to differ. Public b636197 and old archives are preserved.
Canonical request: VIR-SLIDES-REVIEW-FIXES-20261006-001; same sole Slides owner.

## Red-first cleanup regression

`red-source.json` records unchanged b636197 production pretty.js SHA and added
regression SHA. `presentation-red.test.cjs` and `pretty-before.js` preserve actual
inputs. Faithful DOM model rejects absent-child removeChild and detaches children
on HTML redraw. During renderRichFormat, a synchronous terminal state notification
redraws the panel and detaches the measurement probe. Red:1 failure, original
formatting Error masked by NotFoundError. Then change only cleanup to
container.remove(); green:1 pass, original Error retained and status remains.

To replay red, create a disposable checkout of b636197, copy the retained
presentation-red.test.cjs into its Tests/pretty-presentation.test.cjs, and run
`node --test --test-name-pattern='terminal redraw' Tests/pretty-presentation.test.cjs`.
That test loads the full production pretty.js from its normal relative location;
no third-party dependencies or VIR runtime substitutions are required.
This Node model is not itself real-browser/Wasm failure qualification.

## Other authorized corrections

- Publication uses pinned IO.FS.withTempDir instead of subprocess mktemp/parser/
  explicit finally. Delete only required existence of partially written index.html;
  failure/obstruction preservation/exact bytes/collisions/stale files/repair stay.
- Geometry helper keeps native column/result/text/tags and probe checks. Generic
  pixel-fit inequality removed; pixel extents remain recorded. Warm Wasm-capacity
  equality removed; capacities remain recorded. Finite font/reflow, disposal and
  normal DOM observations remain. No new numerical budget/layout algorithm.
- Existing Node files run through TestMain ordinary lake test, before native checks.
- Three exclusively adversarial cases removed (hostile proxy, throwing reporting/
  presentation sink, late disposal throwing reporting sink). Fixture-only support
  for those assumptions removed, raw cause replaced with ordinary Error. Existing
  Error/null/undefined and own nullish cleanup evidence, unhandled rejection and
  one-shot ownership/cancellation/bfcache tests preserved. Production bootstrap
  unchanged; no new diagnostic or lifecycle guarantees.
- Existing browser active/disposed dispatch test exercises shared renderer with
  real DOM/loader-owned program, checking same raw failure, no retained probe,
  no recreation/replay and disposal. Dispatch failure/disposal is controlled;
  this does not qualify a production Wasm trap/fatal quarantine mechanism.

## Actual local results

- Green Node before pruning44 pass; final41 pass. Focused red/green1 case above.
- Panel TypeScript pass.
- Ordinary `lake test -- --no-playwright` pass: Node41, native51 fragmentize,
 24 render,36 comment-parser,8 formatter,17 config plus publication and fixture
  generation. Explicitly skips Playwright campaign. The initial missing separator
  command produced only CLI unknown-option error; retained separately.
- Ordinary default lake build pass:741 jobs.
- Fresh published Chromium145.0.7632.6/Firefox146.0.1:16 focused checks pass,
  binding/escaping interaction, healthy rejection/recovery, active/disposed redraw,
  native geometry/text/tags/forwarded columns, actual finite delayed font reflow,
  repeated formatting/probe cleanup/disposal. Eight measurement records retained
  in browser-observations.json and JUnit: pixel extents/capacities/timings are
  observations, not generic product budgets or leak-freedom/geometry-quality proof.
-113 demo output files; only lib/pretty.js changes. Runtime/program envelopes,
  all payloads, loader URLs, inline initialization and other assets unchanged.
- Actual native stages rehashed after ordinary generation: identities.json gives
  decoded actual descriptors/ContentIds, no old pack substituted.

## Exact preserved pair

VIR ff65dc8823e3c6be1ff5c549d89c3683c18e7fd9, Lean4.34.0/compiler
293d5d0c0c3f3dded4688b3ccd6a33939ac5102b, virVersion1.
Runtime832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d,
packSHA d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1.
Program6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995,
packSHA cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace.
Same role/declaration/pure Array-v3 interface. No repin/producer writes/API change,
resource budgets, source Wasm build, broad cold/offline/mobile/browser campaign,
release/merge/cleanup or new CI claim. Previous broader evidence remains tied to
its old source; changed cleanup bytes have their own narrow execution above.

Raw files here are outside the landing diff; ledger.json hashes every other file.
Git signing could not complete; review commits are unsigned and repository
signing configuration was not changed.
