import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [leanVirArg, packageArg] = process.argv.slice(2);
if (leanVirArg === undefined || packageArg === undefined) {
    throw new Error("usage: test-vir-reveal-policy.mjs LEAN_VIR_DIR POLICY_IRPKG");
}

const leanVirDir = resolve(leanVirArg);
const packagePath = resolve(packageArg);
const runtimeModule = await import(
    pathToFileURL(resolve(leanVirDir, "web/src/vir-runtime-node.js")).href
);
const wasmBytes = await readFile(resolve(leanVirDir, "web/public/vir-upstream.wasm"));
const packageBytes = await readFile(packagePath);
const runtime = await runtimeModule.createVirRuntime({
    wasmBytes,
    irPackageSetBytes: [packageBytes],
});

const step = (frame, pause = false, loop = false) => ({ frame, pause, loop });
const policy = {
    totalFrames: 60,
    steps: [
        step(0, true),
        step(10),
        step(20, true),
        step(30, false, true),
        step(40, true, true),
        step(50, true),
    ],
    pauseSteps: [step(0, true), step(20, true), step(40, true, true), step(50, true)],
    autoplay: false,
};

function normalizeCommand(command) {
    if (command.kind === "seek" || command.kind === "loopAt") {
        return { ...command, value: Number(command.value) };
    }
    if (command.kind === "playTo") {
        return {
            ...command,
            fields: { ...command.fields, frame: Number(command.fields.frame) },
        };
    }
    return command;
}

function plan(selectedPolicy, event) {
    return runtime
        .call("VersoSlides.RevealPolicy.Policy.plan", selectedPolicy, event)
        .map(normalizeCommand);
}

assert.deepEqual(plan(policy, { kind: "fragmentShown", value: 0 }), [
    { kind: "playTo", fields: { frame: 19, loopAfter: false } },
]);
assert.deepEqual(plan(policy, { kind: "fragmentShown", value: 1 }), [
    { kind: "playTo", fields: { frame: 39, loopAfter: true } },
]);
assert.deepEqual(plan(policy, { kind: "fragmentShown", value: 2 }), [
    { kind: "playTo", fields: { frame: 40, loopAfter: true } },
]);
assert.deepEqual(plan(policy, { kind: "fragmentHidden", value: 0 }), [
    { kind: "playTo", fields: { frame: 0, loopAfter: false } },
]);
assert.deepEqual(plan(policy, { kind: "fragmentHidden", value: 3 }), [
    { kind: "loopAt", value: 40 },
]);
assert.deepEqual(plan(policy, { kind: "slideEntered", value: 2 }), [{ kind: "seek", value: 39 }]);
assert.deepEqual(plan(policy, { kind: "slideEntered", value: 3 }), [{ kind: "loopAt", value: 40 }]);
assert.deepEqual(plan(policy, { kind: "slideEntered", value: 99 }), [{ kind: "seek", value: 59 }]);
assert.deepEqual(plan(policy, { kind: "slideLeft" }), [{ kind: "pause" }]);

const autoplayPolicy = {
    totalFrames: 40,
    steps: [step(0), step(10, true), step(20)],
    pauseSteps: [step(10, true)],
    autoplay: true,
};
assert.deepEqual(plan(autoplayPolicy, { kind: "slideEntered", value: 0 }), [
    { kind: "seek", value: 0 },
    { kind: "playTo", fields: { frame: 10, loopAfter: false } },
]);

const noPausePolicy = {
    totalFrames: 12,
    steps: [step(0), step(6)],
    pauseSteps: [],
    autoplay: true,
};
assert.deepEqual(plan(noPausePolicy, { kind: "slideEntered", value: 0 }), [
    { kind: "seek", value: 0 },
    { kind: "playTo", fields: { frame: 11, loopAfter: false } },
]);

runtime.dispose();
console.log("PASS: 11 Verso Reveal policy cases through VIR");
