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
| Lean segments, bounds and exported wrapper | Formatting behavior and safe admission at the new call boundary. |
| VIR dependency, formatter/carrier Lake libraries and resource recipe | Prepare the library-owned program/runtime for ordinary downstream builds. |
| Embedded resource publication and reserved VIR namespaces | Serve the new runtime without producer paths; configured assets must not overwrite it. |
| One-shot initialization, cancellation, disposal and loading/failure | Own one asynchronous formatter instance and keep static slides usable. |
| Shared measurement, tags, escaping, binding lookup and panel/lightbox reflow | Present the Lean result consistently in both existing consumers. Font and resize reflow use that same presentation path. |
| Native/browser tests and small downstream example | Validate the replacement, lifecycle, annotations and owning-library build integration. |
| Toolchain/dependency alignment and Demo external-source line correction | Build compatibility for the selected Lean 4.34/VIR pair. |

## Completed separation

- **General asset-path hardening:** `validateAssetFilename` and its two existing
  generic traversal/empty-component cases were moved to the independent branch
  `fix/asset-filename-validation`, commit `bc453b5`, on base `a51f7e5`.
  [Review the separate patch](https://github.com/ejgallego/verso-slides/compare/a51f7e581893042eb317edf50216060a26f38ac3...fix/asset-filename-validation).
  It contains only those two files and no formatter dependency. Tests on this
  extracted branch have not been run; review/landing remain deferred.
  The formatter candidate checks destinations only against the VIR-owned
  `lib/vir` directory and its library parent. The later asset simplification
  removes the private stage and bootstrap asset, so those names are no longer reserved.
  Lexical resolution accounts for output directory, absolute paths, `.`, `..`,
  repeated separators and casing. It does not validate general asset filenames
  or resolve arbitrary filesystem symlinks.
- **Unused public convenience API:** `Pretty.formatPlain` was removed. The
  exported segment ABI and bounds remain unchanged. A warm owning-library build
  regenerated the program pack, which stayed byte-identical to the qualified
  pack; the runtime pack also stayed byte-identical.

### Scope cleanup and subsequent qualification

`lake build demo-slides test-config-validation` passed (748 jobs) after the
formatter/path changes; the final bootstrap-alias extension was compiled in a
subsequent build. That original cleanup compiled tests without running them.
The subsequent [landing qualification](evidence/landing-qualification/README.md)
executed all 54 namespace/configuration cases, including three renderer
rejections before output writes, and two fresh ordinary downstream builds with
default and explicitly enabled artifact caching. No new browser or CI result
is claimed. Earlier browser evidence retains its original executed source.

Program pack: 122,442 bytes, SHA-256
`c48f6857c125340a748c983635abe52e8e603fc62fc59ef5cc41746f86b953da`;
content ID remains `97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58`.
Runtime pack: 1,120,731 bytes, SHA-256
`d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`;
content ID remains `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.

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
acceptance. Fresh downstream acquisition with default and explicitly enabled
artifact caching now passes, separately from the earlier accepted `--no-cache`
gate. Both retain their exact source and artifact evidence.

The original `84137ec` audit changed documentation only. The scope cleanup kept
the formatter ABI and artifacts unchanged. The subsequent
[asset simplification](evidence/asset-simplification/README.md) adopts VIR
`590be72b` while retaining the exact runtime/program bytes. Generic asset APIs
and the mobile correction remain deferred.
