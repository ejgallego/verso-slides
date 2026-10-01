# First landing scope and deferred patches

Scope audit: `33af25b38ad7ae8dfb6936a4533b80892cd80a15` against
`a51f7e581893042eb317edf50216060a26f38ac3` (2026-10-01).

The first Slides patch replaces the JavaScript PrettyM implementation with
Lean formatting executed through VIR. Unrelated improvements belong in separate
patches. The maintainer has scheduled work on the generic panel lifecycle fix
**after the first Slides patch lands**. This is a dependency in the work queue,
not a calendar reminder, and does not authorize a new PR or merge.

## Keep with the formatter replacement

| Addition | Reason |
| --- | --- |
| Lean segments, bounds, exported wrapper and independent ABI reference | Formatting behavior and safe admission at the new call boundary. |
| VIR dependency, formatter/carrier Lake libraries and resource recipe | Prepare the library-owned program/runtime for ordinary downstream builds. |
| Embedded resource publication and reserved VIR namespaces | Serve the new runtime without producer paths; configured assets must not overwrite it. |
| Bootstrap cancellation, disposal, loading/failure and retry | Own the asynchronous formatter instance and keep static slides usable. |
| Shared measurement, tags, escaping, binding lookup and panel/lightbox reflow | Present the Lean result consistently in both existing consumers. Font and resize reflow use that same presentation path. |
| Native/browser tests and small downstream example | Validate the replacement, lifecycle, annotations and owning-library build integration. |
| Toolchain/dependency alignment and Demo external-source line correction | Build compatibility for the selected Lean 4.34/VIR pair. |

## Remaining separation before final landing review

- **General asset-path hardening:** `validateAssetFilename` in
  `VersoSlides/Render.lean` and the two generic traversal/empty-component cases
  in `Tests/ConfigValidation.lean` change behavior beyond VIR assets. Prepare
  these as an independent asset-validation patch. The first landing must retain
  protection of `lib/vir` and `lib/.vir-stage`, including casing, separators and
  path aliases; do not simply delete validation and reopen that boundary.
  Extraction has not been applied to the qualified source.
- **Unused public convenience API:** `Pretty.formatPlain` has no callers in
  the candidate. Omit it in final scope cleanup rather than introduce a public
  plain-text feature in the first landing. This cleanup has not been applied;
  retain the current exact program identity until affected bytes are checked.

Long execution inventories are review evidence, not additional application
features. Preserve their immutable source references when arranging the final
implementation/removal/tests stack.

## Work queue after the first Slides patch lands

1. **Generic panel lifecycle fix — Slides owner.** Reveal's mobile scroll-mode
   restoration replaces slide DOM, losing the panel click handlers installed
   at startup. Make block setup idempotent, attach it to restored blocks, and
   dispose listeners, timers and observers associated with detached blocks.
   Keep it in an independent patch. The two-browser
   [reproducer](evidence/browser-acceptance/mobile-restore-repro.py) and
   [observations](evidence/browser-acceptance/mobile-restore-repro.json) are
   retained; no fix is implemented. Acceptance will cover repeated mobile to
   desktop transitions, selection, bindings, reflow and detached-block cleanup
   in Chromium and Firefox. No VIR API change is needed.
2. **General asset validation.** Review and land the separately extracted
   filename hardening, with focused path and collision tests.
3. **Existing deferred infrastructure.** Output CLI support, generic directory
   assets, managed incremental site builds and render-time input receipts stay
   outside this landing. Their drafts remain on the historical larger branches;
   each needs its own review and justification.

The mobile issue remains an open product limitation. Deferring its correction
does not turn the recorded 480px-and-wider geometry checkpoint into mobile
acceptance. Fresh downstream acquisition with artifact caches enabled is still
a first-landing qualification task, separate from the accepted `--no-cache` gate.

This audit changes documentation only: no production edits, dependency changes,
new tests, or claims of fresh execution.
