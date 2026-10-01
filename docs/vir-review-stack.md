# Minimal PrettyM review stack

Review branch: `feat/vir-prettym-first-landing`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`, the selected pre-formatter
Slides source. [Full review diff](https://github.com/ejgallego/verso-slides/compare/a51f7e581893042eb317edf50216060a26f38ac3...feat/vir-prettym-first-landing).

## Three commits

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
internal asset plan. Lake adds only the formatter/carrier libraries and their
owning-library resource prerequisite. The renderer consumes embedded values;
it does not discover producer paths or implement acquisition.

No general asset API, directory installer, managed `:slides` facet, input/output
receipt, CLI option or render-time input-reporting protocol is introduced.
Select an output destination through existing `Config.outputDir`.
General filename validation was extracted to the independent
`fix/asset-filename-validation` branch at `bc453b5`. The unused public
`Pretty.formatPlain` helper was removed. Only VIR-owned destination protection
remains in the formatter landing.

## Qualification

- [Final landing checks](evidence/landing-qualification/README.md): 54 native
  namespace/configuration cases, including renderer rejection before output
  writes; fresh ordinary downstream acquisition/build/render/warm rebuild with
  Lake defaults and explicitly enabled artifact-cache reads/writes.
- Both fresh builds used source `17c9114`, empty artifact/runtime caches and the
  public runtime URL; no supplied bytes, implicit Wasm build or retry. The enabled
  run populated 3,184 artifact-cache files. Four manifests/30 payloads match.
- The final stack preserves production bytes from that executed source. Its
  later differences are tests, replay tooling, documentation and commit grouping.
- [Earlier public-source/offline qualification](vir-public-runtime.md) retains
  its `2461cfa` source and explicit `--no-cache` scope.
- [Browser semantics, font, geometry and bounded retention](vir-browser-acceptance.md)
  retain their executed `16e748a` source. Program/runtime and browser presentation
  bytes are unchanged. No new browser, broader bounds or remote CI run is claimed.

Exact pair: VIR `87d7646d1ceb99c94efc92000370b814f83219d2`, Lean 4.34.0,
runtime `832ab095…`, program `97b280b7…`.
[Full identities and build contract](vir-deck-build.md).

The [deferred work queue](vir-followups.md) schedules the generic mobile panel
lifecycle correction after the first Slides patch lands. Its reproduced product
limitation remains documented. Output CLI, directory assets and managed builds
also stay outside this patch; historical drafts remain on the larger branches.
