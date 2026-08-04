import assert from "node:assert/strict";
import test from "node:test";

import { runDifferentialSamples, summarizeValues } from "./differential-sampler.mjs";

function fakeClock() {
  let current = 0;
  return {
    now: () => current,
    advance: (milliseconds) => {
      current += milliseconds;
    },
  };
}

test("rotates candidates and excludes warm-up samples", async () => {
  const clock = fakeClock();
  const order = [];
  const result = await runDifferentialSamples({
    candidates: [{ id: "left" }, { id: "right" }],
    scenarios: [{ id: "same" }],
    warmup: 1,
    samples: 3,
    now: clock.now,
    yieldNow: async () => {},
    invoke: (_scenario, candidate) => {
      order.push(candidate.id);
      clock.advance(candidate.id === "left" ? 1 : 2);
      return { ok: true, value: 7 };
    },
  });

  assert.equal(result.passed, true);
  assert.deepEqual(order, [
    "left", "right",
    "left", "right",
    "right", "left",
    "left", "right",
  ]);
  assert.equal(result.candidateStates[0].samples.length, 3);
  assert.equal(result.candidateStates[1].samples.length, 3);
  assert.equal(result.candidateStates[0].invocations, 3);
  assert.equal(result.candidateStates[0].summary.totalMs.median, 1);
  assert.equal(result.candidateStates[1].summary.totalMs.median, 2);
});

test("reports stable disagreement and per-candidate instability", async () => {
  let unstableCalls = 0;
  const disagreement = await runDifferentialSamples({
    candidates: [{ id: "left" }, { id: "right" }],
    scenarios: [null],
    warmup: 0,
    samples: 2,
    yieldNow: async () => {},
    invoke: (_scenario, candidate) => ({
      ok: true,
      value: candidate.id,
      phases: { totalMs: 1 },
    }),
  });
  assert.equal(disagreement.passed, false);
  assert.equal(disagreement.scenarios[0].candidates.left.stable, true);
  assert.equal(disagreement.scenarios[0].candidates.right.stable, true);

  const unstable = await runDifferentialSamples({
    candidates: [{ id: "only" }],
    scenarios: [null],
    warmup: 0,
    samples: 2,
    yieldNow: async () => {},
    invoke: () => ({
      ok: true,
      value: unstableCalls++,
      phases: { totalMs: 1 },
    }),
  });
  assert.equal(unstable.passed, false);
  assert.equal(unstable.scenarios[0].candidates.only.stable, false);
});

test("bounds adaptive batches and retains per-invocation phase values", async () => {
  const clock = fakeClock();
  const result = await runDifferentialSamples({
    candidates: [{ id: "fast" }],
    scenarios: [null],
    warmup: 1,
    samples: 2,
    batchTargetMs: 10,
    maxBatchIterations: 4,
    now: clock.now,
    yieldNow: async () => {},
    invoke: () => {
      clock.advance(2);
      return { ok: true, value: 1, phases: { executeMs: 1.5, totalMs: 2 } };
    },
  });

  const candidate = result.scenarios[0].candidates.fast;
  assert.equal(candidate.batchIterations, 4);
  assert.equal(candidate.invocations, 8);
  assert.equal(candidate.samples[0].executeMs, 1.5);
  assert.equal(candidate.samples[0].totalMs, 2);
  assert.equal(candidate.samples[0].batchWallMs, 2);
});

test("a throwing or unavailable candidate cannot pass", async () => {
  const throwing = await runDifferentialSamples({
    candidates: [{ id: "broken" }],
    scenarios: [null],
    warmup: 0,
    samples: 1,
    yieldNow: async () => {},
    invoke: () => {
      throw new RangeError("synthetic overflow");
    },
  });
  assert.equal(throwing.passed, false);
  assert.deepEqual(
    throwing.scenarios[0].candidates.broken.errors,
    ["RangeError: synthetic overflow"],
  );

  const unavailable = await runDifferentialSamples({
    candidates: [
      { id: "ready" },
      { id: "missing", status: () => "unavailable" },
    ],
    scenarios: [null],
    warmup: 0,
    samples: 1,
    yieldNow: async () => {},
    invoke: () => ({ ok: true, value: 1, phases: { totalMs: 1 } }),
  });
  assert.equal(unavailable.passed, false);
  assert.equal(unavailable.candidateStates[1].samples.length, 0);
});

test("distribution summary uses an even median and nearest-rank p95", () => {
  assert.deepEqual(summarizeValues([4, 1, 3, 2]), {
    samples: 4,
    min: 1,
    median: 2.5,
    p95: 4,
    max: 4,
    mean: 2.5,
  });
});

