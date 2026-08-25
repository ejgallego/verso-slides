// @ts-check

/** Focused, test-only scaling measurements for the complete HTML boundary. */
(function () {
    "use strict";

    /** @param {number[]} values */
    function distribution(values) {
        var sorted = values.slice().sort(function (left, right) {
            return left - right;
        });
        /** @param {number} fraction */
        function percentile(fraction) {
            return sorted[Math.round((sorted.length - 1) * fraction)];
        }
        return {
            median: percentile(0.5),
            p90: percentile(0.9),
            min: sorted[0],
            max: sorted[sorted.length - 1],
        };
    }

    /** @param {Array<Record<string, number>>} samples */
    function summarize(samples) {
        var keys = new Set();
        samples.forEach(function (sample) {
            Object.entries(sample).forEach(function (entry) {
                if (typeof entry[1] === "number" && Number.isFinite(entry[1])) keys.add(entry[0]);
            });
        });
        /** @type {Record<string, ReturnType<typeof distribution>>} */
        var result = {};
        Array.from(keys)
            .sort()
            .forEach(function (key) {
                result[key] = distribution(
                    samples.map(function (sample) {
                        return sample[key];
                    }),
                );
            });
        return result;
    }

    /** @param {*[]} nodes @return {*} */
    function balancedAppend(nodes) {
        if (nodes.length === 0) return null;
        var level = nodes.slice();
        while (level.length > 1) {
            var next = [];
            for (var i = 0; i < level.length; i += 2) {
                next.push(i + 1 < level.length ? [4, level[i], level[i + 1]] : level[i]);
            }
            level = next;
        }
        return level[0];
    }

    /** @param {number} total @param {number} count @param {(index: number, text: string) => *} wrap */
    function chunked(total, count, wrap) {
        var base = Math.floor(total / count);
        var remainder = total % count;
        var nodes = [];
        for (var i = 0; i < count; i++) {
            var length = base + (i < remainder ? 1 : 0);
            nodes.push(wrap(i, "x".repeat(length)));
        }
        return balancedAppend(nodes);
    }

    /** @param {number} length @param {number} density */
    function escapedText(length, density) {
        var escaped = '&<>"';
        var result = "";
        for (var i = 0; i < length; i++) {
            var selected = density >= 1 || (density > 0 && i % Math.round(1 / density) === 0);
            result += selected ? escaped[i % escaped.length] : "x";
        }
        return result;
    }

    /** @param {number} depth @param {*} node */
    function nestedTags(depth, node) {
        var result = node;
        for (var i = depth - 1; i >= 0; i--) result = [7, i, result];
        return result;
    }

    /** @param {number} count */
    function annotations(count) {
        /** @type {Record<string, {cssClass: string, binding: string}>} */
        var result = {};
        for (var i = 0; i < count; i++) {
            result[String(i)] = { cssClass: "tok-" + i, binding: "binding-" + i };
        }
        return result;
    }

    /** @param {*} value */
    function countFormatNodes(value) {
        if (value === null || value === undefined || value === 1 || typeof value === "string") {
            return 1;
        }
        if (!Array.isArray(value) || value.length === 0) return 1;
        if (value[0] === 4) return 1 + countFormatNodes(value[1]) + countFormatNodes(value[2]);
        if (value[0] === 3 || value[0] === 7) return 1 + countFormatNodes(value[2]);
        if (value[0] === 5 || value[0] === 6) return 1 + countFormatNodes(value[1]);
        return 1;
    }

    /** @return {Array<{id: string, dimension: string, value: number | string, fmt: *, annotations: Record<string, *>}>} */
    function makeCases() {
        var cases = [];
        [64, 256, 1024, 4096, 16384].forEach(function (length) {
            cases.push({
                id: "text-" + length,
                dimension: "textLength",
                value: length,
                fmt: "x".repeat(length),
                annotations: {},
            });
        });
        [256, 1024, 4096, 16384].forEach(function (length) {
            [0, 0.25, 1].forEach(function (density) {
                cases.push({
                    id: "escape-" + length + "-" + density,
                    dimension: "escapeDensity",
                    value: length + "@" + density,
                    fmt: escapedText(length, density),
                    annotations: {},
                });
            });
        });
        [1, 4, 16, 64, 256].forEach(function (count) {
            cases.push({
                id: "chunks-" + count,
                dimension: "chunkCount",
                value: count,
                fmt: chunked(4096, count, function (_index, text) {
                    return text;
                }),
                annotations: {},
            });
        });
        [1, 4, 16, 64, 256].forEach(function (count) {
            cases.push({
                id: "annotations-" + count,
                dimension: "annotationCount",
                value: count,
                fmt: chunked(4096, count, function (index, text) {
                    return [7, index, text];
                }),
                annotations: annotations(count),
            });
        });
        [0, 1, 4, 16, 64, 128, 256].forEach(function (depth) {
            cases.push({
                id: "tag-depth-" + depth,
                dimension: "tagDepth",
                value: depth,
                fmt: nestedTags(depth, "x".repeat(4096)),
                annotations: annotations(depth),
            });
        });
        [0, 16, 64].forEach(function (depth) {
            [16, 64].forEach(function (chunks) {
                cases.push({
                    id: "tag-chunks-" + depth + "-" + chunks,
                    dimension: "tagDepthByChunks",
                    value: depth + "x" + chunks,
                    fmt: chunked(4096, chunks, function (_index, text) {
                        return nestedTags(depth, text);
                    }),
                    annotations: annotations(depth),
                });
            });
        });
        return cases;
    }

    /** @param {string} backend */
    function memoryFor(backend) {
        if (backend === "native-html") {
            return window.__versoPrettyNativeHtml?.lastMemory || null;
        }
        return null;
    }

    /** @param {Record<string, number>} aggregate @param {number} divisor */
    function normalizeAggregate(aggregate, divisor) {
        /** @type {Record<string, number>} */
        var result = {};
        Object.entries(aggregate).forEach(function (entry) {
            if (typeof entry[1] === "number" && Number.isFinite(entry[1])) {
                result[entry[0]] = entry[1] / divisor;
            }
        });
        return result;
    }

    /**
     * @param {{backends: string[], caseIds?: string[], repetitions?: number, warmups?: number,
     *   targetBatchMs?: number, maximumBatchCalls?: number,
     *   maximumBatchOutputBytes?: number, width?: number}} options
     */
    async function runPrettyHtmlScalingMeasurement(options) {
        var backends = options.backends;
        var repetitions = options.repetitions || 7;
        var warmups = options.warmups === undefined ? 1 : options.warmups;
        var targetBatchMs = options.targetBatchMs || 15;
        var maximumBatchCalls = options.maximumBatchCalls || 128;
        var maximumBatchOutputBytes = options.maximumBatchOutputBytes || 131072;
        var width = options.width || 1000000;
        var allCases = makeCases();
        var requestedCaseIds = options.caseIds || [];
        var cases =
            requestedCaseIds.length === 0
                ? allCases
                : allCases.filter(function (candidate) {
                      return requestedCaseIds.includes(candidate.id);
                  });
        var encoder = new TextEncoder();
        if (backends.length === 0) throw new Error("select at least one backend");
        if (cases.length !== (requestedCaseIds.length || allCases.length)) {
            var found = new Set(
                cases.map(function (candidate) {
                    return candidate.id;
                }),
            );
            var missing = requestedCaseIds.filter(function (id) {
                return !found.has(id);
            });
            throw new Error("unknown scaling cases: " + missing.join(", "));
        }

        var fixture = document.createElement("div");
        fixture.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;visibility:hidden";
        var host = document.createElement("span");
        fixture.appendChild(host);
        document.body.appendChild(fixture);

        /** @type {Array<*>} */
        var results = [];
        /** @type {Array<*>} */
        var failures = [];
        try {
            for (var caseIndex = 0; caseIndex < cases.length; caseIndex++) {
                var selectedCase = cases[caseIndex];
                var referenceMeasurer = createColumnMeasurer(width);
                var reference = formatPrettyOutputTimed(
                    selectedCase.fmt,
                    selectedCase.annotations,
                    width,
                    referenceMeasurer,
                    "js-html",
                );
                if (!insertPrettyOutputTimed(host, reference)) {
                    throw new Error("JavaScript reference failed for " + selectedCase.id);
                }
                var expectedHtml = host.innerHTML;
                var outputBytes = encoder.encode(expectedHtml).byteLength;
                referenceMeasurer.cleanup();

                /** @type {Record<string, number>} */
                var batchCalls = {};
                /** @type {Record<string, Array<Record<string, number>>>} */
                var rawSamples = {};
                /** @type {Record<string, Record<string, number> | null>} */
                var firstMemory = {};
                /** @type {Record<string, Record<string, number> | null>} */
                var lastMemory = {};

                for (var calibrateBackend of backends) {
                    rawSamples[calibrateBackend] = [];
                    firstMemory[calibrateBackend] = null;
                    lastMemory[calibrateBackend] = null;
                    var calibrateMeasurer = createColumnMeasurer(width);
                    var probeStarted = performance.now();
                    var probe = formatPrettyOutputTimed(
                        selectedCase.fmt,
                        selectedCase.annotations,
                        width,
                        calibrateMeasurer,
                        calibrateBackend,
                    );
                    if (!insertPrettyOutputTimed(host, probe)) {
                        throw new Error(calibrateBackend + " failed for " + selectedCase.id);
                    }
                    var probeMs = Math.max(0.001, performance.now() - probeStarted);
                    var byTime = Math.ceil(targetBatchMs / probeMs);
                    var byOutput = Math.max(
                        1,
                        Math.floor(maximumBatchOutputBytes / Math.max(1, outputBytes)),
                    );
                    batchCalls[calibrateBackend] = Math.max(
                        1,
                        Math.min(maximumBatchCalls, byTime, byOutput),
                    );
                    if (host.innerHTML !== expectedHtml) {
                        failures.push({
                            backend: calibrateBackend,
                            caseId: selectedCase.id,
                            phase: "calibration",
                        });
                    }
                    calibrateMeasurer.cleanup();
                }

                for (var repetition = -warmups; repetition < repetitions; repetition++) {
                    var offset = (caseIndex + Math.max(0, repetition)) % backends.length;
                    for (var backendIndex = 0; backendIndex < backends.length; backendIndex++) {
                        var backend = backends[(backendIndex + offset) % backends.length];
                        var iterations = batchCalls[backend];
                        var measurer = createColumnMeasurer(width);
                        var aggregate = emptyPrettyTimings();
                        var batchStarted = performance.now();
                        for (var iteration = 0; iteration < iterations; iteration++) {
                            var output = formatPrettyOutputTimed(
                                selectedCase.fmt,
                                selectedCase.annotations,
                                width,
                                measurer,
                                backend,
                            );
                            if (!insertPrettyOutputTimed(host, output)) {
                                throw new Error(
                                    backend + " returned no output for " + selectedCase.id,
                                );
                            }
                            addPrettyTimings(aggregate, output.timings);
                            var memory = memoryFor(backend);
                            if (memory) {
                                var snapshot = Object.assign({}, memory);
                                if (firstMemory[backend] === null) firstMemory[backend] = snapshot;
                                lastMemory[backend] = snapshot;
                            }
                        }
                        var batchWallMs = performance.now() - batchStarted;
                        if (host.innerHTML !== expectedHtml && failures.length < 24) {
                            failures.push({
                                backend: backend,
                                caseId: selectedCase.id,
                                phase: repetition < 0 ? "warmup" : "measured",
                            });
                        }
                        if (repetition >= 0) {
                            var sample = normalizeAggregate(aggregate, iterations);
                            sample.batchWallMs = batchWallMs / iterations;
                            sample.batchIterations = iterations;
                            sample.repetition = repetition;
                            sample.order = backendIndex;
                            rawSamples[backend].push(sample);
                        }
                        measurer.cleanup();
                    }
                }

                /** @type {Record<string, *>} */
                var backendResults = {};
                backends.forEach(function (backend) {
                    backendResults[backend] = {
                        batchIterations: batchCalls[backend],
                        samples: rawSamples[backend],
                        timingsMs: summarize(rawSamples[backend]),
                        firstMemory: firstMemory[backend],
                        lastMemory: lastMemory[backend],
                    };
                });
                results.push({
                    id: selectedCase.id,
                    dimension: selectedCase.dimension,
                    value: selectedCase.value,
                    sourceCodePoints: compactFormatSourceLength(selectedCase.fmt),
                    formatNodes: countFormatNodes(selectedCase.fmt),
                    annotations: Object.keys(selectedCase.annotations).length,
                    compactJsonBytes: encoder.encode(JSON.stringify(selectedCase.fmt)).byteLength,
                    outputBytes: outputBytes,
                    backends: backendResults,
                });
            }
        } finally {
            fixture.remove();
        }

        return {
            schema: "verso.pretty.html-scaling/v1",
            cases: results,
            failures: failures,
            options: {
                backends: backends,
                caseIds: cases.map(function (candidate) {
                    return candidate.id;
                }),
                repetitions: repetitions,
                warmups: warmups,
                targetBatchMs: targetBatchMs,
                maximumBatchCalls: maximumBatchCalls,
                maximumBatchOutputBytes: maximumBatchOutputBytes,
                width: width,
            },
        };
    }

    window.runPrettyHtmlScalingMeasurement = runPrettyHtmlScalingMeasurement;
})();
