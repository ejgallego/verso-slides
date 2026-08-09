#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const sources = {
    productionPanel: "web-lib/panel/panel.js",
    productionFormatter: "web-lib/panel/pretty.js",
    labPanel: "demos/vir-pretty/web/panel-lab.js",
    labFormatter: "demos/vir-pretty/web/formatter-lab.js",
    sharedPretty: "VersoSlides/Pretty.lean",
    leanModel: "VersoSlides/Panel/Component.lean",
    virReactView: "experiments/vir-panel/VirPanelExperiment.lean",
};

const sourceMetrics = {};
for (const [name, path] of Object.entries(sources)) {
    const bytes = await readFile(resolve(root, path));
    const text = bytes.toString("utf8");
    sourceMetrics[name] = {
        path,
        lines: text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length,
        bytes: bytes.length,
        gzipBytes: gzipSync(bytes, { mtime: 0 }).length,
        browserTokens: (
            text.match(
                /\b(?:document|window|querySelector|classList|innerHTML|getBoundingClientRect|addEventListener|ResizeObserver)\b/g,
            ) ?? []
        ).length,
    };
}

const production = sum(sourceMetrics.productionPanel, sourceMetrics.productionFormatter);
const lab = sum(sourceMetrics.labPanel, sourceMetrics.labFormatter);
const leanSemanticLines = sourceMetrics.leanModel.lines + sourceMetrics.virReactView.lines;
const projectedHybridLines = sourceMetrics.productionPanel.lines + leanSemanticLines;
const result = {
    sources: sourceMetrics,
    deliveredJavaScript: {
        production,
        lab,
        labMinusProduction: subtract(lab, production),
    },
    humanFactors: {
        currentApplicationSpecificLines:
            sourceMetrics.productionPanel.lines + sourceMetrics.productionFormatter.lines,
        leanSemanticLines,
        projectedHybridLinesBeforeBridge: projectedHybridLines,
        projectedHybridLineReductionPercent: roundPercent(
            1 - projectedHybridLines /
                (sourceMetrics.productionPanel.lines + sourceMetrics.productionFormatter.lines),
        ),
        semanticLineReductionPercent: roundPercent(
            1 - leanSemanticLines / sourceMetrics.productionFormatter.lines,
        ),
        sharedPrettyLines: sourceMetrics.sharedPretty.lines,
        note: "The hybrid projection retains the complete browser panel, replaces the JavaScript formatter with the Lean component/view, and excludes the final host bridge.",
    },
};

const builtRoot = resolve(root, "_test/vir-panel");
try {
    const runtime = await fileMetrics(resolve(builtRoot, "vir-react-runtime.js"));
    const wasm = await fileMetrics(resolve(builtRoot, "vir-upstream.wasm"));
    const irDir = resolve(builtRoot, "ir");
    const irFiles = await walkIrPackages(irDir);
    const ir = await sumFiles(irFiles);
    result.virReactArtifact = {
        runtime,
        wasm,
        ir: { ...ir, members: irFiles.length },
        total: sum(runtime, wasm, ir),
    };
} catch (error) {
    result.virReactArtifact = {
        unavailable: true,
        hint: "run scripts/build-vir-panel-experiment.sh",
        error: String(error?.message ?? error),
    };
}

console.log(JSON.stringify(result, null, 2));

async function fileMetrics(path) {
    const bytes = await readFile(path);
    return { bytes: bytes.length, gzipBytes: gzipSync(bytes, { mtime: 0 }).length };
}

async function walkIrPackages(dir) {
    const paths = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) paths.push(...(await walkIrPackages(path)));
        else if (entry.name.endsWith(".irpkg")) paths.push(path);
    }
    return paths.sort();
}

async function sumFiles(paths) {
    const metrics = await Promise.all(paths.map(fileMetrics));
    return metrics.reduce((total, metric) => sum(total, metric), { bytes: 0, gzipBytes: 0 });
}

function sum(...values) {
    return values.reduce(
        (total, value) => ({
            bytes: total.bytes + value.bytes,
            gzipBytes: total.gzipBytes + value.gzipBytes,
        }),
        { bytes: 0, gzipBytes: 0 },
    );
}

function subtract(left, right) {
    return { bytes: left.bytes - right.bytes, gzipBytes: left.gzipBytes - right.gzipBytes };
}

function roundPercent(value) {
    return Math.round(value * 1000) / 10;
}
