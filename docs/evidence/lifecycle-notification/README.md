# Loading-notification reentrancy regression

Qualified implementation: Slides `19bf157fbd33171a16c2fa10a40e94ac440a2dd0`,
parent `e2b34da6312ecec3c28650fcec1c341dc8baf3aa`. VIR remains
`47e82e9a483e727431bb004fb64ce76ada739ba9`, runtime `401b115e`, program
`97b280b7`, Lean 4.34.0. [Exact identities and hashes](identities.json).
The evidence/documentation successor changes no production bytes.

## Reproduced defect and bounded fix

The review's P2 remains present in the consolidated candidate: a synchronous
`verso-vir-statechange` listener can retry during `loading`, and the returning
outer attempt overwrites `versoVirReady` with its obsolete rejected promise.
The new instance becomes ready while the public promise rejects `AbortError`.
Initial loading also exposed no promise to a listener performing pagehide.

The bootstrap now publishes its promise and attaches the rejection observer
before announcing loading. Nothing after that announcement writes ownership or
the public promise. Existing stale-result checks, explicit disposal, raw error
reporting and pending-only cancellation are retained. No VIR API or pin changes.

Four controlled Node regressions cover retry during initial module acquisition,
nested retry while a previous creation is pending, terminal pagehide from loading,
and persisted pagehide from loading. The pending older creation completes late
and is disposed once. Child processes isolate unhandled-rejection observation;
the actual bootstrap runs with only module acquisition/completion and synchronous
notification controlled. This is not a real-browser late-disposal race claim.

## Fresh local execution

| Check | Result |
| --- | --- |
| [Baseline red](red.log) | All four new notification checks fail against the unchanged parent bootstrap. Nested retry produces a ready facade but an obsolete rejected public promise. |
| [Node green](green.log) | 50 pass: 36 bootstrap, 3 admission and 11 presentation checks; includes retained cancellation, overlap, cleanup, reporting and bfcache cases. |
| [Typechecks](types.log) | Both JS projects pass, TypeScript 5.7.2. |
| [Targeted warm build](build.log) | `lake build demo-slides` passes, 743 jobs; no Wasm source build. |
| [Root render](render-root.log), [nested render](render-nested.log) | Fresh output from the normal demo executable. |
| [Chromium/Firefox](browser.log) | 22 pass / 22 deselected: six new real-runtime notification checks, ten retained lifecycle checks, and six retained emitted-bootstrap cancellation/resolved lifecycle/panel reflow checks. |

The new browser checks synchronously retry or dispatch terminal/persisted
pagehide during the first loading notification. The emitted bootstrap and real
supplied runtime execute unchanged otherwise. They assert public promise identity
and outcomes, ready/absent facade, empty status UI, and no page errors or unhandled
rejections. The existing hold/failure tests control the first Wasm fetch only.

All 34 runtime/program inventory files across root/nested outputs are byte
identical to the prior consolidation site. Published bootstrap matches changed
source; renderer/panel/lightbox bytes remain unchanged. The local preview was
regenerated and returns HTTP 200. Logs redact the absolute candidate prefix and
strip trailing spaces. Hashes of committed sources, published bootstrap and logs
are retained in the identity file.

```sh
git show e2b34da:web-lib/vir-prettym/bootstrap.js > BASELINE
VIR_BOOTSTRAP_SOURCE=BASELINE node --test --test-name-pattern='loading notification' Tests/vir-bootstrap.test.cjs
node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs Tests/pretty-presentation.test.cjs
node /home/egallego/lean/verso-slides/node_modules/typescript/bin/tsc -p web-lib/vir-prettym/jsconfig.json
node /home/egallego/lean/verso-slides/node_modules/typescript/bin/tsc -p web-lib/panel/jsconfig.json
lake build demo-slides
.lake/build/bin/demo-slides --output SITE
.lake/build/bin/demo-slides --output SITE/nested/deck
uv run --project browser-tests pytest browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_creation.py browser-tests/test_vir_prettym_site.py \
  --vir-site-acceptance --site-dir SITE --browser=all \
  -k 'lifecycle or published_bootstrap_pagehide or default_panel_reflows_with_wasm' -q
```

## Scope and next item

No broad native/bounds/presentation campaign or upstream producer checks were
rerun; the pure ABI and those production bytes are unchanged. No new Slides CI,
anonymous cold installation, offline campaign, exhaustive geometry, retention or
publication qualification is claimed. Runtime lock source remains `-`; this is
supplied-pack qualification. VIR's `0f720625` / `832ab095` successor is reported
public with successful workflows by Module, but remains unadopted by Slides.

No shared decision or new artifact is required for this correction. The current
consolidation is retained. Next Slides item remains one validated publication
plan, failure/stale-file tests and real-pack cost measurement. Stop here for review.
