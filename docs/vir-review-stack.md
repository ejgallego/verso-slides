# Minimal PrettyM review stack

Review branch: `feat/vir-prettym-first-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`, the selected pre-formatter
Slides source. [Full review diff](https://github.com/ejgallego/verso-slides/compare/a51f7e581893042eb317edf50216060a26f38ac3...feat/vir-prettym-first-landing).

## Original three commits

1. `100f870`: bounded Lean formatter, exact dependency pins, library-owned
   resource preparation/carrier, publication and internal lifecycle bootstrap.
   The existing presentation remains until the second commit: this is an
   intermediate migration step, not a supported second backend.
2. `a5005e4`: remove the handwritten JavaScript layout engine and connect panels
   and lightboxes to mandatory VIR through shared measurement/presentation.
3. The third commit adds tests, the downstream example and documentation with
   retained qualification evidence. The final tree has the qualified production
   bytes; the intermediate commits are not separately qualified.

This is a new review branch. Existing candidate/review histories are preserved;
no branch was force-pushed, merged or converted into a PR.

## First landing scope

`Config` and `slidesMain` retain their existing APIs. Bootstrap bytes enter the
internal HTML renderer; resource bytes enter the ordinary asset plan. Lake adds
only the formatter/carrier libraries and their
owning-library resource prerequisite. The renderer consumes embedded values;
it does not discover producer paths or implement acquisition.

No general asset API, directory installer, managed `:slides` facet, input/output
receipt, CLI option or render-time input-reporting protocol is introduced.
Select an output destination through existing `Config.outputDir`.
General filename validation was extracted to the independent
`fix/asset-filename-validation` branch at `bc453b5`. The unused public
`Pretty.formatPlain` helper was removed. Only VIR-owned destination protection
remains in the formatter landing.

## Historical qualification (`c7f9c2d`)

- [Final landing checks](evidence/landing-qualification/README.md): 54 native
  namespace/configuration cases, including renderer rejection before output
  writes; fresh ordinary downstream acquisition/build/render/warm rebuild with
  Lake defaults and explicitly enabled artifact-cache reads/writes.
- Both fresh builds used source `17c9114`, empty artifact/runtime caches and the
  public runtime URL; no supplied bytes, implicit Wasm build or retry. The enabled
  run populated 3,184 artifact-cache files. Four manifests/30 payloads match.
- The original three-commit stack preserves production bytes from that executed source. Its
  later differences are tests, replay tooling, documentation and commit grouping.
- [Earlier public-source/offline qualification](vir-public-runtime.md) retains
  its `2461cfa` source and explicit `--no-cache` scope.
- [Browser semantics, font, geometry and bounded retention](vir-browser-acceptance.md)
  retain their executed `16e748a` source. Program/runtime and browser presentation
  bytes are unchanged. No new browser, broader bounds or remote CI run is claimed.

Historical pair: VIR `87d7646d1ceb99c94efc92000370b814f83219d2`, Lean 4.34.0,
runtime `832ab095…`, program `97b280b7…`.
[Full identities and build contract](vir-deck-build.md).

## Asset simplification followup

`cfe1f9f2c7b9d7ffe9174daf879bff8f327d2a71` updates both dependency pins to
the published PR #207 head `590be72bd91519c7beb89e105dfba498a4aff140` and
removes the multi-program URL map, bootstrap asset injection and separate staged
resource writer. One validated plan supplies URLs and files to the existing
renderer and asset writer. The bootstrap is inline; `Config.extraJs` is untouched.
Resource/program identities and formatter/runtime browser bytes are unchanged.

This is an ordinary followup to the published review history, not a rewrite of
the three original commits. [Fresh execution evidence](evidence/asset-simplification/README.md)
covers the new output path. Publication retains stale files and can leave partial
output on failure, as the existing asset writer does.

## One-shot client followup

`4821ba8e45c511bea94111881191899693371361` implements the maintainer's smaller
first-client lifetime: one initialization per document, no retry control, public
retry entry or replacement attempts. Expected input/Lean errors keep the same
healthy program usable; unexpected failure closes formatting without recreation
or replay. Pending cancellation, late completion disposal, persisted pagehide
and raw cleanup diagnostics remain document-owned.

[Focused current evidence](evidence/one-shot/README.md) replaces retry/replacement
coverage with the surviving application contract. Generic loader lifecycle
matrix tests are left to VIR. Asset publication, dependency pins, direct ABI and
runtime/program identities are unchanged from the preceding checkpoint.

The [deferred work queue](vir-followups.md) schedules the generic mobile panel
lifecycle correction after the first Slides patch lands. Its reproduced product
limitation remains documented. Output CLI, directory assets and managed builds
also stay outside this patch; historical drafts remain on the larger branches.
