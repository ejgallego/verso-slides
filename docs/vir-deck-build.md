# PrettyM candidate on Lean 4.34

This candidate uses Lean `v4.34.0`, VIR [PR #207](https://github.com/ejgallego/lean-vir/pull/207)
at the authorized local successor `47e82e9a483e727431bb004fb64ce76ada739ba9`,
and the matching
Verso revision pinned in `lakefile.lean`. The exact successor and pack were supplied explicitly for this checkpoint;
PR #207 now publishes the same `47e82e9a` head. [VIR CI run 36720794347](https://github.com/ejgallego/lean-vir/actions/runs/36720794347) passed at this exact head; later readback is retained in `docs/evidence/bootstrap-cleanup/vir-run.json`. PR #207 is based on main with the
landed ABI4 runtime work. Its runtime lock is available-only:
the exact verified runtime pack must already be supplied locally.

## Build and render a deck

```sh
lake build demo-slides
lake exe demo-slides
lake build :slides
```

An ordinary downstream deck still calls `slidesMain`. Lake prepares the
PrettyM program pack through the `VersoSlidesVirPrettyMResources:virResourcePack`
facet. The carrier embeds its bytes, and the native renderer publishes the
validated runtime and program bundles under `lib/vir/<contentId>/`. No
producer checkout path, generated manifest path, or SDK directory is read by
the deck executable. The generated site can move under a URL prefix.

The browser bootstrap imports the published runtime module and calls
`createProgram` with the two published manifests, the independently embedded
`expectedExports` v2 reference and a pending-creation `signal`. Its `formatSegments`
role exports `Std.Format → Nat → Nat → Except FormatError (Array Pretty.Segment)`
through VIR's direct host call ABI. The bounded panel adapter converts its compact format tree to
the host ABI value and obtains a column width from DOM measurement. It passes
the result to the existing annotation/HTML stage. The extra JSON request and
response protocol has been removed. The generated slide's existing rich-format
metadata is still JSON and is parsed by the panel before this call.

`VersoSlides.Pretty.formatSegments` is the single Lean layout implementation;
`VersoSlides.VirPrettyM.formatSegments` is its exported wrapper. The legacy
JavaScript formatter remains with `--pixel-pretty` or `Config.virPrettyM := false`
as superseded work to remove in the mandatory-VIR consolidation slice.

The old 4.34.0-rc2 branch `feat/reusable-deck-assets` retains the original
path-based build and custom-root evidence. This candidate carries its default
panel integration, asset handling, and managed `:slides` site facet forward.
Application-owned program composition needs a separate resource recipe and
carrier; the old `virSlidesMain` path override does not apply to #207.

## Current strict-creation checkpoint

[Exact-pair evidence and bounds](vir-prettym-bounds.md) records qualification of
local VIR `47e82e9a` / runtime `401b115e` / Slides v2 program `97b280b7`.
The exact supplied pack must be seeded with VIR's public acquisition tool before
an ordinary build. Anonymous installation, visible retry UX and final mandatory
presentation consolidation remain open. The historical downstream/pixel evidence
below is retained; those broader checks were not repeated for this narrow gate.

## Historical acceptance boundary

The exact Lean 4.34 / VIR `0a9abac0` pair passed supplied-pack local site and
browser acceptance in Slides `9cb9b54`. That checkpoint's aligned dependency pin was its direct
test-only successor `cf816e94`: the complete diff adds only three lines to
`tests/packages/lake-facets.sh`, explicitly acquiring its standalone comparison
tool. Production sources, runtime/API and pack lock are identical, so the
executed native/browser evidence below is retained without rerunning it.
At that checkpoint, the source pin, Lake manifest and root/downstream
dependency HEADs agreed at `cf816e94`. Fresh successor CI remains upstream qualification work.
Resource compatibility is exactly `{leanRevision, virVersion}`.
VIR's public acquisition tool validated and installed the supplied pack:

| Artifact | Immutable identity |
| --- | --- |
| Lean revision | `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b` |
| VIR version | `1` |
| Runtime content ID | `ff7b5a61fd6558e7f4e828e460f3aed033803a84ef599073c6cfe44af85e2ba3` |
| Runtime pack SHA-256 | `ebaf2aef57fd0ab9315477544fee9d3775eebdf52bbaf06aa749fbde93bb2d47` |
| Published Wasm SHA-256 | `e74e7f8e663537a4f0035c0edf594fbea9699f40b4b683ffe563922b4f453ec4` |
| Program content ID | `0a2c42819737c359f9a72e3bbe4e7fd890db6f96891be171c92fa095057d4ae2` |

Executed checks: ordinary `demo-slides`/carrier and managed `:slides` builds,
the seven original native semantic checks through the exported wrapper,
and 13 published-site/browser checks in Chromium and Firefox. The
test-only native oracle emits the exact exported wrapper's segment results for
the existing seven formats; the browser replays the real compact converter at
root and nested URLs and compares complete segment arrays and tag stacks.
The published demo and an independent deck both carried complete, validated
runtime and program bundles at relative URLs. Chromium and Firefox loaded the
Wasm program under a nested URL, called `formatSegments`, rendered and resized
the default panel, and reopened it after page disposal. The panel's text and
token count matched the old pixel-based path on the same demo slide. This
comparison checks content and annotations; it does not establish pixel-for-pixel
geometry equivalence. The earlier 4.35 embedded-resource demo and 4.34.0-rc2
deck evidence remain separate qualifications. The exact matching ABI4 runtime
pack must be supplied locally for a fresh build. Anonymous cold installation
is a separate pending qualification. The historical `d68e701` / VIR `970ad3d2`
pair and its old pack remain recorded in history and the
[production checklist](vir-production-checklist.md).

Production requires mandatory VIR and one JS measurement/presentation layer.
The pixel switch in this pin-qualification stage supplies temporary comparison
evidence; its retirement and the typed formatter/lifecycle work follow the
shared-contract review checkpoint in that checklist.

### Site acceptance process

1. Record the exact Slides, VIR and Lean revisions and seed only the runtime
   pack selected by VIR's lock. Build the formatter library, Slides library,
   and `demo-slides` executable. The application build must obtain its program
   pack through the owning-library facet without a producer path in the native
   executable.
2. Run `lake exe demo-slides --output SITE` and `lake build :slides`. Check that
   each output has `index.html`, the bootstrap, both content-addressed bundles,
   valid `bundle.json` envelopes and every declared payload. The bootstrap URLs
   must resolve after moving the whole site under a nested URL prefix; no local
   `.lake` or checkout path may appear in the published loader configuration.
3. Build a minimal independent downstream deck using ordinary `slidesMain`.
   Repeat the site checks for its output and for a custom output directory.
4. Check the managed `:slides` lifecycle: an unchanged build retains its
   output, and a changed input or missing/damaged published file regenerates
   it. Check reserved `lib/vir` asset collisions before publication and that
   unrelated output files survive a resource update.

Site acceptance establishes a complete, movable published site. Browser
acceptance then serves it over HTTP and checks real Wasm calls, panel output,
navigation, disposal, and panel-content comparison with the pixel path.

For a repeatable browser run, build these outputs beneath one directory:

```sh
SITE=/tmp/verso-vir-site-acceptance
lake exe demo-slides --output "$SITE"
lake exe demo-slides --output "$SITE/nested/deck"
lake exe demo-slides --pixel-pretty --output "$SITE/pixel/deck"
(cd examples/default-deck && lake update && lake exe my-talk --output "$SITE/downstream/custom")
lake build test-pretty
.lake/build/bin/test-pretty
.lake/build/bin/test-pretty --host-abi-corpus > "$SITE/native-corpus.json"
uv run --project browser-tests pytest browser-tests/test_vir_prettym_site.py \
  --vir-site-acceptance --site-dir "$SITE" --browser=all -q
```

The downstream Lake workspace needs the same locally supplied ABI4 runtime
pack as the root workspace. The acceptance module is skipped by the ordinary
browser fixture suite unless `--vir-site-acceptance` is given.
