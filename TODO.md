# Slides follow-ups after the first VIR integration patch lands

Dedicated branch: `todo-after-vir-merge`.
Worktree: `.worktrees/todo-after-vir-merge`.
Existing Slides integration owner retains this lane.

**Execution gate: the first Slides formatter integration patch must land first.**
The branch name is a convenient label; an upstream VIR merge alone does not
start these follow-ups. This branch preserves implemented work and records the
queue, without opening any PR now.

## Retained baseline

This branch starts at reviewed
`c4c136a1b40f05bf9b65213e5940eee869803cf5`. It contains the implemented additions
below, including their tests, before they are removed from the minimal landing
candidate. Setting up this branch does not itself prune the landing branch.

Implementation/test bytes match executed
`41b5747c722b8f7519676129e658acbe72ef68a3`; only short review notes differ.
[Qualification evidence](https://github.com/ejgallego/verso-slides/tree/f7a6b5171ffc2118561bfc2f7cd826ad0bcdebb6/docs/evidence/lean-names-adoption)
retains the exact supplied pair, commands,41 Node/native/build results,
55 Chromium/Firefox checks, observations and actual packs. Those results belong
to that baseline, not automatically to future edited or reduced implementations.

Active first-landing review:
[`feat/vir-prettym-lean-names-review`](https://github.com/ejgallego/verso-slides/tree/feat/vir-prettym-lean-names-review).
Keep the three-commit layout there and retain ordinary asynchronous readiness,
error reporting, Lean semantics, typed ABI, measurement/presentation and focused
integration tests. No permanent JavaScript formatter fallback or extra backend.

## Postponed additions from the current candidate

- [ ] **Document lifetime cleanup:** pagehide cancellation/disposal, late-result
  guards and exclusive pending/terminal/bfcache/disposal tests.
  Sources: `web-lib/panel/pretty-init.js`, `Tests/vir-bootstrap.test.cjs`,
  browser creation/lifecycle tests. Keep basic asynchronous initialization and
  current-selection readiness in the first patch.
- [ ] **Font and extra lightbox reflow:** loadingdone listeners and added lightbox
  resize reformatting, with their exclusive font/resize tests. Preserve the panel's
  existing resize behavior in the first patch.
  Sources: `web-lib/panel/panel.js`, `lightbox.js`, browser presentation/lightbox
  and geometry tests.
- [ ] **Binding-selector escaping:** shared CSS.escape selector helper and unusual
  binding regression cases. Ordinary binding behavior remains part of formatter
  acceptance; this independent selector correction follows separately.
  Sources: `web-lib/panel/pretty.js`, `panel.js`, `lightbox.js`, Node/browser tests.
- [ ] **Page-wide loading/error banner:** floating presentation and its styling/
  exclusive tests. Keep basic expression-level loading/error reporting.
  Sources: `web-lib/panel/pretty-init.js`, `panel.css`, bootstrap/lifecycle tests.
- [ ] **Geometry/retention test infrastructure:** viewport/theme/Unicode/font
  measurement matrices, screenshots and repeated-call/GC diagnostics. Keep focused
  native/browser text, tag, annotation and formatter-path tests in the first patch.
  Source: `browser-tests/test_vir_prettym_geometry.py` and associated corpus mode.

## Previously deferred independent work

- [ ] Formatter resource budgets; retain the bounded prototype/history and revisit
  cost/behavior/ABI deliberately. See `docs/vir-followups.md`.
- [ ] Mobile panel restoration across Reveal's scroll-mode transition.
- [ ] General asset filenames/prefixes/case aliases; preserve the existing writer
  and exact collision behavior until that separate patch.
- [ ] Output CLI, directory assets and managed build infrastructure. Existing
  branches/worktrees remain owned independently; this checklist does not claim
  or merge their drafts.

## How to resume

After the first Slides patch lands, start one focused PR from its actual landed
head. Port only the selected addition from this retained branch; do not merge
this whole branch back or resurrect earlier role/JSON/export-table interfaces.
Reconcile the then-selected exact VIR source/runtime/program and run only the
acceptance affected by the addition. Use explicit handoffs for any shared API
change. Keep the backlog and historical evidence independent of release claims.

The one-line Demo source-location correction stays in the first patch's third
commit as previously agreed: the pinned Verso version requires it for the build.
Formatting-only noise should be dropped, rather than made into a follow-up PR.
