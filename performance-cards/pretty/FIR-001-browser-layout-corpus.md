# FIR-001: browser layout corpus is fast; arena lifetime remains the ownership tradeoff

- Audience: FIR Wasm compiler/artifact and browser-adapter owners
- Status: reproducible local browser campaign
- Priority: use as the control for flat, resident, and broader FIR artifacts

## Forwardable summary

> Across all 58 deck formats at widths 20/40/80, the FIR PrettyTrace artifact produced exact populated-DOM parity with JavaScript in three campaigns. At a minimum 256 source code points per timed batch, FIR's median campaign measured 0.260 ms execute and 0.880 ms input-to-committed-DOM, versus VIR's 0.855 ms and 1.695 ms. FIR marshal (0.215 ms) plus PrettyTrace decode (0.265 ms) costs more than its execute phase, so flat/resident or broader output artifacts remain the useful next comparison. The documented instance-lifetime bump arena grew from byte 1,024 to 277,828,872 across 51,360 render calls; the harness starts a fresh adapter per command and reports the frontier explicitly.

## Controlled boundary

All candidates receive the same compact Format source, annotations, integer
column budget, format order, widths, source-volume floor, and final DOM
materializer. The backend order rotates by case/repetition. This is the layout
surface only:

```text
compact browser Format × columns
  -> backend layout/styled output
  -> common annotation resolution + HTML materialization + DOM commit
```

FIR uses the packaged `fir.prettyM.browser/v1` adapter and PrettyTrace result.
VIR uses direct typed `Std.Format` input and tagged-segment output. These input
and output ABIs differ, so the cross-runtime figures are an end-to-end overview;
the FIR internal phases remain individually visible.

## Evidence

Protocol per campaign: 58 generated formats × widths 20/40/80 × seven measured
repetitions, one warmup, and enough identical passes per case to reach at least
256 compact-source code points. This yields 1,218 measured batches and 51,360
actual render calls per backend. Three campaigns passed with no DOM differences;
the table reports the median campaign.

| Backend | Execute median / p90 | Marshal median | Decode median | Committed median / p90 |
| --- | ---: | ---: | ---: | ---: |
| JavaScript | 0.035 / 0.070 ms | 0.005 ms | 0 | 0.135 / 0.320 ms |
| VIR typed Format | 0.855 / 1.655 ms | 0.560 ms | 0.085 ms | 1.695 / 3.405 ms |
| FIR PrettyTrace | 0.260 / 0.495 ms | 0.215 ms | 0.265 ms | 0.880 / 1.760 ms |
| LLVM/Emscripten | 0.570 / 1.155 ms | 0.235 ms | 0.080 ms | 1.035 / 2.175 ms |

FIR execute is 3.3× faster than VIR and 2.2× faster than LLVM in this campaign;
its committed boundary is 1.9× faster than VIR and 1.2× faster than LLVM.
JavaScript remains substantially faster for this small formatter surface.

## Ownership observation

The first FIR call reports `frontierBefore = 1024`; after 51,360 calls the last
decode reports `frontierAfterDecode = 277828872` and 4,240 Wasm pages. Average
arena growth is about 5.4 KB per render. This matches the artifact's declared
`instance-lifetime-bump-arena` reclamation policy: it is not evidence that the
adapter failed to invoke an available reset operation.

This policy is acceptable for bounded short-lived runs but material for an
interactive long-lived deck. The measurement command starts a fresh browser and
adapter, so repeated campaigns reclaim the arena by discarding the instance.

## Requested follow-up

1. Keep this PrettyTrace artifact as the baseline control.
2. Publish the planned flat/resident artifact through the same package envelope;
   rerun with `--backend fir-all` to isolate output decoding and input residency.
3. For a long-lived deployment artifact, provide either bounded reclamation or
   an explicit reset/recreate policy that preserves persistent runtime state.
4. Preserve the current internal timing and frontier fields; they make adapter,
   compiler execution, output decode, and ownership costs separately actionable.

## Reproduction

```sh
cd demos/vir-pretty
python3 scripts/browser-backend-measure.py --build \
  --backend js --backend vir --backend fir --backend llvm \
  --code-points 256 --repetitions 7 \
  --output _profiles/results/backend-current.json
```

Use `--backend fir` for the primary FIR layout artifact or `--backend fir-all`
for every staged FIR variant. The command runs its own isolated local server.

## Measurement context

- Measured: 2026-08-10
- Host/deck Lean: `leanprover/lean4:v4.33.0-rc2`
- FIR artifact Lean layout: 4.32.0
- FIR source: `d4422df7cff3907bcf60bbd83316f69135f47f38`
- FIR Wasm: `c928d30adb3d39f7409e7091b4e1f13289aac35c02b34d761062c8a8f3e74b60` (117,389 bytes)
- Browser: Google Chrome 150.0.7871.114, headless
- Correctness: 3 × 1,218 measured batches per backend, zero populated-DOM failures
