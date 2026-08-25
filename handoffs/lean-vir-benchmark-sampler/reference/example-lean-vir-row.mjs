import { runDifferentialSamples } from "./differential-sampler.mjs";

const innerIterations = 20_000;

function increment(value) {
    return value + 1;
}

function resolveIncrement() {
    return increment;
}

function runBatch(kind) {
    let checksum = 0;
    if (kind === "cachedSlot") {
        const cached = resolveIncrement();
        for (let index = 0; index < innerIterations; index += 1) {
            checksum = (checksum + cached(index)) >>> 0;
        }
    } else {
        for (let index = 0; index < innerIterations; index += 1) {
            checksum = (checksum + resolveIncrement()(index)) >>> 0;
        }
    }
    return checksum;
}

const sampled = await runDifferentialSamples({
    candidates: [
        { id: "resolveEachCall", label: "resolve+call" },
        { id: "cachedSlot", label: "cached slot" },
    ],
    scenarios: [{ id: "branchAndSub" }],
    warmup: 1,
    samples: 7,
    invoke: (_scenario, candidate) => ({ ok: true, value: runBatch(candidate.id) }),
});

if (!sampled.passed) throw new Error("reference candidates failed checksum parity");

const scenario = sampled.scenarios[0];
function sample(candidateId) {
    const candidate = scenario.candidates[candidateId];
    return {
        label: candidateId,
        iterations: innerIterations,
        checksum: candidate.value,
        medianMs: candidate.summary.totalMs.median,
        perCallMs: candidate.summary.totalMs.median / innerIterations,
    };
}

console.log(
    JSON.stringify(
        {
            name: "branchAndSub",
            title: `branchAndSub x ${innerIterations}`,
            resolveEachCall: sample("resolveEachCall"),
            cachedSlot: sample("cachedSlot"),
        },
        null,
        2,
    ),
);
