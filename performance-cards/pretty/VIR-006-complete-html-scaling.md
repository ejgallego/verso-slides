# VIR-006: resident input helps, while breadth dominates complete HTML scaling

- Audience: VIR, FIR, and Verso compiler/runtime owners
- Status: reproduced; shared Verso lookup fixed and refreshed into FIR
- Priority: adopt residency, then profile remaining runtime cost

## Forwardable summary

> On all 58 deck formats at widths 20/40/80, a package-resident VIR complete-
> HTML entry point reduced median input marshal from 1.265 to 0.115 ms and
> committed time from 5.180 to 4.005 ms; three fresh campaigns saved 22–25%,
> while execute remained about 3.6–3.7 ms. A separate 40-point scaling study
> found approximately linear plain-text growth through 16K characters, mild
> cost from tag depth alone, and the largest structural cost in annotation
> breadth and tag depth repeated across output chunks. FIR remains faster than
> VIR at every compiled endpoint, but its instance-lifetime arena reached
> 310–345 MiB after only 4.7K–5.3K heterogeneous stress calls. Follow-up found
> a shared O(chunks × annotations) Verso lookup; a compatible sorted-table fast
> path cuts the 256-annotation VIR execute time by 47–50% in interleaved tests.

## Resident complete-HTML boundary

The controlled VIR comparison differs only in how the static input reaches the
same renderer:

```text
VIR HTML:
  imported Format + imported annotations + columns -> escaped token HTML

VIR Resident HTML:
  package-resident Format/annotations ID + columns -> escaped token HTML
```

Both call `VersoSlides.Pretty.formatHtmlAt`/the same `prettyM` and HTML renderer,
return the same HTML schema, and commit through the same `innerHTML` endpoint.
Exact populated-DOM equality is checked for every case. Each campaign covers 58
formats × three widths × seven measured repetitions: 1,218 measured batches per
candidate after one warmup.

| Boundary | Marshal median | Execute median | Decode median | Commit median | Committed median |
| --- | ---: | ---: | ---: | ---: | ---: |
| Imported VIR HTML | 1.265 ms | 3.700 ms | 0.025 ms | 0.100 ms | 5.180 ms |
| Resident VIR HTML | 0.115 ms | 3.595 ms | 0.040 ms | 0.090 ms | 4.005 ms |

The three paired committed reductions were 24.9%, 22.5%, and 24.6%. Residency
therefore belongs in the product path for static deck data, but the unchanged
execute phase shows that it cannot explain or close the VIR/FIR execution gap.

## Controlled scaling evidence

The focused harness varies one dimension at a time at the same complete HTML →
populated DOM boundary. It uses one warmup, seven measured repetitions,
rotating backend order, adaptive batches targeting 15 ms, and a 128-KiB output
cap per batch. Every one of the 40 points passed exact DOM parity in three fresh
browsers. The table reports the median of the three campaign medians.

| Endpoint | JS execute / committed | FIR execute / committed | VIR execute / committed |
| --- | ---: | ---: | ---: |
| 16K plain text | 0.134 / 0.148 ms | 5.528 / 5.818 ms | 26.460 / 26.815 ms |
| 16K fully escaped text, 57,344-B HTML | 1.520 / 2.562 ms | 6.015 / 7.550 ms | 21.020 / 22.960 ms |
| 4K text in 256 chunks | 0.082 / 0.092 ms | 1.375 / 1.801 ms | 5.895 / 6.867 ms |
| 4K text in 256 annotated chunks | 0.266 / 0.480 ms | 11.848 / 13.570 ms | 28.520 / 32.350 ms |
| 4K text under 256 nested tags | 0.039 / 0.052 ms | 1.321 / 2.022 ms | 6.120 / 9.030 ms |
| 4K text, 64 tags repeated over 64 chunks | 0.121 / 0.248 ms | 3.043 / 5.792 ms | 12.585 / 22.505 ms |

Paired growth ratios make the mechanisms clearer:

| Dimension | JS execute | FIR execute | VIR execute | FIR committed | VIR committed |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1K → 16K plain text | 15.9× | 17.1× | 18.4× | 15.9× | 17.8× |
| 1 → 256 plain chunks | 2.8× | 1.3× | 1.1× | 1.6× | 1.3× |
| 1 → 256 annotated chunks | 9.5× | 12.2× | 6.3× | 13.4× | 6.9× |
| 0 → 256 nested tags | 1.1× | 1.2× | 1.1× | 1.7× | 1.5× |
| 0 → 64 tags across 64 chunks | 2.7× | 3.0× | 2.4× | 5.2× | 4.5× |

The plain-text result is compatible with linear growth over this range, not a
quadratic string-append failure. Fully escapable input expands output by 3.5×;
compiled-Lean execute changed by only 0.89–1.16× in VIR and 1.09–1.55× in FIR
across the paired campaigns. JavaScript execute and the common DOM commit react
more strongly to that expanded HTML. Escaping is not the next compiled-runtime
hotspot on this evidence.

Annotation breadth is different. At 256 annotated chunks, input marshal alone
is 1.193 ms FIR and 3.235 ms VIR, while execute rises to 11.848 and 28.520 ms.
At 64 tag levels repeated across 64 chunks, marshal reaches 2.213 ms FIR and
9.625 ms VIR. A resident entry can remove the imported-input portion, but the
remaining execute growth needs runtime/compiler attribution.

### Verso-side resolution

Source inspection found that `annotationSlotFor` reverse-scanned the complete
annotation array for every active tag on every emitted chunk. Generated tables
were already sorted, so the renderer now checks order once, uses upper-bound
binary search for sorted input, and preserves the old reverse-scan semantics
for unsorted input and duplicate tags. Two interleaved same-runtime campaigns
cut 256-annotation execute time by 46.8% and 49.6%, with 41.8–43.4% committed-
time reductions. Tables of 1–16 entries were unchanged within noise. See
[`VERSO-001`](VERSO-001-annotation-lookup.md) for the controlled comparison.

The historical three-backend tables above intentionally remain as the evidence
that selected the hotspot. FIR has since been rebuilt from the accepted source.
Two same-harness old/new pairs reduced its 256-annotation execute median by
79.8–86.3% and committed median by 70.1–79.6%; see
[`VERSO-001`](VERSO-001-annotation-lookup.md). Those targeted pairs supersede
the old FIR annotation row, not the other scaling dimensions.

## Timed-call and sampled attribution

VIR's existing `callTimed` boundary is sufficient to reject two broad
hypotheses. Its marshal phase covers JavaScript values lowered into runtime
objects plus the argument-pointer vector; execute is the
`vir_call_resolved_objects` call; decode lifts/releases the result. On both
focused endpoints, `hostMs` is zero and result decode is about 0.025 ms. The
gap is therefore neither semantic host callbacks nor HTML result export.

| Endpoint | VIR marshal | VIR execute | VIR decode | Pre-commit interpretation |
| --- | ---: | ---: | ---: | --- |
| 256 annotated chunks | 3.235 ms | 28.520 ms | 0.025 ms | About 90% execution |
| 64 tags × 64 chunks | 9.625 ms | 12.585 ms | 0.025 ms | About 43% import / 57% execution |

Diagnostic Chrome CPU samples were then collected over 40 repeated calls per
endpoint at a 100-µs sampling interval. Profiling inflated elapsed time, so
these percentages are attribution evidence only and do not replace the
diagnostics-off table above.

| Endpoint | VIR Wasm self | Adapter-JS self | GC self | Other/idle |
| --- | ---: | ---: | ---: | ---: |
| 256 annotated chunks | 75.8% | 14.4% | 3.4% | 6.5% |
| 64 tags × 64 chunks | 43.2% | 40.0% | 9.6% | 7.2% |

For the tag/chunk case, sampled adapter work includes `TextEncoder.encode`,
runtime constructor-field buffer creation, decimal natural conversion, custom
inductive validation/lowering, pointer-vector writes, and byte allocation. The
annotation case is much more strongly concentrated in Wasm.

The same internal Wasm function indices—96, 66, 58, and 2787—lead both
profiles. The exact release module exposes 84 exported function names but has
no internal function-name subsection, so those indices cannot be responsibly
mapped to VIR source from this artifact. The owner handoff requests a
digest-paired named profiling companion or function-index map:
[`PERFORMANCE_ATTRIBUTION.md`](../../handoffs/lean-vir-html-runtime/PERFORMANCE_ATTRIBUTION.md).

## FIR ownership evidence

The scaling harness deliberately limits batch output, but the accepted FIR
artifact still declares an `instance-lifetime-bump-arena`. Its three fresh
instances ended at 324,731,008, 361,651,136, and 361,487,744 bytes after 4,704,
5,120, and 5,296 heterogeneous calls. These are allocator high-water marks,
not live-heap measurements, but they reinforce that bounded reset, recreation,
or reclamation is required before a long-lived deployment.

## Requested follow-up

1. Use the resident complete-HTML entry point for static VIR deck formats.
2. Add the analogous package-resident FIR input boundary; compare execute and
   total without paying fresh graph encoding on every reflow.
3. Retain the completed FIR refresh as the source-level control.
4. Profile the remaining 256-annotation and 64-tag × 64-chunk cost inside the
   VIR repository using the patched source. Do not infer a compiler mechanism
   from browser timing alone.
5. Publish a bounded FIR arena lifecycle and rerun the stress suite against it.
6. Publish a symbolized VIR profiling companion or function-index map tied to
   the release Wasm digest; do not add more aggregate counters first.

## Caveats

- These are noisy browser elapsed timings, not Wasm instruction counts or a
  sampled native profile.
- FIR and VIR use different physical ABIs. Total time is a product-boundary
  comparison; execute is still not a pure compiler-only measurement.
- The synthetic cases isolate mechanisms seen in the representative renderer;
  the 58-format corpus remains the user-visible acceptance workload.
- Independent phase medians do not necessarily sum to the committed median.

## Reproduction and identity

Resident campaign (run three fresh commands, reversing candidate order in the
second):

```sh
python3 demos/vir-pretty/scripts/browser-backend-measure.py --build \
  --backend vir-html --backend vir-resident-html \
  --width 20 --width 40 --width 80 --warmups 1 --repetitions 7 \
  --code-points 256 \
  --output demos/vir-pretty/_profiles/results/vir-html-residency-20260822-1.json
```

Scaling campaign:

```sh
python3 demos/vir-pretty/scripts/browser-html-scaling-measure.py \
  --backend js-html --backend native-html --backend vir-html \
  --warmups 1 --repetitions 7 --target-batch-ms 15 \
  --maximum-batch-calls 128 --maximum-batch-output-bytes 131072 \
  --output demos/vir-pretty/_profiles/results/html-scaling-20260822-1.json
```

- Measured: 2026-08-22/23 UTC; host `capivara`; Chrome 151.0.7922.173
- Deck HEAD during measurement: `9840e90f27f672ef54bc309395570752de1ba67b`
- Lean host: 4.34.0-rc2; VIR/FIR artifact toolchains: Lean 4.33
- VIR source: `a7a54ce4ecea986bca899ec7ee6ebe5cd0781ffb`
- VIR Wasm: `000c0fe150c5a1a7ff8b66e11ff9b8388e4a260af665c039c500b4d94b0f10bc`
- FIR source: `c4051bff324b1d3c933463d295502109edd27e99`
- FIR Wasm: `78d38136fa6d8f9b236757b2e06820af8903c60622661a66f5219d52ae92a471`
- Scaling harness SHA-256: `635f0841cd92efa65944a82ba3d7aae96e1998b7bad6af5468bcd9800c151459`
- Scaling reports: `a95c1134…`, `7dfdab44…`, `c14df350…`
- Resident reports: `b8d693d0…`, `9a6843a9…`, `8d9a2059…`
- CPU-sample reports: `0273c671…` (annotations), `63491d6f…` (tag/chunks)
- Correctness: three resident campaigns × 1,218 batches/candidate and three
  scaling campaigns × 40 points × three backends; zero DOM failures/page errors
