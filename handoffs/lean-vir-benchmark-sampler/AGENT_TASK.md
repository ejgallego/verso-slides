# Task for the lean-vir agent

Work in the `lean-vir` repository, starting from commit
`a03cbcdcc9ea50961ec7ce6e0e0adfc7d702bdf3` or its current descendant.
Read and follow that repository's `AGENTS.md` and `CONTRIBUTING.md` first.

Upstream the smallest useful differential-sampling kernel described in this
handoff. Add a small repository-local JavaScript module and focused tests, then
migrate only the existing `branchAndSub` `resolveEachCall`/`cachedSlot`
benchmark pair to use it.

Required behavior:

- interleave the two candidates and rotate their order by measured round;
- exclude warm-up rounds from timing summaries;
- reject per-candidate checksum instability and cross-candidate checksum
  disagreement;
- preserve the current fixed inner iteration count and
  `lean-vir.bench.v1` row/sample shapes; and
- preserve compatibility with `bench:compare` and `bench:paired`.

Use `reference/differential-sampler.mjs` and its tests as behavioral guidance,
not as a mandatory API. Prefer names and structure natural to lean-vir. The
reference includes adaptive batching, but do not enable it for the first
upstream row because report comparisons require stable iteration counts.

Do not add the Verso UI, pretty/JSON corpora, artifact machinery, campaign
runner, memory probes, or a public plugin system. Do not broaden the report
schema in this patch.

Before handing back the branch, run the focused sampler test, `npm run bench`
with JSON output, and the smallest existing comparison/runtime checks affected
by the change. Report any intentional deviation from the acceptance criteria
in `README.md`.

