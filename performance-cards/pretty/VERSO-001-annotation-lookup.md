# VERSO-001: sorted annotation lookup removes the renderer's quadratic case

- Audience: Verso, FIR artifact, and VIR runtime owners
- Status: implemented, rebuilt in FIR, and parity-checked in the browser
- Priority: retain the source fix; profile the remaining compiled-runtime cost

## Forwardable summary

> `VersoSlides.Pretty.formatHtml` reverse-scanned the complete annotation table
> for every active tag on every emitted chunk. With 256 independently tagged
> chunks and 256 annotations, this performed about 32K table probes. Generated
> browser tables were already sorted. A compatible implementation now checks
> order once, uses upper-bound binary search for sorted tables, and falls back
> to the old reverse scan for unsorted input. Two interleaved browser campaigns
> reduced VIR execute time by 46.8% and 49.6%, and committed time by 43.4% and
> 41.8%. Tables of 1–16 entries were unchanged within noise. The VIR package
> grew by 43 bytes and five declarations. The rebuilt FIR artifact then reduced
> the same endpoint by 79.8–86.3% in two same-harness old/new browser pairs,
> confirming that most of FIR's former curve was the shared Lean algorithm.

## Root cause and fix

The old lookup searched backward through every `TaggedAnnotation` until it
found a matching tag. `innermostAnnotationSlot` repeated that search for each
active tag, and `prettyM` called it for every output chunk. The broad synthetic
case has one distinct annotation per chunk, so average lookup length grows with
the number of chunks: O(chunks × annotations).

The accepted source change keeps the public semantics:

- one O(annotation-count) prepass detects ascending tag order;
- sorted tables use upper-bound binary search, including the old "last
  duplicate wins" behavior;
- unsorted tables retain the old reverse linear scan; and
- a nested-tag fast path preserves the common case where the innermost active
  tag is the final sorted annotation.

The browser and generated registry already sort annotation IDs numerically.
No ABI or result-schema change is required.

## Controlled evidence

The focused harness adds a diagnostic `vir-html-linear-control` candidate. It
runs in the same browser and VIR runtime, receives the same tag-to-style pairs,
and reverses only their table order to force the compatible linear fallback.
Candidate order rotates by repetition and was reversed in the second fresh
campaign. Each cell uses two warmups and 15 measured repetitions. Exact
populated-DOM equality is required for every sample.

| Case | Sorted execute | Linear control execute | Reduction | Sorted committed | Linear control committed | Reduction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 256 annotated chunks, campaign 1 | 17.960 ms | 35.600 ms | 49.6% | 22.975 ms | 39.500 ms | 41.8% |
| 256 annotated chunks, campaign 2 | 15.785 ms | 29.685 ms | 46.8% | 19.165 ms | 33.850 ms | 43.4% |

At 1, 4, and 16 annotations, execute medians differed by at most 0.05 ms in
either direction. The 64-entry point benefited in both campaigns, but is more
noise-sensitive. A complete 58-format × three-width acceptance campaign also
passed 1,218 measured batches with zero DOM failures or page errors.

The generated lab package changed from 2,104 to 2,109 declarations and from
1,114,878 to 1,114,921 bytes. Interface exports remained 11.

A pre-refresh same-browser three-way snapshot measured 0.262 ms JavaScript,
12.290 ms old-source FIR, and 16.030 ms patched VIR execute time on the
256-annotation case. It was useful for requesting the rebuild, but is no longer
the current FIR comparison.

## FIR rebuild result

W7 rebuilt the accepted zero-import HTML package from this exact source. Two
concurrent paired campaigns used otherwise identical lab profiles and changed
only the staged FIR Wasm package:

| Pair | Old-source FIR execute | Refreshed FIR execute | Reduction | Old committed | Refreshed committed | Reduction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 25.505 ms | 3.485 ms | 86.3% | 30.710 ms | 6.255 ms | 79.6% |
| B | 25.530 ms | 5.155 ms | 79.8% | 31.960 ms | 9.550 ms | 70.1% |

Every sample produced exact populated-DOM parity. Absolute elapsed values vary
with browser and machine load, but the paired direction and magnitude are
stable. This closes the source-provenance question: the remaining FIR/VIR gap
must be measured from the refreshed package rather than attributed to the old
quadratic lookup.

## Post-fix attribution

A diagnostic 100-µs Chrome CPU profile over 61 calls to the optimized
256-annotation case attributed 71.3% of samples to Wasm, 17.7% to adapter
JavaScript, 2.6% to GC, and 8.3% to program/idle. The same unnamed Wasm
functions remain prominent. This profile identifies where the remaining time
executes; its profiler-inflated elapsed timing is not an acceptance number.

The source-level win therefore narrows but does not replace the VIR request for
a digest-paired symbolized profiling companion. Any owner-side runtime profile
should use the patched source so it does not optimize around a Verso-owned
quadratic workload.

## Requested follow-up

1. Review and retain the compatible sorted-table fast path in Verso Slides.
2. Keep the refreshed FIR package and its old/new paired control as the
   accepted source-level evidence.
3. Use the patched VIR package and symbolized samples
   for the remaining runtime cost.
4. Keep the unsorted and duplicate-tag tests: optimization must not silently
   narrow the public input contract.

## Reproduction and identity

```sh
python3 demos/vir-pretty/scripts/browser-html-scaling-measure.py \
  --vir-linear-lookup-control \
  --backend vir-html --backend vir-html-linear-control \
  --case annotations-1 --case annotations-4 --case annotations-16 \
  --case annotations-64 --case annotations-256 --case tag-chunks-64-64 \
  --warmups 2 --repetitions 15 \
  --output demos/vir-pretty/_profiles/results/annotation-lookup-final.json
```

- Measured: 2026-08-22; host `capivara`; Chrome 151.0.7922.173
- VIR runtime source: `a7a54ce4ecea986bca899ec7ee6ebe5cd0781ffb`
- VIR runtime Wasm: `000c0fe150c5a1a7ff8b66e11ff9b8388e4a260af665c039c500b4d94b0f10bc`
- Measured IR package: `1cfeecc192b664190246aeb6a61fcd4fd986a8b861702c2483606e9471a36a92`
- Current rebuilt IR package: `4f57ac14e6a46255c4a8aa89acddc764c5f281d7d4ec709b52b8c36eb35e8627`
- Interleaved reports: `54846aa4…`, `444cb8c4…`
- Post-fix three-way report: `b52b69ff…`
- Post-fix CPU report: `97d140ce…`
- Correctness: 25 Lean tests plus all focused and representative browser parity checks passed
- FIR refresh measured: 2026-08-24; same host and browser family
- Refreshed FIR source: `c88e4a543fb2553ab07a3419b1ce038e1519f083`
- Refreshed FIR Wasm: `81b7bf1b6a62ecdd6723c24600020058ab6c578d47e9d9bcb61d6517a1c48d45`
  (155,103 bytes), Verso source `970b071b73adc6e68c6de00bc183460f76d97731`
- Paired old/new reports: `4f4eb0ea…`/`0a00d73a…` and
  `12664f6b…`/`c60ba9cd…`

## Caveats

- Reversing the table is a controlled way to select the compatibility path,
  not a byte-for-byte build of the old source. It pays the new sortedness
  prepass and changes which linear lookups are best-case. The 256-independent-
  annotation case remains the valid headline because it exercises the average
  full-table scan that caused the observed curve.
- Browser elapsed timings remain noisy. The two candidates are interleaved in
  one runtime specifically to control that noise.
- The paired FIR campaigns run in separate fresh browser processes under
  concurrent machine load. Their relative result is stronger evidence than
  comparing their absolute times with an older campaign, but it is still a
  browser elapsed-time observation rather than an instruction count.
