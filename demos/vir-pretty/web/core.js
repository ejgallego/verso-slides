// @ts-check
/* Standalone five-backend Std.Format demo for unmodified Verso Slides. */
"use strict";

/** @typedef {{text: string, tags: number[]}} Segment */
/** @typedef {{marshalMs: number, executeMs: number, decodeMs: number, renderMs: number, totalMs: number, [key: string]: number | undefined}} PrettyTimings */
/** @typedef {{segments: Segment[] | null, timings: PrettyTimings, memory?: *, error?: string}} PrettySegmentResult */
/** @typedef {{id: string, label: string, ready?: Promise<*>, status?: () => string, renderTimed: (fmt: *, annotations: *, width: number, measurer: *) => PrettySegmentResult}} PrettyBackendDefinition */

/** @type {PrettyBackendDefinition[]} */
var prettyBackends = [];

/** @param {PrettyBackendDefinition} backend */
function registerPrettyBackend(backend) {
    if (!backend || !backend.id || !backend.label || typeof backend.renderTimed !== "function") {
        throw new TypeError("invalid pretty backend registration");
    }
    var index = prettyBackends.findIndex(function (candidate) {
        return candidate.id === backend.id;
    });
    if (index < 0) prettyBackends.push(backend);
    else prettyBackends[index] = backend;
}

/** @return {PrettyBackendDefinition[]} */
function getPrettyBackends() {
    return prettyBackends.slice();
}

/** @param {string} id @return {PrettyBackendDefinition | null} */
function getPrettyBackend(id) {
    return prettyBackends.find(function (candidate) { return candidate.id === id; }) || null;
}

/** @return {PrettyTimings} */
function emptyPrettyTimings() {
    return { marshalMs: 0, executeMs: 0, decodeMs: 0, renderMs: 0, totalMs: 0 };
}

/** @param {number} pixelWidth @param {*} measurer */
function pixelWidthToFormatColumns(pixelWidth, measurer) {
    return Math.max(1, Math.floor(pixelWidth / Math.max(measurer.spaceWidth || 1, 1e-9)));
}

/** Convert the compact browser encoding to the shared FIR adapter input. */
function compactFormatToAdapterInput(formatFactory, json) {
    if (json === null) return formatFactory.nil();
    if (json === 1) return formatFactory.line();
    if (typeof json === "string") return formatFactory.text(json);
    if (!Array.isArray(json) || json.length === 0) throw new Error("invalid compact format");
    switch (json[0]) {
        case 2: return formatFactory.align(Boolean(json[1]));
        case 3: return formatFactory.nest(json[1], compactFormatToAdapterInput(formatFactory, json[2]));
        case 4: return formatFactory.append(
            compactFormatToAdapterInput(formatFactory, json[1]),
            compactFormatToAdapterInput(formatFactory, json[2]));
        case 5:
        case 6: return formatFactory.group(
            compactFormatToAdapterInput(formatFactory, json[1]),
            json[0] === 5 ? "allOrNone" : "fill");
        case 7: return formatFactory.tag(json[1], compactFormatToAdapterInput(formatFactory, json[2]));
        default: throw new Error("unknown compact format tag " + json[0]);
    }
}

/** Convert the compact browser encoding to lean-vir's typed Std.Format ABI. */
function compactFormatToStdFormat(json) {
    if (json === null) return { kind: "nil" };
    if (typeof json === "string") return { kind: "text", value: json };
    if (json === 1) return { kind: "line" };
    if (!Array.isArray(json)) throw new Error("invalid compact format");
    switch (json[0]) {
        case 2: return { kind: "align", value: Boolean(json[1]) };
        case 3: return { kind: "nest", fields: {
            indent: String(json[1]), f: compactFormatToStdFormat(json[2]) } };
        case 4: return { kind: "append", fields: {
            arg1: compactFormatToStdFormat(json[1]), arg2: compactFormatToStdFormat(json[2]) } };
        case 5:
        case 6: return { kind: "group", fields: {
            arg1: compactFormatToStdFormat(json[1]),
            behavior: json[0] === 5 ? "allOrNone" : "fill" } };
        case 7: return { kind: "tag", fields: {
            arg1: String(json[1]), arg2: compactFormatToStdFormat(json[2]) } };
        default: throw new Error("unknown compact format tag " + json[0]);
    }
}

/** Convert the common PrettyTrace contract to tagged segments. */
function prettyTraceToSegments(trace) {
    /** @type {number[]} */ var tags = [];
    /** @type {Segment[]} */ var segments = [];
    function natural(value, label) {
        var n = Number(value);
        if (!Number.isSafeInteger(n) || n < 0) throw new Error("invalid " + label);
        return n;
    }
    trace.events.forEach(function (event) {
        if (event.kind === 0 && event.text.length) segments.push({ text: event.text, tags: tags.slice() });
        else if (event.kind === 1) segments.push({ text: "\n" + " ".repeat(natural(event.value, "indent")), tags: [] });
        else if (event.kind === 2) tags.push(natural(event.value, "tag"));
        else if (event.kind === 3) {
            var count = natural(event.value, "tag count");
            if (count > tags.length) throw new Error("trace closes unopened tags");
            tags.length -= count;
        } else if (event.kind !== 0) throw new Error("unknown trace event " + event.kind);
    });
    if (tags.length) throw new Error("trace leaves tags open");
    var text = segments.map(function (segment) { return segment.text; }).join("");
    if (text !== trace.text) throw new Error("trace text and events disagree");
    return segments;
}

/** @param {*} value @return {Segment[] | null} */
function normalizeVirSegments(value) {
    if (!Array.isArray(value)) return null;
    var output = [];
    for (var i = 0; i < value.length; i++) {
        var segment = value[i];
        if (!segment || typeof segment.text !== "string" || !Array.isArray(segment.tags)) return null;
        var tags = segment.tags.map(Number);
        if (tags.some(function (tag) { return !Number.isSafeInteger(tag) || tag < 0; })) return null;
        output.push({ text: segment.text, tags: tags });
    }
    return output;
}

function phaseTimings(started, marshaled, executed, decoded) {
    return {
        marshalMs: marshaled - started,
        executeMs: executed - marshaled,
        decodeMs: decoded - executed,
        renderMs: 0,
        totalMs: decoded - started,
    };
}

/** Deterministic character-column measurement gives every backend the same budget. */
function createColumnMeasurer(columns) {
    return {
        measure: function (text) { return Array.from(text).length; },
        spaceWidth: 1,
        measureElWidth: function () { return columns; },
        cleanup: function () {},
    };
}

function virJsonTimed(fmt, _annotations, width, measurer) {
    var started = performance.now();
    var bridge = window.__versoPrettyVir;
    if (!bridge || bridge.status !== "ready" || typeof bridge.formatJsonSegmentsJson !== "function") {
        return { segments: null, timings: emptyPrettyTimings() };
    }
    try {
        var input = JSON.stringify(fmt);
        var marshaled = performance.now();
        var raw = bridge.formatJsonSegmentsJson(input, pixelWidthToFormatColumns(width, measurer), 0);
        var executed = performance.now();
        var decodedValue = typeof raw === "string" ? JSON.parse(raw) : raw;
        var segments = decodedValue && decodedValue.ok === true
            ? normalizeVirSegments(decodedValue.segments) : null;
        var decoded = performance.now();
        return { segments: segments, timings: phaseTimings(started, marshaled, executed, decoded),
            error: segments ? undefined : String(decodedValue && decodedValue.error || "invalid result") };
    } catch (error) {
        return { segments: null, timings: emptyPrettyTimings(), error: String(error) };
    }
}

function virFormatTimed(fmt, _annotations, width, measurer) {
    var started = performance.now();
    var bridge = window.__versoPrettyVir;
    if (!bridge || bridge.status !== "ready" || typeof bridge.formatSegments !== "function") {
        return { segments: null, timings: emptyPrettyTimings() };
    }
    try {
        var input = compactFormatToStdFormat(fmt);
        var marshaled = performance.now();
        var raw = bridge.formatSegments(input, pixelWidthToFormatColumns(width, measurer), 0);
        var executed = performance.now();
        var segments = normalizeVirSegments(raw);
        var decoded = performance.now();
        return { segments: segments, timings: phaseTimings(started, marshaled, executed, decoded),
            error: segments ? undefined : "invalid result" };
    } catch (error) {
        return { segments: null, timings: emptyPrettyTimings(), error: String(error) };
    }
}

function jsTimed(fmt, annotations, width, measurer) {
    var started = performance.now();
    if (typeof deserializeFormat !== "function" || typeof makeRenderContext !== "function" ||
        typeof prettyM !== "function") {
        return { segments: null, timings: emptyPrettyTimings(), error: "vanilla pretty.js unavailable" };
    }
    var input = deserializeFormat(fmt);
    var context = makeRenderContext(annotations, measurer);
    var marshaled = performance.now();
    prettyM(input, width, 0, context, measurer);
    var executed = performance.now();
    return { segments: context.segments, timings: phaseTimings(started, marshaled, executed, executed) };
}

registerPrettyBackend({ id: "js", label: "JavaScript", status: function () { return "ready"; }, renderTimed: jsTimed });
registerPrettyBackend({ id: "vir", label: "VIR JSON", status: function () {
    return window.__versoPrettyVir && window.__versoPrettyVir.status || "unavailable";
}, renderTimed: virJsonTimed });
registerPrettyBackend({ id: "vir-format", label: "VIR Format", status: function () {
    return window.__versoPrettyVir && window.__versoPrettyVir.status || "unavailable";
}, renderTimed: virFormatTimed });

function append(parts) {
    if (!parts.length) return null;
    var level = parts.slice();
    while (level.length > 1) {
        var next = [];
        for (var i = 0; i < level.length; i += 2) {
            next.push(i + 1 < level.length ? [4, level[i], level[i + 1]] : level[i]);
        }
        level = next;
    }
    return level[0];
}

function words(count) {
    var parts = [];
    for (var i = 0; i < count; i++) {
        if (i) parts.push(1);
        parts.push("word" + i);
    }
    return [6, append(parts)];
}

var PRETTY_CASES = [
    { id: "definition", label: "Grouped definition", width: 34, format: [5, append([
        [7, 1, "def"], " prettyDemo", 1, [3, 2, append([":=", 1, "render all candidates"])]
    ])] },
    { id: "tags", label: "Nested styling tags", width: 28, format: [5, append([
        [7, 1, "theorem"], " ", [7, 2, "tagged"], 1,
        [3, 2, [7, 3, append(["(", [7, 4, "x : Nat"], ") : True"])] ]
    ])] },
    { id: "fill", label: "Fill group", width: 24, format: words(18) },
    { id: "deep", label: "Nested groups", width: 20, format:
        [5, [3, 2, [5, append([
            "alpha", 1, [3, 2, [5, append(["beta", 1, "gamma", 1, "delta"])]]
        ])]]] },
];

function canonicalSegments(segments) {
    var output = [];
    (segments || []).forEach(function (segment) {
        if (!segment.text) return;
        var key = segment.tags.join(",");
        var previous = output[output.length - 1];
        if (previous && previous.tags.join(",") === key) previous.text += segment.text;
        else output.push({ text: segment.text, tags: segment.tags.slice() });
    });
    return output;
}

function segmentsEqual(left, right) {
    return JSON.stringify(canonicalSegments(left)) === JSON.stringify(canonicalSegments(right));
}

function timingTitle(timings) {
    var phases = ["marshalMs", "executeMs", "decodeMs", "renderMs", "totalMs"];
    var details = Object.keys(timings).filter(function (key) {
        return !phases.includes(key) && typeof timings[key] === "number";
    });
    return phases.concat(details).map(function (key) {
        var value = Number(timings[key] || 0);
        return key.replace(/Ms$/, "") + ": " + value.toFixed(3) + (key.endsWith("Ms") ? " ms" : "");
    }).join("\n");
}

function make(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function renderSegments(segments) {
    var pre = make("pre", "vir-pretty-output");
    (segments || []).forEach(function (segment) {
        var span = make("span", segment.tags.length ? "vir-pretty-tagged" : "", segment.text);
        if (segment.tags.length) {
            span.dataset.tags = segment.tags.join(",");
            span.style.setProperty("--tag-hue", String((segment.tags[segment.tags.length - 1] * 67) % 360));
        }
        pre.appendChild(span);
    });
    return pre;
}

function median(values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function selectedBackendIds(root) {
    return Array.from(root.querySelectorAll("[data-backend]:checked")).map(function (input) {
        return input.getAttribute("data-backend");
    }).filter(Boolean);
}

function runOne(backend, format, columns) {
    return backend.renderTimed(format, {}, columns, createColumnMeasurer(columns));
}

function renderComparison(root) {
    var caseId = root.querySelector("[data-case]").value;
    var selectedCase = PRETTY_CASES.find(function (item) { return item.id === caseId; }) || PRETTY_CASES[0];
    var columns = Number(root.querySelector("[data-width]").value);
    root.querySelector("[data-width-value]").textContent = String(columns);
    var output = root.querySelector("[data-outputs]");
    output.replaceChildren();
    var results = {};
    selectedBackendIds(root).forEach(function (id) {
        var backend = getPrettyBackend(id);
        if (!backend) return;
        var card = make("article", "vir-pretty-card");
        var heading = make("header", "vir-pretty-card-head");
        heading.append(make("strong", "", backend.label));
        var status = backend.status ? backend.status() : "ready";
        if (status !== "ready") {
            heading.append(make("span", "vir-pretty-status " + status, status));
            card.append(heading, make("p", "vir-pretty-unavailable", status === "loading" ? "Loading artifact…" : "Unavailable"));
            output.append(card);
            return;
        }
        var result = runOne(backend, selectedCase.format, columns);
        results[id] = result;
        if (!result.segments) {
            heading.append(make("span", "vir-pretty-status failed", "failed"));
            card.append(heading, make("p", "vir-pretty-unavailable", result.error || "No output"));
            output.append(card);
            return;
        }
        var renderStarted = performance.now();
        var rendered = renderSegments(result.segments);
        result.timings.renderMs = performance.now() - renderStarted;
        var timing = make("span", "vir-pretty-timing", result.timings.executeMs.toFixed(3) + " ms exec");
        timing.title = timingTitle(result.timings);
        heading.append(timing);
        card.append(heading, rendered);
        output.append(card);
    });
    var reference = results.js && results.js.segments;
    output.querySelectorAll(".vir-pretty-card").forEach(function (card, index) {
        var ids = selectedBackendIds(root);
        var id = ids[index];
        if (reference && results[id] && results[id].segments) {
            var badge = make("span", segmentsEqual(reference, results[id].segments)
                ? "vir-pretty-parity ok" : "vir-pretty-parity mismatch",
                id === "js" ? "reference" : segmentsEqual(reference, results[id].segments) ? "exact" : "diff");
            card.querySelector("header").append(badge);
        }
    });
}

function scalingFormat(dimension, size) {
    if (dimension === "text") return "x".repeat(size);
    if (dimension === "nodes") return append(Array.from({ length: size }, function () { return null; }));
    if (dimension === "nesting") {
        var nested = "x";
        for (var i = 0; i < size; i++) nested = [3, 1, nested];
        return nested;
    }
    if (dimension === "breaks") return words(size);
    var tagged = "x";
    for (var j = 0; j < size; j++) tagged = [7, j + 1, tagged];
    return tagged;
}

function scalingSizes(dimension) {
    if (dimension === "text") return [8, 32, 128, 512, 2048, 8192];
    if (dimension === "nodes") return [4, 16, 64, 256, 1024];
    return [1, 4, 16, 64, 256];
}

function chart(report, phase) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 720 260");
    svg.classList.add("vir-pretty-chart");
    var margin = { left: 54, right: 18, top: 20, bottom: 42 };
    var width = 720 - margin.left - margin.right;
    var height = 260 - margin.top - margin.bottom;
    var all = report.series.flatMap(function (series) { return series.points.map(function (point) { return point[phase]; }); });
    var maximum = Math.max.apply(null, all.concat([0.001]));
    var minSize = report.sizes[0], maxSize = report.sizes[report.sizes.length - 1];
    function x(size) { return margin.left + (Math.log(size) - Math.log(minSize)) / Math.max(1e-9, Math.log(maxSize) - Math.log(minSize)) * width; }
    function y(value) { return margin.top + height - value / maximum * height; }
    function line(x1, y1, x2, y2, klass) {
        var element = document.createElementNS(svg.namespaceURI, "line");
        ["x1", "y1", "x2", "y2"].forEach(function (name, index) { element.setAttribute(name, String([x1, y1, x2, y2][index])); });
        element.setAttribute("class", klass); svg.append(element);
    }
    line(margin.left, margin.top, margin.left, margin.top + height, "axis");
    line(margin.left, margin.top + height, margin.left + width, margin.top + height, "axis");
    report.series.forEach(function (series, seriesIndex) {
        var points = series.points.map(function (point) { return x(point.size) + "," + y(point[phase]); }).join(" ");
        var polyline = document.createElementNS(svg.namespaceURI, "polyline");
        polyline.setAttribute("points", points); polyline.setAttribute("class", "series series-" + seriesIndex); svg.append(polyline);
        series.points.forEach(function (point) {
            var circle = document.createElementNS(svg.namespaceURI, "circle");
            circle.setAttribute("cx", String(x(point.size))); circle.setAttribute("cy", String(y(point[phase])));
            circle.setAttribute("r", "4"); circle.setAttribute("class", "point series-" + seriesIndex);
            var title = document.createElementNS(svg.namespaceURI, "title");
            title.textContent = series.label + "\nsize: " + point.size + "\n" + phase + ": " + point[phase].toFixed(4) + " ms";
            circle.append(title); svg.append(circle);
        });
    });
    var label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", "8"); label.setAttribute("y", "14"); label.textContent = phase + " (ms)"; svg.append(label);
    return svg;
}

async function runScaling(root) {
    var button = root.querySelector("[data-run-scaling]");
    var dimension = root.querySelector("[data-dimension]").value;
    var phase = root.querySelector("[data-phase]").value;
    var sizes = scalingSizes(dimension);
    var backendIds = selectedBackendIds(root);
    var result = root.querySelector("[data-scaling-result]");
    button.disabled = true; button.textContent = "Measuring…";
    await new Promise(function (resolve) { requestAnimationFrame(resolve); });
    var report = { dimension: dimension, sizes: sizes, series: [] };
    backendIds.forEach(function (id) {
        var backend = getPrettyBackend(id);
        if (!backend || backend.status && backend.status() !== "ready") return;
        var series = { id: id, label: backend.label, points: [] };
        sizes.forEach(function (size) {
            var format = scalingFormat(dimension, size);
            var columns = dimension === "breaks" ? 16 : 80;
            runOne(backend, format, columns);
            var samples = [];
            for (var sample = 0; sample < 5; sample++) samples.push(runOne(backend, format, columns).timings);
            series.points.push({
                size: size,
                marshalMs: median(samples.map(function (t) { return t.marshalMs; })),
                executeMs: median(samples.map(function (t) { return t.executeMs; })),
                decodeMs: median(samples.map(function (t) { return t.decodeMs; })),
                totalMs: median(samples.map(function (t) { return t.totalMs; })),
            });
        });
        report.series.push(series);
    });
    window.__virPrettyDemoReports = window.__virPrettyDemoReports || [];
    window.__virPrettyDemoReports.push(report);
    result.replaceChildren(chart(report, phase));
    var legend = make("div", "vir-pretty-legend");
    report.series.forEach(function (series, index) {
        var item = make("span", "series-" + index, series.label); legend.append(item);
    });
    result.append(legend);
    button.disabled = false; button.textContent = "Run size study";
}

function setupDemo(root) {
    root.innerHTML = "";
    var controls = make("div", "vir-pretty-controls");
    var caseSelect = make("select"); caseSelect.dataset.case = "";
    PRETTY_CASES.forEach(function (item) { var option = make("option", "", item.label); option.value = item.id; caseSelect.append(option); });
    var width = make("input"); width.type = "range"; width.min = "8"; width.max = "100"; width.value = "34"; width.dataset.width = "";
    controls.append(make("label", "", "Input "), caseSelect, make("label", "", "Width "), width, make("span", "vir-pretty-width", "34"));
    controls.lastElementChild.dataset.widthValue = "";
    var backendControls = make("div", "vir-pretty-backends");
    getPrettyBackends().forEach(function (backend) {
        var label = make("label"); var input = make("input"); input.type = "checkbox"; input.checked = true; input.dataset.backend = backend.id;
        label.append(input, document.createTextNode(" " + backend.label)); backendControls.append(label);
    });
    var run = make("button", "", "Render"); run.type = "button"; controls.append(run);
    var outputs = make("div", "vir-pretty-outputs"); outputs.dataset.outputs = "";
    var benchmark = make("section", "vir-pretty-benchmark");
    var dimension = make("select"); dimension.dataset.dimension = "";
    [["text", "Text volume"], ["nodes", "Format leaves"], ["nesting", "Nesting depth"], ["breaks", "Break opportunities"], ["tags", "Tag depth"]].forEach(function (entry) {
        var option = make("option", "", entry[1]); option.value = entry[0]; dimension.append(option);
    });
    var phase = make("select"); phase.dataset.phase = "";
    [["executeMs", "Execute"], ["marshalMs", "Marshal"], ["decodeMs", "Decode"], ["totalMs", "Total"]].forEach(function (entry) {
        var option = make("option", "", entry[1]); option.value = entry[0]; phase.append(option);
    });
    var scaleButton = make("button", "", "Run size study"); scaleButton.type = "button"; scaleButton.dataset.runScaling = "";
    var result = make("div", "vir-pretty-scaling-result"); result.dataset.scalingResult = "";
    benchmark.append(make("h3", "", "Size → runtime"), dimension, phase, scaleButton, result);
    root.append(controls, backendControls, outputs, benchmark);
    function rerender() { renderComparison(root); }
    run.addEventListener("click", rerender); caseSelect.addEventListener("change", function () {
        var selected = PRETTY_CASES.find(function (item) { return item.id === caseSelect.value; });
        if (selected) width.value = String(selected.width); rerender();
    });
    width.addEventListener("input", rerender); backendControls.addEventListener("change", rerender);
    scaleButton.addEventListener("click", function () { runScaling(root); });
    phase.addEventListener("change", function () {
        var reports = window.__virPrettyDemoReports || [];
        var report = reports[reports.length - 1]; if (report) result.replaceChildren(chart(report, phase.value));
    });
    rerender();
    Promise.allSettled(getPrettyBackends().map(function (backend) { return backend.ready || Promise.resolve(); })).then(rerender);
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-vir-pretty-demo]").forEach(setupDemo);
});
