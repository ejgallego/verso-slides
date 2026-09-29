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
`createProgram` with the two published manifests. The panel calls the
`prettyM` role with the strict `String → String` JSON wrapper. The wrapper
uses `Std.Format.prettyM` at a column width obtained from the earlier panel
adapter's DOM measurement. JavaScript still owns measurement, annotations,
and HTML. The wrapper bounds input, nesting, node count, columns, and the
serialized response. The legacy JavaScript formatter remains available with
`--pixel-pretty` or `Config.virPrettyM := false` for comparison.

The old 4.34.0-rc2 branch `feat/reusable-deck-assets` retains the original
path-based build and custom-root evidence. This candidate carries its default
panel integration, asset handling, and managed `:slides` site facet forward.
Application-owned program composition needs a separate resource recipe and
carrier; the old `virSlidesMain` path override does not apply to #207.

## Current acceptance boundary

This is a source candidate. The earlier 4.35 embedded-resource demo and the
4.34.0-rc2 deck evidence remain separate qualifications. This candidate
requires a matching local ABI4 runtime pack before its browser behavior can
be accepted. A default-panel switch also needs an explicit comparison of the
column conversion against the pixel formatter across real panel widths.

With the exact local ABI4 pack seeded in VIR's cache, `lake build
VersoSlidesVirPrettyM`, `lake build VersoSlides`, and `lake build demo-slides`
completed on this pin. Site generation and browser behavior have not yet been
qualified for this candidate.
