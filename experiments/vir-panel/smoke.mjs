#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
    createVirRuntime,
    createVirtualDocumentState,
    ensureVirtualElementState,
} from "../../_artifacts/lean-vir/web/src/vir-runtime-node.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const virRoot = resolve(repoRoot, "_artifacts/lean-vir");
const descriptorPath = resolve(
    here,
    ".lake/build/vir/module-sets/VirPanelExperiment.irpkg-set.json",
);
const descriptor = JSON.parse(await readFile(descriptorPath, "utf8"));
const packageBytes = await Promise.all(
    descriptor.packages.map((entry) => readFile(resolve(dirname(descriptorPath), entry.path))),
);
const wasmBytes = await readFile(resolve(virRoot, "web/public/vir-upstream.wasm"));
const documentState = createVirtualDocumentState();
ensureVirtualElementState(documentState, "#panel");

const runtime = await createVirRuntime({
    wasmBytes,
    irPackageSetBytes: packageBytes,
    virtualDocumentState: documentState,
});

const cold = runtime.callTimed("VirPanelExperiment.mountFixture", "#panel", 80);
assert.equal(cold.value, true);
const root = documentState.elements.get("#panel").reactRoot;
assert.equal(
    documentState.elements.get("#panel").textContent,
    "case demon:Nat → Nat⊢n + 1 = Nat.succ n",
);
assert.equal(findByClass(root.current, "goal").length, 1);
assert.equal(findByClass(root.current, "hypothesis").length, 1);
assert.equal(findByClass(root.current, "keyword token").length, 1);
assert.equal(findByClass(root.current, "keyword token")[0].props["data-binding"], "Nat");
const renderedText = documentState.elements.get("#panel").textContent;
assert.equal(runtime.call("VirPanelExperiment.unmount", "#panel"), true);

const samples = [];
for (let index = 0; index < 30; index += 1) {
    const sample = runtime.callTimed("VirPanelExperiment.mountFixture", "#panel", 80);
    assert.equal(sample.value, true);
    samples.push(sample.timings);
    assert.equal(runtime.call("VirPanelExperiment.unmount", "#panel"), true);
}

const metrics = {
    wasmBytes: wasmBytes.length,
    packageMembers: runtime.packageInfo.packageCount,
    packageBytes: runtime.packageInfo.byteLength,
    declarations: runtime.packageInfo.count,
    hostImports: runtime.packageInfo.hostImports,
    exports: runtime.interfaceManifest.exports.map((entry) => entry.entry),
    coldMs: cold.timings,
    repeatedMedianMs: medians(samples),
    renderedText,
};

runtime.dispose();
console.log(JSON.stringify(metrics, null, 2));

function findByClass(node, className) {
    if (node === null || node === undefined) return [];
    const own = node.kind === "element" && node.props?.className === className ? [node] : [];
    return own.concat(...(node.children ?? []).map((child) => findByClass(child, className)));
}

function medians(samples) {
    const keys = new Set(samples.flatMap((sample) => Object.keys(sample)));
    return Object.fromEntries(
        [...keys].map((key) => [key, median(samples.map((sample) => sample[key]))]),
    );
}

function median(values) {
    const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
    if (sorted.length === 0) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
