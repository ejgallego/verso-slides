# FIR-002: complete HTML is faster than VIR, with residency still open

- Audience: FIR, VIR, and Verso browser-runtime owners
- Status: historical representative campaign; targeted refreshed-artifact A/B complete
- Priority: retain as the complete-rendering control; address arena lifetime before long-lived deployment

## Forwardable summary

> Across three fresh-browser campaigns covering all 58 deck formats at widths
> 20/40/80, JavaScript, FIR Wasm, and VIR produced exact populated-DOM parity.
> The median campaign measured 0.110/0.210 ms execute/committed for JavaScript,
> 0.880/1.625 ms for FIR, and 3.310/4.840 ms for VIR. At this complete HTML
> boundary FIR is 3.8× faster than VIR in execute and 3.0× faster through DOM
> commit, while JavaScript remains 7.7× faster than FIR end-to-end. FIR input
> marshaling is still 0.535 ms median, and its instance-lifetime arena reaches
> about 375 MiB after the harness's 51,360 calls. The useful FIR follow-ups are
> resident input and bounded reclamation, not more HTML-boundary adaptation.

The table below intentionally preserves the representative 2026-08-22
campaign and its old artifact provenance. The 2026-08-24 refresh compiled the
accepted annotation lookup into FIR Wasm
`81b7bf1b6a62ecdd6723c24600020058ab6c578d47e9d9bcb61d6517a1c48d45`.
Two same-harness old/new pairs reduced the synthetic 256-annotation execute
median by 79.8–86.3%; see [`VERSO-001`](VERSO-001-annotation-lookup.md). Do not
use the old annotation endpoint below as current FIR behavior.

## Controlled boundary

Every candidate receives the same compact `Std.Format`, annotations, integer
column budget, format order, and minimum source volume. Each candidate owns
the complete semantic rendering endpoint:

```text
compact browser Format + annotations + columns
  -> prettyM + annotation resolution + escaping + token-span HTML
  -> common innerHTML commit
```

Backend order rotates by case and repetition. The harness constructs the
JavaScript result first only as the correctness oracle; timed candidate order
remains interleaved. Exact final `innerHTML` equality is checked before a
sample is accepted.

The semantic output boundary is equal, but the input transports and runtimes
are not: JavaScript consumes the compact tree directly, FIR's adapter encodes
fresh Lean graphs, and VIR imports typed Lean values into its shared runtime.
The table is therefore an end-to-end implementation comparison, not a causal
compiler-only result.

## Evidence

Protocol per campaign: 58 generated formats × widths 20/40/80 × seven measured
repetitions, one warmup, and enough identical passes per case to reach at least
256 compact-source code points. This yields 1,218 measured batches and 51,360
render calls per backend. Three campaigns passed with no DOM differences or
page errors. The table reports the median of the three campaign medians and
p90s.

| Backend | Execute median / p90 | Marshal median | Decode median | Commit median | Committed median / p90 |
| --- | ---: | ---: | ---: | ---: | ---: |
| JavaScript HTML | 0.110 / 0.210 ms | 0.010 ms | 0 | 0.080 ms | 0.210 / 0.600 ms |
| FIR Wasm HTML | 0.880 / 1.565 ms | 0.535 ms | 0.025 ms | 0.080 ms | 1.625 / 3.285 ms |
| VIR HTML | 3.310 / 5.705 ms | 1.260 ms | 0.025 ms | 0.090 ms | 4.840 / 9.105 ms |

The independent phase medians do not add exactly: each percentile is selected
from a different distribution. They do show that the common DOM commit is
small and similar, while compiler execution and input transfer explain most
of the compiled-backend gap.

Cold construction remains noisy and is not included in committed time. Median
fresh-context startup was 233 ms for the complete FIR bridge and 397 ms for
VIR. These figures are diagnostic only; deployment should share and cache the
runtime rather than repeatedly instantiate it.

## Ownership observation

FIR starts at frontier 1,024 and ends at 393,180,800 after 51,360 calls, with
6,000 Wasm pages committed. That is roughly 7.7 KB of arena growth per render
and a 375-MiB high-water mark. It agrees with the package's declared
`instance-lifetime-bump-arena` policy and is not evidence of a missing adapter
reset. Each campaign discards its fresh browser and Wasm instance.

This stress protocol intentionally repeats small formats to obtain reliable
timings. A normal slide interaction makes far fewer calls, but an unbounded
long-lived application still needs an explicit reset, recreate, or reclamation
policy.

## Requested follow-up

1. Keep this complete HTML artifact as the FIR/VIR semantic-output control.
2. Add a package-resident FIR input entrypoint so the same static format is not
   re-encoded on every reflow.
3. Publish a bounded reclamation or adapter-recreation policy for long-lived
   browser use.
4. Use the completed output-length/escaping/annotation scaling campaign in
   [`VIR-006`](VIR-006-complete-html-scaling.md) to select focused profiles.
   The compatible lookup refresh is complete and its paired control is in
   [`VERSO-001`](VERSO-001-annotation-lookup.md).
5. Do not compare these values directly with the retired Lean 4.32 campaign;
   JavaScript, VIR, the browser, and host conditions also changed.

## Reproduction

Run three fresh commands, changing the output suffix from `1` through `3`:

```sh
cd demos/vir-pretty
python3 scripts/browser-backend-measure.py --build \
  --backend js-html --backend vir-html --backend native-html \
  --width 20 --width 40 --width 80 --warmups 1 --repetitions 7 \
  --code-points 256 \
  --output _profiles/results/fir-html-three-way-20260822-1.json
```

Only the first command needs `--build`; subsequent commands reuse the same lab
assembly while creating a fresh browser and adapter.

## Measurement context

- Measured: 2026-08-22
- Host/deck: `8121ad5aa22e9023a2d8bc644c0c37773885a995`, Lean 4.34.0-rc2
- FIR package: Lean 4.33.0; FIR `c4051bff324b1d3c933463d295502109edd27e99`;
  Verso source `eb8d2b8fcf145810996ad388d701e9337cfe1ceb`
- FIR Wasm: `78d38136fa6d8f9b236757b2e06820af8903c60622661a66f5219d52ae92a471`
  (145,219 bytes)
- VIR: `a7a54ce4ecea986bca899ec7ee6ebe5cd0781ffb`, Lean 4.33.0
- VIR Wasm: `000c0fe150c5a1a7ff8b66e11ff9b8388e4a260af665c039c500b4d94b0f10bc`
  (740,901 bytes)
- VIR IR package: `48ab114d3406903f035426e27dbfae3cfe8de7fea2169e990bf9df167f9c7b0b`
  (1,113,302 bytes)
- Browser: Google Chrome 151.0.7922.173, headless
- Raw report SHA-256: `29ee62be…`, `2ca2d851…`, `d4493679…`
- Correctness: 3 × 1,218 measured batches per backend, zero populated-DOM
  failures and zero page errors
