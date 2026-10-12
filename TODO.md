# Slides post-landing queue

Authoritative queue: branch `todo-after-vir-merge`, worktree
`.worktrees/todo-after-vir-merge`; existing Slides integration owner maintains it.
**Start these PRs after the first Slides formatter integration patch lands.**
None of the deferred PRs below has been opened. The separate shared rendering
refactor is open as PR83 before the formatter integration. Use one focused PR
per item, based on the actual landed head. Preserve mandatory VIR and full Lean-name/typed-array contracts.

## Active landing and retained work

[Formatter PR85](https://github.com/leanprover/verso-slides/pull/85) is open,
non-draft, at `db12f3a9bce3a4a202df0c5809b1aaf0464026ba`, with three formatter
commits stacked on the separate [shared rendering PR83](https://github.com/leanprover/verso-slides/pull/83).
Its retained worktree is `.worktrees/vir-prettym-435rc4-release`, branch
`feat/lean-prettym`. The primary checkout holds `feat/vir-pretty-lab`, the
historical Lean4.34rc2 lab and comparison panel. This is the third, deferred-work tree.

The submitted pair uses VIR's released `4.35-rc4` source `be01a69d`, runtime
`092a7466`, and program `249096a9`. Local qualification at the submitted head
passed the ordinary native/Node tests and 310 Chromium/Firefox tests. Raw logs,
identities and earlier qualification are retained on
[archive/vir-prettym-main435](https://github.com/ejgallego/verso-slides/tree/59a8ffd1f2c867a2660fe403f0ccb4971931844a/docs/evidence).
These are executed local results, not a statement of current CI status.

Upstream Slides main has moved to stable Lean4.35.0. Landing PR85 waits for the
matching VIR source/runtime, then a deliberate rebase and affected qualification.
Do not relabel the rc4 pack or port deferred features during that adoption.

The stock `+Module:virResourcePack` prerequisite and `include_vir_assets` supply
one compiled ResourceSet. Lean owns formatting; JavaScript measures and presents
it. The first landing excludes the deferred policy and UX changes below.

This branch retains the implemented follow-ups at
[`c4c136a`](https://github.com/ejgallego/verso-slides/tree/c4c136a1b40f05bf9b65213e5940eee869803cf5).
Those code/tests match executed `41b5747`; their independent full-baseline
qualification remains in
[archive f7a6b517](https://github.com/ejgallego/verso-slides/tree/f7a6b5171ffc2118561bfc2f7cd826ad0bcdebb6/docs/evidence/lean-names-adoption).
It does not qualify future ports. `docs/vir-followups.md` links to this queue.

Superseded worktrees were retired on 2026-10-12. Source refs and useful untracked
qualification files are recoverable from the primary checkout's
`build/cleanup-20261012/` archive and its recovery index. Published historical refs
remain available; filesystem paths to retired trees are not prerequisites.

## Deferred work with stable IDs

| ID | Item / state | Retained source and next action |
| --- | --- | --- |
| F01 | Document lifetime — implemented, postponed | c4c136a `pretty-init.js`, Node bootstrap and browser creation/lifecycle tests. Port pending acquisition cancellation, terminal pagehide disposal, late-result cleanup and bfcache tests in one focused PR. No synchronous Lean preemption claim. |
| F02 | Font/additional lightbox reflow — implemented, postponed | c4c136a panel/lightbox loadingdone and lightbox resize listeners, exclusive tests. Preserve existing panel ResizeObserver; qualify delayed-font and lightbox resize behavior separately. |
| F03 | Selector/class escaping — implemented, postponed | c4c136a shared CSS.escape bindingSelector and annotation-class escaping, unusual binding tests. Port this independent correction with its regressions; basic text/binding-attribute escaping stays in the first patch. |
| F04 | Floating page status banner — implemented, postponed | c4c136a bootstrap DOM banner, panel.css and exclusive lifecycle/Node checks. Keep expression-level loading/error status in the first patch. Do not restore unused retry/button styling. |
| F05 | Geometry/retention campaign — implemented, postponed | c4c136a geometry-corpus mode and browser geometry/font/viewport/theme/timing/GC tests; f7a6b517 raw measurements/screenshots. Port separately; recorded extents/capacities are observations, not general geometry/performance/leak guarantees. |
| F06 | Extra DOM/panel presentation — implemented, postponed | c4c136a data-format-tags diagnostic spans, multi-signature lightbox scan and clearing rich-format source on hide. First patch keeps full raw returned tags/nearest annotation and existing HTML behavior. Split this further if features have different review owners. |
| F07 | Formatter budgets — prototype retained | [bounded-v2 archive](https://github.com/ejgallego/verso-slides/tree/archive/vir-prettym-bounded-v2). Revisit node/depth/text/indent/output/segment/tag budgets and traversal cost. Port policy to then-current pure Array ABI; do not restore old Except/JSON/aliases or inherit old qualification. |
| F08 | Mobile panel restoration — reproduced, pending | [33af25b evidence](https://github.com/ejgallego/verso-slides/blob/33af25b38ad7ae8dfb6936a4533b80892cd80a15/docs/evidence/browser-acceptance/mobile-restore-repro.json). Reveal scroll-mode restoration replaces DOM; rebind interactions/reflow to new blocks and release old observers. Test fresh mobile and repeated transitions separately. |
| F09 | Asset filename/prefix/case policy — prototype retained | tag `archive/asset-filename-validation` (bc453b5); [older reserved-prefix implementation](https://github.com/ejgallego/verso-slides/tree/edf3fdb2ffe719eefddf222e6512676a729314d5). Review general writer path/namespace/casing policy separately. Existing exact collision/in-place/stale behavior stays in the first patch. |
| F10 | Output CLI / reusable directory assets — prototype retained | tag `archive/reusable-deck-assets` (cf9ba9c). Reconcile only selected output/custom-assets changes with actual landed runtime/build APIs; no old backend or producer-path workaround. Related managed-build improvements need a demonstrated use case/measurement. |
| F11 | Module-system compatibility — tracked separately | Tag `archive/modules-docs` (268257a) records experimental support and [subverso239](https://github.com/leanprover/subverso/pull/239). Reconcile actual upstream support before further module changes; do not silently combine that branch with the formatter candidate. |

All above are Slides-owned or independently owned drafts as noted; this checklist
does not transfer ownership or merge other worktrees. The rc4 source/runtime are publicly released; stable4.35 adoption remains gated
on the matching VIR release. Further producer/native/config experiments remain
separate, with no automatic adoption.

## Related upstream issues to keep visible

Read open upstream issues on2026-10-07. Titles below are issue reports, not our
executed reproductions or assignments. The fork has issues disabled; do not create
new upstream tickets/PRs just to mirror this queue.

| Issue | Report / routing |
| --- | --- |
| [57](https://github.com/leanprover/verso-slides/issues/57) | Content before the first slide cannot be interacted with. Independent interaction/Reveal triage. |
| [56](https://github.com/leanprover/verso-slides/issues/56) | `#print axioms` does not display anything. Code/output rendering triage. |
| [55](https://github.com/leanprover/verso-slides/issues/55) | Unnecessary warning for long fragment code. Warning policy, separate from formatter replacement. |
| [54](https://github.com/leanprover/verso-slides/issues/54) | Resize rendering with stretched code inside a fragment. Related resize work, not assumed identical to F08. |
| [53](https://github.com/leanprover/verso-slides/issues/53) | Fragment `#check` output does not appear at the same time. Output/fragment timing. |
| [52](https://github.com/leanprover/verso-slides/issues/52) | Rendering space after `#check`. Establish a native/render reproducer before assigning to PrettyM. |
| [38](https://github.com/leanprover/verso-slides/issues/38) | leanLibCode discussion. External-code/module behavior. |
| [34](https://github.com/leanprover/verso-slides/issues/34) | PDF export. Independent output feature. |
| [9](https://github.com/leanprover/verso-slides/issues/9) | Font-size configuration. Independent UI/configuration. |
| [8](https://github.com/leanprover/verso-slides/issues/8) | Horizontal centering. Independent UI/documentation. |

## Resume procedure

1. Select one ID after the first Slides patch lands; record its owner and landed base.
2. Port only that addition from the named source. Do not merge this full branch back.
3. Reconcile exact dependencies/artifacts and qualify affected native/browser behavior.
4. Use explicit producer handoffs for shared API changes; retain primary/raw errors.
5. Link the resulting PR/evidence here and close the item only after its actual landing.

No branch deletion, force-push, merge, release or execution of deferred items is
implied by this consolidation. Historical correspondence remains history; this
file carries current routing/status and should be updated instead of adding
another overlapping pending-decisions document.
