# PrettyM candidate on Lean 4.34

This candidate uses Lean `v4.34.0`, VIR [PR #207](https://github.com/ejgallego/lean-vir/pull/207)
at `970ad3d27b7daf82cd5bfe2e4d53251037cd7b87`, and the matching
Verso revision pinned in `lakefile.lean`. PR #207 is a draft stacked on
the ABI4 runtime work in PR #204. Its runtime lock is available-only:
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
`createProgram` with the two published manifests. Its `formatSegments` role
exports `Std.Format → Nat → Nat → Array Pretty.Segment` through VIR's direct
host call ABI. The earlier panel adapter converts its compact format tree to
the host ABI value and obtains a column width from DOM measurement. It passes
the result to the existing annotation/HTML stage. The extra JSON request and
response protocol has been removed. The generated slide's existing rich-format
metadata is still JSON and is parsed by the panel before this call.

`VersoSlides.Pretty.formatSegments` is the single Lean layout implementation;
`VersoSlides.VirPrettyM.formatSegments` is its exported wrapper. The legacy
JavaScript formatter remains available with `--pixel-pretty` or
`Config.virPrettyM := false` for comparison.

The old 4.34.0-rc2 branch `feat/reusable-deck-assets` retains the original
path-based build and custom-root evidence. This candidate carries its default
panel integration, asset handling, and managed `:slides` site facet forward.
Application-owned program composition needs a separate resource recipe and
carrier; the old `virSlidesMain` path override does not apply to #207.

## Current acceptance boundary

This is a source candidate. The earlier 4.35 embedded-resource demo and the
4.34.0-rc2 deck evidence remain separate qualifications. This candidate
requires a matching local ABI4 runtime pack. The direct host ABI call and the
default-panel width conversion need browser qualification on this exact pair.

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
navigation, disposal, and pixel-layout comparison.
