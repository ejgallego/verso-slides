# Loading, failure and explicit retry checkpoint

Qualified implementation: Slides `481ea5cfffef0e125579c1daee6725c75023f372`,
following reviewed cleanup `c1bcc76c8cec8fe6aae5be633ac10ce1983656b2`.
Selected VIR remains `47e82e9a483e727431bb004fb64ce76ada739ba9` in both Lake
files and the clean dependency checkout. Lean is 4.34.0 / revision
`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; runtime `401b115e` and program
`97b280b7` retain their full identities and hashes in [identities.json](identities.json).
The following documentation commit changes no qualified production bytes.

## Behavior and ownership

The bootstrap owns one current attempt, its pending controller, and its resolved
program. Explicit retry invalidates the prior attempt before aborting pending
creation or disposing a ready program, then creates a fresh attempt. Both success
and failure completion check attempt identity. An obsolete success is disposed
once; its raw cleanup failure remains an own `cleanupError` on the primary error.
Ready-disposal failures are logged untouched after ownership/facades are detached.
Reporting and DOM failures cannot create a secondary reporting rejection.

Loading has an accessible status; initialization failure has an alert and a
**Retry Lean formatting** button. The panel initializes with Reveal immediately:
navigation, selection, focus, divider interaction and static information do not
wait for VIR. Selected rich goals show status while creation is pending or failed.
State changes render the currently selected source. Cleared selections also clear
their reflow source, so readiness/resize cannot revive an earlier selection.

`versoVirReady` is the current attempt's observed promise; `versoVirState` and
`verso-vir-statechange` notify presentation. `versoVirRetry()` starts creation,
without replaying arbitrary runtime calls. Persisted pagehide preserves ownership;
terminal pagehide releases it once and prevents further creation. AbortSignal
owns pending creation only, with no claim to preempt synchronous Lean execution.
These are Slides lifecycle controls, not a new VIR API or formatter abstraction.

## Executed local evidence

| Check | Result / scope |
| --- | --- |
| [Baseline red](red.log) | Five new lifecycle checks fail against unchanged `c1bcc76c` bootstrap: loading/failure state, early retry, and both overlap orders. The VM substitutes module acquisition only. |
| [Node green](green.log) | 35 pass: 32 bootstrap and 3 compact-admission checks. Includes module/creation cancellation, reversed success order, obsolete rejection, explicit button retry, Error/null/undefined disposal failures, raw diagnostics, ignored rejection observation, terminal/persisted pagehide and the retained cleanup regressions. |
| [Typechecks](types.log) | Both JavaScript projects pass with TypeScript 5.7.2. |
| [Targeted warm build](build.log) | `lake build demo-slides` passes, 743 jobs; no Wasm source build. |
| [Root render](render-root.log), [nested render](render-nested.log) | Fresh native site rendering succeeds at both URL locations. |
| [Chromium/Firefox](browser.log) | 16 pass / 24 deselected: 10 new lifecycle checks and 6 retained emitted-bootstrap cancellation, resolved lifecycle and real panel reflow checks. |

The browser control holds or rejects only the first published Wasm fetch.
Validation, instantiation, formatting and disposal use the emitted VIR loader and
real supplied runtime. It checks slow initialization/current selection, cleared
selection, acquisition failure plus button retry, cancellation of old acquisition,
fresh instances after ready retry, and persisted/terminal pagehide. No page error
or unhandled rejection is observed in these checks. Artificial late success and
throwing disposal cases are controlled Node evidence, not real-browser race or
memory-leak reproductions.

The initial browser run had four failures from two test-control mistakes: using
fragment navigation instead of changing slides, and starting an orphaned aborted
fetch when releasing an already-settled gate. Both controls were corrected; no
production change was needed for those failures. The retained log is the final run.

Every declared runtime/program payload was checked against length/SHA-256, and
all 34 inventory files across root/nested sites were byte-compared with the prior
`c1bcc76c` site. Published bootstrap/panel JS/CSS match current source; the independent
ABI reference and relative manifest/module URLs were checked at both locations.
Runtime/program bytes are unchanged. This qualifies changed application bytes,
not changed producer bytes. Source and log hashes are retained in the identity file.

```sh
node --test Tests/vir-bootstrap.test.cjs Tests/pretty-input.test.cjs
node_modules/.bin/tsc -p web-lib/vir-prettym/jsconfig.json
node_modules/.bin/tsc -p web-lib/panel/jsconfig.json
lake build demo-slides
.lake/build/bin/demo-slides --output SITE
.lake/build/bin/demo-slides --output SITE/nested/deck
uv run --project browser-tests pytest \
  browser-tests/test_vir_prettym_lifecycle.py \
  browser-tests/test_vir_prettym_creation.py browser-tests/test_vir_prettym_site.py \
  --vir-site-acceptance --site-dir SITE --browser=all \
  -k 'lifecycle or published_bootstrap_pagehide or default_panel_reflows_with_wasm' -q
```

For the baseline replay, extract `web-lib/vir-prettym/bootstrap.js` from
`c1bcc76c`, set `VIR_BOOTSTRAP_SOURCE` to it and run the current Node file with
`--test-name-pattern='slow initialization|failure keeps raw|overlapping attempts|retry before'`.
Logs replace the absolute worktree prefix with `<candidate>` and strip trailing
spaces; commands/assertions/results retain their meaning.

## Limits and next checkpoint

The runtime lock still has `source: "-"`: this is supplied-pack development.
Retry does not repair permanent integrity/signature failures; a browser-cached
module import failure may require reloading the page. No automatic retries or
formatting calls are replayed. Native bounds and pure ABI are unchanged; the
historical 101-native/30-browser campaign was not rerun. No new Slides CI result,
fresh anonymous downstream build, cold/offline installation, broad visual geometry,
theme/font/Unicode campaign, retention/performance or publication qualification
is claimed. Review permissions allow this branch push, not PR/merge/releases.

No upstream contract or new artifact is needed for this slice. VIR's unadopted
local `0f720625` / `832ab095` successor remains separate, with durable distribution
still gated. Next Slides item is mandatory-VIR consolidation: remove the temporary
pixel selection and JS layout implementation, then unify presentation. Stop at
this lifecycle checkpoint for review.
