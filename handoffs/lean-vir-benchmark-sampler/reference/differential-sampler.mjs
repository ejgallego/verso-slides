import { performance } from "node:perf_hooks";

function requireCount(value, label, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${label} must be an integer >= ${minimum}`);
  }
  return value;
}

function requireFinite(value, label, minimum) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new TypeError(`${label} must be finite and >= ${minimum}`);
  }
  return value;
}

export function summarizeValues(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((left, right) => left - right);
  if (sorted.length === 0) {
    return { samples: 0, min: 0, median: 0, p95: 0, max: 0, mean: 0 };
  }
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return {
    samples: sorted.length,
    min: sorted[0],
    median,
    p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)],
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

function normalizePhases(phases, wallMs) {
  const result = {};
  if (phases !== undefined) {
    if (phases === null || typeof phases !== "object" || Array.isArray(phases)) {
      throw new TypeError("observation phases must be an object");
    }
    for (const [name, value] of Object.entries(phases)) {
      if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`observation phase ${name} must be finite and nonnegative`);
      }
      result[name] = value;
    }
  }
  if (result.totalMs === undefined) result.totalMs = wallMs;
  return result;
}

function addPhases(target, source) {
  for (const [name, value] of Object.entries(source)) {
    target[name] = (target[name] ?? 0) + value;
  }
}

function averagePhases(phases, iterations, batchWallMs) {
  const result = Object.fromEntries(
    Object.entries(phases).map(([name, value]) => [name, value / iterations]),
  );
  result.batchIterations = iterations;
  result.batchWallMs = batchWallMs / iterations;
  return result;
}

export function summarizePhases(samples) {
  const names = [...new Set(samples.flatMap((sample) => Object.keys(sample)))];
  return Object.fromEntries(names.map((name) => [
    name,
    summarizeValues(samples.map((sample) => sample[name])),
  ]));
}

function defaultYield() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Run schema-neutral differential samples.
 *
 * `invoke` may be synchronous or asynchronous and returns
 * `{ ok, value, phases?, error? }`. Candidates are interleaved within each
 * round. Warm-ups affect stability/parity checks but not timing summaries.
 */
export async function runDifferentialSamples(options) {
  if (options === null || typeof options !== "object") {
    throw new TypeError("differential sampler options are required");
  }
  if (!Array.isArray(options.candidates) || options.candidates.length === 0) {
    throw new TypeError("differential sampler requires candidates");
  }
  if (!Array.isArray(options.scenarios) || options.scenarios.length === 0) {
    throw new TypeError("differential sampler requires scenarios");
  }
  if (typeof options.invoke !== "function") {
    throw new TypeError("differential sampler requires invoke");
  }

  const warmup = requireCount(options.warmup ?? 1, "warmup", 0);
  const samples = requireCount(options.samples ?? 7, "samples", 1);
  const batchTargetMs = requireFinite(options.batchTargetMs ?? 0, "batchTargetMs", 0);
  const maxBatchIterations = requireCount(
    options.maxBatchIterations ?? 512,
    "maxBatchIterations",
    1,
  );
  const now = options.now ?? (() => performance.now());
  const yieldNow = options.yieldNow ?? defaultYield;
  const canonicalize = options.canonicalize ?? ((value) => value);
  const signatureOf = options.signatureOf ?? ((value) => JSON.stringify(value));
  const measureOutput = options.measureOutput ?? (() => null);

  const ids = new Set();
  const candidateStates = options.candidates.map((candidate) => {
    if (candidate === null || typeof candidate !== "object" ||
        typeof candidate.id !== "string" || candidate.id === "") {
      throw new TypeError("every differential candidate requires a nonempty id");
    }
    if (ids.has(candidate.id)) throw new TypeError(`duplicate candidate id ${candidate.id}`);
    ids.add(candidate.id);
    const status = typeof candidate.status === "function" ? candidate.status() : "ready";
    return {
      id: candidate.id,
      label: candidate.label ?? candidate.id,
      status,
      invocations: 0,
      samples: [],
      summary: {},
    };
  });
  const readyCandidates = options.candidates.filter(
    (_candidate, index) => candidateStates[index].status === "ready",
  );
  const reports = [];

  for (let scenarioIndex = 0; scenarioIndex < options.scenarios.length; scenarioIndex += 1) {
    const scenario = options.scenarios[scenarioIndex];
    const context = options.prepareScenario
      ? await options.prepareScenario(scenario, scenarioIndex)
      : null;
    const results = Object.fromEntries(readyCandidates.map((candidate) => [candidate.id, {
      value: null,
      signature: null,
      metrics: null,
      stable: true,
      errors: [],
      samples: [],
      batchIterations: 1,
      invocations: 0,
      summary: {},
    }]));

    async function invokeOnce(candidate) {
      const started = now();
      try {
        const observation = await options.invoke(scenario, candidate, context);
        const wallMs = Math.max(0, now() - started);
        if (observation === null || typeof observation !== "object") {
          throw new TypeError("invoke must return an observation object");
        }
        if (!observation.ok) {
          return {
            ok: false,
            error: observation.error ?? "candidate returned an unsuccessful observation",
            phases: normalizePhases(observation.phases, wallMs),
          };
        }
        return {
          ok: true,
          value: observation.value,
          phases: normalizePhases(observation.phases, wallMs),
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          phases: { totalMs: Math.max(0, now() - started) },
        };
      }
    }

    function observe(result, observation) {
      if (!observation.ok) {
        result.stable = false;
        if (!result.errors.includes(observation.error)) result.errors.push(observation.error);
        return false;
      }
      const value = canonicalize(observation.value);
      const signature = signatureOf(value);
      if (result.signature !== null && result.signature !== signature) result.stable = false;
      result.value = value;
      result.signature = signature;
      result.metrics = measureOutput(value);
      return true;
    }

    if (batchTargetMs > 0) {
      for (const candidate of readyCandidates) {
        const observation = await invokeOnce(candidate);
        observe(results[candidate.id], observation);
        const observedMs = Math.max(0.01, observation.phases.totalMs ?? 0);
        results[candidate.id].batchIterations = Math.max(
          1,
          Math.min(maxBatchIterations, Math.ceil(batchTargetMs / observedMs)),
        );
      }
    }

    for (let round = -warmup; round < samples; round += 1) {
      for (let offset = 0; offset < readyCandidates.length; offset += 1) {
        const candidate = readyCandidates[(offset + Math.max(0, round)) % readyCandidates.length];
        const result = results[candidate.id];
        const summedPhases = {};
        let measuredIterations = 0;
        const batchStarted = now();
        for (let iteration = 0; iteration < result.batchIterations; iteration += 1) {
          const observation = await invokeOnce(candidate);
          if (!observe(result, observation)) continue;
          addPhases(summedPhases, observation.phases);
          measuredIterations += 1;
        }
        const batchWallMs = Math.max(0, now() - batchStarted);
        if (round >= 0) {
          const averaged = averagePhases(
            summedPhases,
            Math.max(1, measuredIterations),
            batchWallMs,
          );
          result.samples.push(averaged);
          result.invocations += result.batchIterations;
          const state = candidateStates.find((item) => item.id === candidate.id);
          state.samples.push(averaged);
          state.invocations += result.batchIterations;
        }
      }
    }

    for (const result of Object.values(results)) result.summary = summarizePhases(result.samples);
    const signatures = Object.values(results)
      .map((result) => result.signature)
      .filter((signature) => signature !== null);
    const parity = readyCandidates.length === options.candidates.length &&
      signatures.length === options.candidates.length &&
      signatures.every((signature) => signature === signatures[0]) &&
      Object.values(results).every((result) => result.stable);
    reports.push({
      index: scenarioIndex,
      scenario,
      parity,
      output: readyCandidates.length === 0 ? null : results[readyCandidates[0].id].metrics,
      candidates: results,
    });
    if (typeof options.onScenario === "function") options.onScenario(reports.at(-1));
    if (typeof options.onProgress === "function") {
      options.onProgress({ completed: scenarioIndex + 1, total: options.scenarios.length });
    }
    await yieldNow();
  }

  for (const state of candidateStates) state.summary = summarizePhases(state.samples);
  return {
    passed: reports.every((report) => report.parity),
    candidateStates,
    scenarios: reports,
  };
}

