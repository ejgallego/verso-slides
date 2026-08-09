// @ts-check
/* Optional FIR native Wasm backend with direct flat text/style-event output. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   enabled?: boolean,
     *   adapterUrl?: string,
     *   wasmUrl?: string,
     *   descriptorUrl?: string,
     *   buildUrl?: string,
     *   fetchCache?: RequestCache,
     *   maximumNodes?: number
     * }} PrettyNativeFlatConfig
     *
     * @typedef {{
     *   enabled?: boolean,
     *   status?: string,
     *   ready?: Promise<*>,
     *   error?: *,
     *   build?: *,
     *   adapter?: *,
     *   lastMemory?: Record<string, number>,
     *   startupTimings?: *,
     *   assets?: string[],
     *   formatSegments?: (
     *     fmtJson: *,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => Segment[],
     *   formatSegmentsTimed?: (
     *     fmtJson: *,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => NativeFlatFormatResult,
     *   warnings?: Record<string, boolean>
     * }} PrettyNativeFlatBridge
     *
     * @typedef {{
     *   text: string,
     *   segments: Segment[],
     *   timings: PrettyTimings,
     *   memory?: *
     * }} NativeFlatFormatResult
     */

    var root = /** @type {Window & {
        __versoPrettyNativeFlatConfig?: PrettyNativeFlatConfig,
        __versoPrettyNativeFlat?: PrettyNativeFlatBridge
    }} */ (window);
    if (!root.__versoPrettyNativeFlatConfig) return;

    var config = root.__versoPrettyNativeFlatConfig;
    var bridge = root.__versoPrettyNativeFlat || {};
    bridge.enabled = config.enabled !== false;
    bridge.status = bridge.enabled ? "loading" : "disabled";
    root.__versoPrettyNativeFlat = bridge;

    var prettyConfig = root.__versoPrettyConfig;
    if (prettyConfig && Array.isArray(prettyConfig.experiments)) {
        var hasExperiment = prettyConfig.experiments.some(function (experiment) {
            return experiment.id === "fir-output";
        });
        if (!hasExperiment) {
            prettyConfig.experiments.push({
                id: "fir-output",
                label: "FIR output boundary",
                question:
                    "What changes when FIR returns direct flat text/style events instead of PrettyTrace, with its input adapter and runtime held fixed?",
                backends: ["native", "native-flat"],
            });
        }
        var allExperiment = prettyConfig.experiments.find(function (experiment) {
            return experiment.id === "all";
        });
        if (allExperiment && !allExperiment.backends.includes("native-flat")) {
            var nativeIndex = allExperiment.backends.indexOf("native");
            allExperiment.backends.splice(
                nativeIndex < 0 ? allExperiment.backends.length : nativeIndex + 1,
                0,
                "native-flat",
            );
        }
    }

    /** @type {PrettyBackendDefinition} */
    var nativeFlatBackend = {
        id: "native-flat",
        label: "Native Flat",
        capabilities: {
            runtime: "fir-native",
            input: "browser-format",
            output: "text-events",
            width: "columns",
        },
        status: function () {
            return bridge.status || "unavailable";
        },
        renderTimed: function (fmtJson, _annotations, pixelWidth, measurer) {
            if (
                bridge.enabled === false ||
                bridge.status !== "ready" ||
                typeof bridge.formatSegments !== "function"
            ) {
                return { segments: null, timings: emptyPrettyTimings() };
            }
            try {
                var spaceWidth = measurer.spaceWidth > 0 ? measurer.spaceWidth : 1;
                var width = Math.max(1, Math.floor(pixelWidth / spaceWidth));
                if (typeof bridge.formatSegmentsTimed === "function") {
                    var result = bridge.formatSegmentsTimed(fmtJson, width, 0, 0);
                    return {
                        segments: result.segments,
                        timings: result.timings,
                        memory: result.memory,
                    };
                }
                var started = performance.now();
                var segments = bridge.formatSegments(fmtJson, width, 0, 0);
                var finished = performance.now();
                var timings = emptyPrettyTimings();
                timings.executeMs = finished - started;
                timings.totalMs = finished - started;
                return { segments: segments, timings: timings };
            } catch (error) {
                warnOnce("render", "Native-flat pretty-printer backend failed.", error);
                return { segments: null, timings: emptyPrettyTimings() };
            }
        },
    };
    registerPrettyBackend(nativeFlatBackend);

    if (bridge.enabled === false) return;

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;

    /** @param {string} path */
    function fromScript(path) {
        return new URL(path, scriptUrl).href;
    }

    /**
     * @param {string} key
     * @param {string} message
     * @param {*} error
     */
    function warnOnce(key, message, error) {
        var warnings = bridge.warnings || (bridge.warnings = {});
        if (warnings[key]) return;
        warnings[key] = true;
        console.warn(message, error);
    }

    /**
     * @param {*} adapter
     * @param {*} formatFactory
     * @return {(fmtJson: *, width: number, indent: number, column: number) => NativeFlatFormatResult}
     */
    function createNativeFlatClient(adapter, formatFactory) {
        return function (fmtJson, width, indent, column) {
            var started = performance.now();
            var format = compactFormatToAdapterInput(formatFactory, fmtJson);
            var inputAdapted = performance.now();
            var result = adapter.render({
                format: format,
                width: width,
                indent: indent,
                column: column,
            });
            var outputDecoded = performance.now();
            var segments = normalizeVirRendered(result.rendered);
            if (segments === null) {
                throw new Error("native-flat adapter returned invalid UTF-8 text/style events");
            }
            var finished = performance.now();
            var adapterInputMs = inputAdapted - started;
            var adapterOutputMs = finished - outputDecoded;
            bridge.lastMemory = result.memory;
            return {
                text: result.rendered.text,
                segments: segments,
                timings: {
                    marshalMs: adapterInputMs + result.timings.prepareMs,
                    executeMs: result.timings.executeMs,
                    decodeMs: result.timings.decodeMs + adapterOutputMs,
                    renderMs: 0,
                    totalMs: finished - started,
                    adapterInputMs: adapterInputMs,
                    adapterOutputMs: adapterOutputMs,
                    normalizeMs: result.timings.normalizeMs,
                    allocateMs: result.timings.allocateMs,
                    encodeMs: result.timings.encodeMs,
                    inputBytes: result.memory.inputBytes,
                    rawObjects: result.memory.rawObjects,
                    allocationCalls: result.memory.residentAllocationCalls,
                },
                memory: result.memory,
            };
        };
    }

    var adapterUrl =
        config.adapterUrl || fromScript("./lean-native-flat/prettyM-browser-adapter.mjs");
    var wasmUrl = config.wasmUrl || fromScript("./lean-native-flat/prettyM.wasm");
    var descriptorUrl = config.descriptorUrl || wasmUrl + ".json";
    var buildUrl = config.buildUrl || fromScript("./lean-native-flat/BUILD.json");
    var startupStarted = performance.now();
    var adapterImported = startupStarted;
    bridge.assets = [scriptUrl, adapterUrl, wasmUrl, descriptorUrl, buildUrl];

    /** @param {RequestInfo | URL} url */
    function fetchArtifact(url) {
        return fetch(url, { cache: config.fetchCache || "default" });
    }

    bridge.ready = import(adapterUrl)
        .then(function (adapterModule) {
            adapterImported = performance.now();
            if (
                adapterModule.PRETTY_M_BROWSER_API_VERSION !== "fir.prettyM.flat.browser/v1" ||
                typeof adapterModule.fetchPrettyMAdapter !== "function" ||
                !adapterModule.PrettyFormat
            ) {
                throw new Error("native-flat package does not export the required browser API");
            }
            return adapterModule
                .fetchPrettyMAdapter(wasmUrl, {
                    descriptorUrl: descriptorUrl,
                    buildUrl: buildUrl,
                    maximumNodes: config.maximumNodes,
                    fetchImpl: fetchArtifact,
                })
                .then(
                    /** @param {*} adapter */
                    function (adapter) {
                        return { adapter: adapter, formatFactory: adapterModule.PrettyFormat };
                    },
                );
        })
        .then(function (loaded) {
            var initialized = performance.now();
            bridge.adapter = loaded.adapter;
            bridge.build = loaded.adapter.build;
            bridge.startupTimings = Object.assign({}, loaded.adapter.startupTimings, {
                importMs: adapterImported - startupStarted,
                bridgeTotalMs: initialized - startupStarted,
            });
            bridge.formatSegmentsTimed = createNativeFlatClient(
                loaded.adapter,
                loaded.formatFactory,
            );
            bridge.formatSegments = function (fmtJson, width, indent, column) {
                if (!bridge.formatSegmentsTimed) {
                    throw new Error("native-flat timing client is unavailable");
                }
                return bridge.formatSegmentsTimed(fmtJson, width, indent, column).segments;
            };
            bridge.status = "ready";
            return loaded.adapter;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            warnOnce("load", "Native-flat pretty-printer bootstrap failed.", error);
            return null;
        });
    nativeFlatBackend.ready = bridge.ready;
})();
