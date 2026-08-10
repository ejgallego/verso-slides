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
    virPanelHostAdapter: "demos/vir-pretty/web/panel-component.js",
    virLoader: "demos/vir-pretty/web/vir-loader.js",
    panelMeasurer: "demos/vir-pretty/web/panel-measurer.js",
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

// Pin the pre-pilot ordinary implementation. Deriving this from the mutable
// candidate would make the production hook disappear from the comparison.
const baseline = {
    panelLines: 658,
    formatterLines: 662,
};
const baselineApplicationLines = baseline.panelLines + baseline.formatterLines;
const production = sum(sourceMetrics.productionPanel, sourceMetrics.productionFormatter);
const lab = sum(sourceMetrics.labPanel, sourceMetrics.labFormatter);
const leanSemanticLines = sourceMetrics.leanModel.lines + sourceMetrics.virReactView.lines;
const jsProfileLines =
    sourceMetrics.productionPanel.lines + sourceMetrics.productionFormatter.lines;
const virOnlyProfileLines =
    sourceMetrics.productionPanel.lines +
    sourceMetrics.panelMeasurer.lines +
    sourceMetrics.virLoader.lines +
    sourceMetrics.virPanelHostAdapter.lines +
    leanSemanticLines;
const virOnlySharedLoaderLines = virOnlyProfileLines - sourceMetrics.virLoader.lines;
const virFallbackProfileLines =
    jsProfileLines +
    sourceMetrics.virLoader.lines +
    sourceMetrics.virPanelHostAdapter.lines +
    leanSemanticLines;
const result = {
    sources: sourceMetrics,
    deliveredJavaScript: {
        production,
        lab,
        labMinusProduction: subtract(lab, production),
    },
    humanFactors: {
        baselineApplicationSpecificLines: baselineApplicationLines,
        productionPanelHookLines: 53,
        productionPanelReadyFixLines:
            sourceMetrics.productionPanel.lines - baseline.panelLines - 53,
        leanSemanticLines,
        profiles: {
            js: profileLines(jsProfileLines, baselineApplicationLines),
            virOnly: profileLines(virOnlyProfileLines, baselineApplicationLines),
            virOnlyWithSharedLoader: profileLines(
                virOnlySharedLoaderLines,
                baselineApplicationLines,
            ),
            virFallback: profileLines(virFallbackProfileLines, baselineApplicationLines),
            virOnlyChargingSharedPretty: profileLines(
                virOnlyProfileLines + sourceMetrics.sharedPretty.lines,
                baselineApplicationLines,
            ),
        },
        semanticLineReductionPercent: roundPercent(
            1 - leanSemanticLines / sourceMetrics.productionFormatter.lines,
        ),
        sharedPrettyLines: sourceMetrics.sharedPretty.lines,
        note: "The pinned baseline is the 658-line panel plus 662-line formatter before this pilot. Actual profile counts fully charge their selected browser adapter, loader, and measurer. Lean's canonical shared Pretty module and generated registry source are excluded except in virOnlyChargingSharedPretty.",
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

const residentPilotRoot = resolve(root, "demos/vir-pretty/_profiles/vir-only/vir-pretty");
try {
    const runtime = await fileMetrics(resolve(residentPilotRoot, "vir-runtime.js"));
    const wasm = await fileMetrics(resolve(residentPilotRoot, "lean-vir/wasm/vir-upstream.wasm"));
    const irFiles = await walkIrPackages(resolve(residentPilotRoot, "vir-ir"));
    const ir = await sumFiles(irFiles);
    const registry = JSON.parse(
        await readFile(resolve(residentPilotRoot, "verso-pretty-registry.json"), "utf8"),
    );
    result.productionVirArtifact = {
        runtime,
        wasm,
        ir: { ...ir, members: irFiles.length },
        formatCount: registry.formatCount,
        contentCount: registry.panelContentCount,
        runtimeInstances: 1,
        exports: ["VirPanelRegistry.mountContent", "VirPanelRegistry.unmount"],
    };
} catch (error) {
    result.productionVirArtifact = {
        unavailable: true,
        hint: "run VIR_PRETTY_PROFILE=vir-only demos/vir-pretty/scripts/assemble.sh",
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

function profileLines(lines, baselineLines) {
    return {
        lines,
        changeLines: lines - baselineLines,
        changePercent: roundPercent(lines / baselineLines - 1),
    };
}
