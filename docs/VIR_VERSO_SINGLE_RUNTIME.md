# Verso + Verso Slides single-runtime pilot

This follow-up composes one Lean contribution from normal Verso with
the Verso Slides `prettyM` contribution. It deliberately keeps the
application boundary explicit:

- `VersoSlides/VirPrettyM.lean` is the sole `virWebAssets` program root.
- The root owns wrappers for both `formatSegments` and
  `Verso.Search.ExperimentalVIR.rankCandidates` (exported as
  `rankSearchCandidates`).
- VIR generates one descriptor containing both dependency cones.
- `bootstrap.js` asks VIR's staged loader to create the runtime, then calls
  `runStartupEntries` and `dispose` once per page lifecycle.

The “One Runtime, Two Lean Packages” slide renders a visible ranking
produced by the Verso contribution. The proof-state panel later in the
deck renders through the Verso Slides contribution using the same
`window.versoVir` instance.

Run the acceptance path with:

```sh
lake exe demo-slides
python3 -m http.server 18341 --bind 127.0.0.1 --directory _slides
uv run --project browser-tests python scripts/smoke-vir-prettym-demo.py
```

The smoke verifies one manifest program, both package cones in its
descriptor, both visible calls, one create/startup sequence, disposal
during reload, and a second successful create/startup sequence after
reload.
