// @ts-check
/* Optional FIR native Wasm backend that returns complete escaped HTML. */
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
     * }} PrettyNativeHtmlConfig
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
     *   formatHtmlTimed?: (
     *     fmtJson: *,
     *     annotations: Record<string, TokenAnnotation>,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => { html: string, timings: PrettyTimings, memory?: Record<string, number> },
     *   warnings?: Record<string, boolean>
     * }} PrettyNativeHtmlBridge
     */

    var root = /** @type {Window & {
        __versoPrettyNativeHtmlConfig?: PrettyNativeHtmlConfig,
        __versoPrettyNativeHtml?: PrettyNativeHtmlBridge
    }} */ (window);
    if (!root.__versoPrettyNativeHtmlConfig) return;

    var config = root.__versoPrettyNativeHtmlConfig;
    var bridge = root.__versoPrettyNativeHtml || {};
    bridge.enabled = config.enabled !== false;
    bridge.status = bridge.enabled ? "loading" : "disabled";
    root.__versoPrettyNativeHtml = bridge;

    var prettyConfig = root.__versoPrettyConfig;
    if (prettyConfig && Array.isArray(prettyConfig.experiments)) {
        var allExperiment = prettyConfig.experiments.find(function (experiment) {
            return experiment.id === "all";
        });
        if (allExperiment && !allExperiment.backends.includes("native-html")) {
            var nativeIndex = allExperiment.backends.indexOf("native");
            allExperiment.backends.splice(
                nativeIndex < 0 ? allExperiment.backends.length : nativeIndex + 1,
                0,
                "native-html",
            );
        }
    }

    /** @param {string} key @param {string} message @param {*} error */
    function warnOnce(key, message, error) {
        var warnings = bridge.warnings || (bridge.warnings = {});
        if (warnings[key]) return;
        warnings[key] = true;
        console.warn(message, error);
    }

    /** @type {PrettyBackendDefinition} */
    var backend = {
        id: "native-html",
        label: "FIR Wasm HTML",
        capabilities: {
            runtime: "fir-native",
            input: "browser-format",
            output: "html",
            width: "columns",
            materializer: "html-string",
            matrix: { backend: "fir", breadth: "html" },
        },
        status: function () {
            return bridge.status || "unavailable";
        },
        renderTimed: function (fmtJson, annotations, pixelWidth, measurer) {
            if (
                bridge.enabled === false ||
                bridge.status !== "ready" ||
                typeof bridge.formatHtmlTimed !== "function"
            ) {
                return { segments: null, html: null, timings: emptyPrettyTimings() };
            }
            try {
                var width = pixelWidthToFormatColumns(pixelWidth, measurer);
                var result = bridge.formatHtmlTimed(fmtJson, annotations, width, 0, 0);
                return {
                    segments: null,
                    html: result.html,
                    timings: result.timings,
                    memory: result.memory,
                };
            } catch (error) {
                warnOnce("render", "FIR Wasm HTML pretty-printer backend failed.", error);
                return { segments: null, html: null, timings: emptyPrettyTimings() };
            }
        },
    };
    registerPrettyBackend(backend);
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
    var adapterUrl =
        config.adapterUrl || fromScript("./lean-native-html/prettyM-browser-adapter.mjs");
    var wasmUrl = config.wasmUrl || fromScript("./lean-native-html/prettyM.wasm");
    var descriptorUrl = config.descriptorUrl || wasmUrl + ".json";
    var buildUrl = config.buildUrl || fromScript("./lean-native-html/BUILD.json");
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
                adapterModule.PRETTY_M_BROWSER_API_VERSION !== "fir.prettyM.html.browser/v1" ||
                typeof adapterModule.fetchPrettyMAdapter !== "function" ||
                !adapterModule.PrettyFormat
            ) {
                throw new Error("native-html package does not export the required browser API");
            }
            return adapterModule
                .fetchPrettyMAdapter(wasmUrl, {
                    descriptorUrl: descriptorUrl,
                    buildUrl: buildUrl,
                    maximumNodes: config.maximumNodes,
                    fetchImpl: fetchArtifact,
                })
                .then(/** @param {*} adapter */ function (adapter) {
                    return { adapter: adapter, formatFactory: adapterModule.PrettyFormat };
                });
        })
        .then(function (loaded) {
            var initialized = performance.now();
            bridge.adapter = loaded.adapter;
            bridge.build = loaded.adapter.build;
            bridge.startupTimings = Object.assign({}, loaded.adapter.startupTimings, {
                importMs: adapterImported - startupStarted,
                bridgeTotalMs: initialized - startupStarted,
            });
            bridge.formatHtmlTimed = function (fmtJson, annotations, width, indent, column) {
                var started = performance.now();
                var format = compactFormatToAdapterInput(loaded.formatFactory, fmtJson);
                var tagged = taggedAnnotationsForRuntime(annotations);
                var inputAdapted = performance.now();
                var result = loaded.adapter.render({
                    format: format,
                    annotations: tagged,
                    width: width,
                    indent: indent,
                    column: column,
                });
                var finished = performance.now();
                if (!result || typeof result.html !== "string") {
                    throw new Error("native-html adapter returned invalid HTML");
                }
                var memory = result.memory || {};
                var timings = result.timings || {};
                bridge.lastMemory = memory;
                return {
                    html: result.html,
                    timings: {
                        marshalMs: inputAdapted - started + Number(timings.prepareMs || 0),
                        executeMs: Number(timings.executeMs || 0),
                        decodeMs: Number(timings.decodeMs || 0),
                        renderMs: 0,
                        totalMs: finished - started,
                        adapterInputMs: inputAdapted - started,
                        normalizeMs: Number(timings.normalizeMs || 0),
                        allocateMs: Number(timings.allocateMs || 0),
                        encodeMs: Number(timings.encodeMs || 0),
                        inputBytes: Number(memory.inputBytes || 0),
                        rawObjects: Number(memory.rawObjects || 0),
                        allocationCalls: Number(memory.residentAllocationCalls || 0),
                    },
                    memory: memory,
                };
            };
            bridge.status = "ready";
            return loaded.adapter;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            warnOnce("load", "FIR Wasm HTML pretty-printer bootstrap failed.", error);
            return null;
        });
    backend.ready = bridge.ready;
})();
