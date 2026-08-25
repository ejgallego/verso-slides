# Lean VIR differential benchmark sampler handoff

This bundle prepares the smallest reusable part of the Verso
pretty-printer benchmark for upstreaming to `lean-vir`. It is a
handoff aid, not code that must be copied verbatim.

## Decision

Upstream the sampling mechanism, not the demo benchmark product.

The useful common mechanism is:

- interleave candidates and rotate their order between measured
  rounds;
- exclude warm-up rounds from distributions;
- check that each candidate is stable across repeated calls;
- check semantic parity between candidates;
- retain per-phase samples and distribution summaries; and
- optionally choose a bounded batch size for operations too short to
  time individually.

VIR already owns a compact Node benchmark runner and the stable
`lean-vir.bench.v1` report schema. The first upstream patch should fit
this mechanism into that runner instead of importing the Verso browser
report, dashboard, or artifact orchestration.

## Recommended first patch

Target checkout at packaging time:

- repository: `lean-vir`
- commit: `a03cbcdcc9ea50961ec7ce6e0e0adfc7d702bdf3`
- Lean toolchain: `v4.32.0`

Implement one small module such as `scripts/bench-differential.mjs`
and a focused test. Migrate only the existing `branchAndSub`
comparison (`resolveEachCall` versus `cachedSlot`) as the first
consumer:

1. Keep its current inner iteration count and checksum calculation.
2. Run the two fixed-size candidate batches in interleaved rounds.
3. Exclude at least one warm-up round.
4. Require stable checksums within each candidate and equal checksums
   across the pair.
5. Map the resulting median elapsed time back to the existing sample
   objects.
6. Do not change `lean-vir.bench.v1`, `bench:compare`, or
   `bench:paired`.

This gives the sampler a real upstream consumer without converting the
whole benchmark file or changing historical report semantics.

The reference module in
[reference/differential-sampler.mjs](reference/differential-sampler.mjs)
also demonstrates adaptive batching. Leave that mode unused in the
first upstream consumer: VIR report comparison intentionally rejects
changed iteration counts, while adaptive batches may vary as
performance changes.

## Acceptance criteria

- Candidate execution order rotates between measured rounds.
- Warm-up results do not enter the reported distributions.
- A changing result from one candidate is reported as instability.
- Different stable results are reported as a parity failure.
- An unavailable or throwing candidate cannot produce a passing
  comparison.
- The migrated `branchAndSub` row retains its existing JSON shape,
  sample names, inner iteration count, and checksum.
- `npm run bench -- --json build/perf/current.json` produces a valid
  `lean-vir.bench.v1` report.
- `npm run bench:compare -- BEFORE AFTER` and `npm run bench:paired`
  require no compatibility changes.

## Explicit non-goals

Do not upstream these Verso-owned pieces in the first patch:

- the pretty-printer or JSON corpora;
- browser controls, plots, dashboards, or observation cards;
- native, LLVM, or Verso artifact adapters;
- cold-process, memory-frontier, or campaign orchestration;
- the Verso report schemas; or
- a public benchmark plugin/configuration framework.

The JSON round-trip consumer served only to demonstrate that the
sampler was not coupled to `Std.Format`. Its ABI trade-off study is
complete and it should not become a VIR benchmark requirement.

## Provenance and source map

The behavior was developed in the Verso branch at
`26b3643e96298ddde8e8d515baa431a70fd38269`:

| Behavior                     | Verso source                                             |
| ---------------------------- | -------------------------------------------------------- |
| Generic loop                 | `web-lib/panel/pretty.js`, `runDifferentialSamples`      |
| Pretty consumer              | `web-lib/panel/pretty.js`, `runPrettyDifferentialCorpus` |
| Non-pretty proof             | `web-lib/panel/pretty.js`, `runJsonRoundTripStudy`       |
| Contract tests               | `browser-tests/test_pretty_vir.py`                       |
| Existing VIR report contract | `lean-vir/scripts/bench-utils.mjs` and `bench-vir.mjs`   |

The relevant Verso commits are:

- `f952214` — characterize the report contract;
- `0df8639` — extract the differential sampler;
- `db45f27` — add the second, non-pretty consumer; and
- `26b3643` — retain the control in generated reports.

## Reference validation

The reference has no dependencies beyond Node:

```console
node --test handoffs/lean-vir-benchmark-sampler/reference/differential-sampler.test.mjs
node handoffs/lean-vir-benchmark-sampler/reference/example-lean-vir-row.mjs
```

The example emits one `lean-vir.bench.v1`-compatible benchmark row. It
is a shape demonstration only; it does not execute VIR.
