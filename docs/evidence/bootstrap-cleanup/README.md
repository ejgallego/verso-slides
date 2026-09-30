# Bootstrap cleanup-reporting regression

Baseline: Slides `51c6d782285845c4c9dee5f2f1852051cdaffede`, pinned VIR
`47e82e9a483e727431bb004fb64ce76ada739ba9`. The source patch and these results
belong to this review commit; [identities](identities.json) record the exact
bootstrap/test/reference hashes, artifact IDs and affected published bootstrap.
The retained generated `.beam/` directory was left untouched.

## Reproducer and behavior

The existing VM fixture executes the actual bootstrap, substituting only module
acquisition and controlling runtime completion. Child processes isolate deliberate
unhandled-rejection observation from Node's test runner.

With creation pending, send terminal `pagehide`, then resolve it with a program
whose `dispose()` throws `Error`, `null` or `undefined`. At the baseline:

- Disposal is attempted once and no stale facade is installed.
- An ordinary Error loses the cleanup diagnostic.
- Null/undefined additionally produce an unhandled TypeError in the ignored
  reporting promise.

[Red log](red.log): 7 existing tests pass and all 3 added regression cases fail
against the unmodified baseline bootstrap. The retained log replaces the absolute candidate checkout prefix with
`<candidate>` and strips trailing spaces; assertion details/results are unchanged.
This is a controlled bootstrap reproducer, not a browser race or leak measurement.

The fix keeps the existing stale-page error and attaches the untouched cleanup
value as an own readonly property. Reporting logs the primary error/context and
raw cause/cleanup values, checks presence safely, and contains diagnostic/DOM
reporting failures. A concise alert never coerces arbitrary exception objects.
No new upstream API, runtime pack, protocol or retry framework is involved.

## Fresh local checks

| Check | Result / scope |
| --- | --- |
| [Node green log](green.log) | 20 pass: 17 bootstrap and 3 compact-admission tests. Existing cancellation/secondary-cleanup/bfcache tests retained; new Error/null/undefined late-disposal, arbitrary rejection, proxy inspection, sink failure and raw-cause cases pass. |
| Formatter + panel typecheck | Both exit 0 with TypeScript 5.7.2 |
| [Targeted build](build.log) | `lake build demo-slides` passes, 743 jobs; no Wasm source build |
| Fresh root/nested native rendering | Both succeed |
| [Focused browser log](browser.log) | 6 pass / 24 deselected in Chromium and Firefox: emitted-bootstrap pagehide during actual creation, resolved disposal/bfcache/reload, and real panel reflow |

The late-disposal exception cases are Node regressions. The browser regressions
execute fresh emitted bytes and preserve the real pending/resolved behavior;
they do not reproduce the artificial late-disposal exception race.

```sh
node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs
node_modules/.bin/tsc -p web-lib/vir-prettym/jsconfig.json
node_modules/.bin/tsc -p web-lib/panel/jsconfig.json
lake build demo-slides
.lake/build/bin/demo-slides --output SITE
.lake/build/bin/demo-slides --output SITE/nested/deck
uv run --project browser-tests pytest \
  browser-tests/test_vir_prettym_creation.py browser-tests/test_vir_prettym_site.py \
  --vir-site-acceptance --site-dir SITE --browser=all \
  -k 'published_bootstrap_pagehide or published_host_call_and_lifecycle or default_panel_reflows_with_wasm' -q
```

For a baseline red replay, extract `web-lib/vir-prettym/bootstrap.js` from commit
`51c6d782` into a temporary file and set `VIR_BOOTSTRAP_SOURCE` to that path when
running the current bootstrap tests. Extra new diagnostic tests will also fail;
the retained red log records the original three-case reproduction before editing.

All runtime/program published inventory files were byte-compared with the prior
qualified site and are identical: runtime `401b115e`, program `97b280b7`, Wasm
`e74e7f8e`. The emitted application bootstrap changed and was rebuilt/retested.
Historical 101-native/11-Node/30-browser acceptance remains separately credited,
not labelled as fresh. Full ABI/native/browser, downstream, anonymous cold/offline,
geometry, retention and performance campaigns were not rerun.

## CI and next item

Independent unauthenticated GitHub API readback confirmed
[VIR run 36720794347](https://github.com/ejgallego/lean-vir/actions/runs/36720794347)
completed successfully at exact `47e82e9a`; [retained response](vir-run.json).
The exact-head query for Slides `51c6d782` returned zero runs:
[retained response](slides-baseline-runs.json). Neither result qualifies a new
Slides source revision in CI. Authenticated `gh` initially failed with HTTP 401;
public API readback supplied the verification above without changing credentials.

No artifact or contract decision is needed from VIR for this fix. Next is Slides
loading/failure/explicit retry ownership; mandatory formatter consolidation and
publication planning follow in separate slices. Durable anonymous acquisition
remains VIR-owned and blocks final downstream release acceptance. Stop here for
review; branch pushes are authorized, PRs/merge/releases are not.
