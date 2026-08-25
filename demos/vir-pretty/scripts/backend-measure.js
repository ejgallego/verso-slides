// @ts-check

/** Generic, test-only formatter measurement surface injected by Playwright. */
(function () {
    "use strict";

    /** @param {*} value @param {Map<number, FormatData>} formats */
    function collectFormats(value, formats) {
        if (typeof value === "string") {
            if (!value.includes("fmt")) return;
            try {
                collectFormats(JSON.parse(value), formats);
            } catch (_) {}
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(function (item) {
                collectFormats(item, formats);
            });
            return;
        }
        if (!value || typeof value !== "object") return;
        if (
            Object.prototype.hasOwnProperty.call(value, "fmt") &&
            Number.isSafeInteger(value.formatId) &&
            value.formatId >= 0
        ) {
            formats.set(value.formatId, {
                fmt: value.fmt,
                annotations: value.annotations || {},
                formatId: value.formatId,
            });
            return;
        }
        Object.values(value).forEach(function (item) {
            collectFormats(item, formats);
        });
    }

    /** @param {ParentNode} root @param {Map<number, FormatData>} formats */
    function collectElementFormats(root, formats) {
        root.querySelectorAll("[data-rich-format]").forEach(function (element) {
            var raw = element.getAttribute("data-rich-format");
            if (raw !== null) collectFormats(raw, formats);
        });
    }

    /** @param {*} value @param {Map<number, FormatData>} formats */
    function collectDocumentationFormats(value, formats) {
        if (typeof value === "string") {
            if (!value.includes("data-rich-format=")) return;
            var template = document.createElement("template");
            template.innerHTML = value;
            collectElementFormats(template.content, formats);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(function (item) {
                collectDocumentationFormats(item, formats);
            });
            return;
        }
        if (value && typeof value === "object") {
            Object.values(value).forEach(function (item) {
                collectDocumentationFormats(item, formats);
            });
        }
    }

    /** @param {number[]} values */
    function distribution(values) {
        var sorted = values.slice().sort(function (left, right) {
            return left - right;
        });
        /** @param {number} fraction */
        var percentile = function (fraction) {
            return sorted[Math.round((sorted.length - 1) * fraction)];
        };
        return {
            median: percentile(0.5),
            p90: percentile(0.9),
            min: sorted[0],
            max: sorted[sorted.length - 1],
        };
    }

    /** @param {PrettyTimings[]} samples */
    function summarizeTimings(samples) {
        var keys = new Set();
        samples.forEach(function (sample) {
            Object.entries(sample).forEach(function (entry) {
                if (typeof entry[1] === "number" && Number.isFinite(entry[1])) keys.add(entry[0]);
            });
        });
        /** @type {Record<string, ReturnType<typeof distribution>>} */
        var summary = {};
        Array.from(keys)
            .sort()
            .forEach(function (key) {
                summary[key] = distribution(
                    samples.map(function (sample) {
                        return Number(
                            /** @type {Record<string, number>} */ (/** @type {unknown} */ (sample))[
                                key
                            ] || 0,
                        );
                    }),
                );
            });
        return summary;
    }

    /** @param {string} backend */
    function startupFor(backend) {
        if (backend.startsWith("vir-")) return window.__versoPrettyVir?.startupTimings || null;
        if (backend === "native") return window.__versoPrettyNative?.startupTimings || null;
        if (backend === "native-flat")
            return window.__versoPrettyNativeFlat?.startupTimings || null;
        if (backend === "native-html")
            return window.__versoPrettyNativeHtml?.startupTimings || null;
        if (backend === "llvm") return window.__versoPrettyLlvm?.startupTimings || null;
        if (backend === "llvm-html") return window.__versoPrettyLlvmHtml?.startupTimings || null;
        return null;
    }

    /** @param {string} backend */
    function memoryFor(backend) {
        if (backend === "native") return window.__versoPrettyNative?.lastMemory || null;
        if (backend === "native-flat") return window.__versoPrettyNativeFlat?.lastMemory || null;
        if (backend === "native-html") return window.__versoPrettyNativeHtml?.lastMemory || null;
        if (backend === "llvm") return window.__versoPrettyLlvm?.lastMemory || null;
        if (backend === "llvm-html") return window.__versoPrettyLlvmHtml?.lastMemory || null;
        return null;
    }

    /**
     * @param {{backends: string[], widths?: number[], repetitions?: number, warmups?: number, minimumCodePoints?: number}} options
     */
    async function runPrettyBackendMeasurement(options) {
        var backends = options.backends;
        var widths = options.widths || [20, 40, 80];
        var repetitions = options.repetitions || 7;
        var warmups = options.warmups === undefined ? 1 : options.warmups;
        var minimumCodePoints = Math.max(0, Math.floor(options.minimumCodePoints || 0));
        if (backends.length === 0) throw new Error("select at least one backend");

        /** @type {Map<number, FormatData>} */
        var formatMap = new Map();
        collectElementFormats(document, formatMap);
        var docs = await fetch(new URL("-verso-docs.json", window.location.href));
        if (!docs.ok) throw new Error("failed to load generated hover documentation");
        collectDocumentationFormats(await docs.json(), formatMap);
        var formats = Array.from(formatMap.values()).sort(function (left, right) {
            return Number(left.formatId) - Number(right.formatId);
        });
        if (formats.length === 0) throw new Error("no generated Format fixtures found");

        var cases = formats.flatMap(function (format) {
            return widths.map(function (width) {
                return { format: format, width: width };
            });
        });
        var fixture = document.createElement("div");
        fixture.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;visibility:hidden";
        var host = document.createElement("span");
        fixture.appendChild(host);
        document.body.appendChild(fixture);

        /** @type {Map<string, string>} */
        var expected = new Map();
        /** @type {Record<string, PrettyTimings[]>} */
        var samples = {};
        /** @type {Record<string, Record<string, number> | null>} */
        var firstMemory = {};
        /** @type {Record<string, Record<string, number> | null>} */
        var lastMemory = {};
        /** @type {Record<string, number>} */
        var renderCalls = {};
        /** @type {Array<{backend: string, formatId: number, width: number}>} */
        var failures = [];
        backends.forEach(function (backend) {
            samples[backend] = [];
            firstMemory[backend] = null;
            lastMemory[backend] = null;
            renderCalls[backend] = 0;
        });

        try {
            for (var selectedCase of cases) {
                var referenceMeasurer = createColumnMeasurer(selectedCase.width);
                var reference = formatPrettyOutputTimed(
                    selectedCase.format.fmt,
                    selectedCase.format.annotations,
                    selectedCase.width,
                    referenceMeasurer,
                    "js",
                    selectedCase.format.formatId,
                );
                insertPrettyOutput(host, reference);
                expected.set(
                    selectedCase.format.formatId + ":" + selectedCase.width,
                    host.innerHTML,
                );
                referenceMeasurer.cleanup();
            }

            for (var repetition = -warmups; repetition < repetitions; repetition++) {
                for (var caseIndex = 0; caseIndex < cases.length; caseIndex++) {
                    var selectedCase = cases[caseIndex];
                    var offset = (caseIndex + Math.max(0, repetition)) % backends.length;
                    for (var backendIndex = 0; backendIndex < backends.length; backendIndex++) {
                        var backend = backends[(backendIndex + offset) % backends.length];
                        var measurer = createColumnMeasurer(selectedCase.width);
                        var sourceCodePoints = compactFormatSourceLength(selectedCase.format.fmt);
                        var iterations = Math.max(
                            1,
                            Math.ceil(minimumCodePoints / Math.max(1, sourceCodePoints)),
                        );
                        var aggregate = emptyPrettyTimings();
                        /** @type {ReturnType<typeof formatPrettyOutputTimed> | null} */
                        var output = null;
                        for (var iteration = 0; iteration < iterations; iteration++) {
                            output = formatPrettyOutputTimed(
                                selectedCase.format.fmt,
                                selectedCase.format.annotations,
                                selectedCase.width,
                                measurer,
                                backend,
                                selectedCase.format.formatId,
                            );
                            if (!insertPrettyOutputTimed(host, output)) {
                                throw new Error(backend + " returned no output");
                            }
                            addPrettyTimings(aggregate, output.timings);
                            renderCalls[backend] += 1;
                            var memory = memoryFor(backend);
                            if (memory) {
                                var snapshot = Object.assign({}, memory);
                                if (firstMemory[backend] === null) firstMemory[backend] = snapshot;
                                lastMemory[backend] = snapshot;
                            }
                        }
                        if (
                            failures.length < 12 &&
                            host.innerHTML !==
                                expected.get(
                                    selectedCase.format.formatId + ":" + selectedCase.width,
                                )
                        ) {
                            failures.push({
                                backend: backend,
                                formatId: Number(selectedCase.format.formatId),
                                width: selectedCase.width,
                            });
                        }
                        if (repetition >= 0) {
                            aggregate.batchIterations = iterations;
                            aggregate.batchCodePoints = sourceCodePoints * iterations;
                            samples[backend].push(aggregate);
                        }
                        measurer.cleanup();
                    }
                }
            }
        } finally {
            fixture.remove();
        }

        /** @type {Record<string, *>} */
        var results = {};
        backends.forEach(function (backend) {
            var candidate = getPrettyBackend(backend);
            results[backend] = {
                label: candidate?.label || backend,
                capabilities: candidate?.capabilities || null,
                samples: samples[backend].length,
                renderCalls: renderCalls[backend],
                timingsMs: summarizeTimings(samples[backend]),
                startupMs: startupFor(backend),
                firstMemory: firstMemory[backend],
                lastMemory: lastMemory[backend],
            };
        });
        return {
            formatCount: formats.length,
            widths: widths,
            cases: cases.length,
            repetitions: repetitions,
            warmups: warmups,
            minimumCodePoints: minimumCodePoints,
            failures: failures,
            backends: results,
        };
    }

    window.runPrettyBackendMeasurement = runPrettyBackendMeasurement;
})();
