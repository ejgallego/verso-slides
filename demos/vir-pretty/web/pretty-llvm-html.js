// @ts-check
/* LLVM/Emscripten Wasm backend for complete escaped HTML. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   enabled?: boolean,
     *   adapterUrl?: string,
     *   manifestUrl?: string,
     *   maximumNodes?: number,
     *   maximumBytes?: number
     * }} PrettyLlvmHtmlConfig
     * @typedef {{
     *   enabled?: boolean,
     *   status?: string,
     *   ready?: Promise<*>,
     *   error?: *,
     *   manifest?: *,
     *   adapter?: *,
     *   lastMemory?: Record<string, number>,
     *   startupTimings?: *,
     *   assets?: string[],
     *   dispose?: () => void,
     *   formatHtmlTimed?: (
     *     fmtJson: *,
     *     annotations: Record<string, TokenAnnotation>,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => { html: string, timings: PrettyTimings, memory?: Record<string, number> }
     * }} PrettyLlvmHtmlBridge
     */

    var root = /** @type {Window & {
        __versoPrettyLlvmHtmlConfig?: PrettyLlvmHtmlConfig,
        __versoPrettyLlvmHtml?: PrettyLlvmHtmlBridge
    }} */ (window);
    if (!root.__versoPrettyLlvmHtmlConfig) return;

    var config = root.__versoPrettyLlvmHtmlConfig;
    var bridge = root.__versoPrettyLlvmHtml || {};
    bridge.enabled = config.enabled !== false;
    bridge.status = bridge.enabled ? "loading" : "disabled";
    root.__versoPrettyLlvmHtml = bridge;

    var prettyConfig = root.__versoPrettyConfig;
    if (prettyConfig && Array.isArray(prettyConfig.experiments)) {
        var allExperiment = prettyConfig.experiments.find(function (experiment) {
            return experiment.id === "all";
        });
        if (allExperiment && !allExperiment.backends.includes("llvm-html")) {
            var llvmIndex = allExperiment.backends.indexOf("llvm");
            allExperiment.backends.splice(
                llvmIndex < 0 ? allExperiment.backends.length : llvmIndex + 1,
                0,
                "llvm-html",
            );
        }
    }

    /** @type {PrettyBackendDefinition} */
    var backend = {
        id: "llvm-html",
        label: "LLVM Wasm HTML",
        capabilities: {
            runtime: "llvm-emscripten",
            input: "browser-format",
            output: "html",
            width: "columns",
            materializer: "html-string",
            matrix: { backend: "llvm", breadth: "html" },
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
                var result = bridge.formatHtmlTimed(
                    fmtJson,
                    annotations,
                    pixelWidthToFormatColumns(pixelWidth, measurer),
                    0,
                    0,
                );
                return {
                    segments: null,
                    html: result.html,
                    timings: result.timings,
                    memory: result.memory,
                };
            } catch (error) {
                console.warn("LLVM Wasm HTML pretty-printer backend failed.", error);
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
        config.adapterUrl || fromScript("./lean-llvm-html/prettyM-html-emscripten-adapter.mjs");
    var manifestUrl =
        config.manifestUrl || fromScript("./lean-llvm-html/prettyM-html.manifest.json");
    var artifactBaseUrl = new URL(".", manifestUrl);
    var startupStarted = performance.now();
    var adapterImported = startupStarted;
    bridge.assets = [scriptUrl, adapterUrl, manifestUrl];

    bridge.ready = Promise.resolve()
        .then(function () {
            if (!globalThis.crossOriginIsolated) {
                throw new Error("LLVM prettyM HTML requires a cross-origin-isolated page");
            }
            return import(adapterUrl);
        })
        .then(function (adapterModule) {
            adapterImported = performance.now();
            if (
                adapterModule.PRETTY_M_BROWSER_API_VERSION !==
                    "fir.prettyM.html.emscripten.browser/v1" ||
                adapterModule.PRETTY_M_INPUT_LAYOUT_VERSION !== "lean-4.32-Std.Format.compact/v1" ||
                adapterModule.PRETTY_M_OUTPUT_VERSION !== "verso-token-html/v1" ||
                typeof adapterModule.loadEmscriptenPrettyMHtmlAdapter !== "function" ||
                !adapterModule.PrettyFormat
            ) {
                throw new Error("LLVM HTML package does not export the required browser API");
            }
            return adapterModule
                .loadEmscriptenPrettyMHtmlAdapter(manifestUrl, {
                    maximumNodes: config.maximumNodes,
                    maximumBytes: config.maximumBytes,
                })
                .then(
                    /** @param {*} adapter */ function (adapter) {
                        return { adapter: adapter, formatFactory: adapterModule.PrettyFormat };
                    },
                );
        })
        .then(function (loaded) {
            var initialized = performance.now();
            bridge.adapter = loaded.adapter;
            bridge.manifest = loaded.adapter.loaded.manifest;
            var artifacts = bridge.manifest.artifacts || {};
            bridge.assets = [
                scriptUrl,
                adapterUrl,
                new URL("prettyM-emscripten-adapter.mjs", adapterUrl).href,
                new URL("emscripten-loader.mjs", adapterUrl).href,
                manifestUrl,
                artifacts.module && artifacts.module.file
                    ? new URL(artifacts.module.file, artifactBaseUrl).href
                    : new URL("prettyM-html.mjs", artifactBaseUrl).href,
                artifacts.wasm && artifacts.wasm.file
                    ? new URL(artifacts.wasm.file, artifactBaseUrl).href
                    : new URL("prettyM-html.wasm", artifactBaseUrl).href,
            ];
            bridge.startupTimings = {
                importMs: adapterImported - startupStarted,
                loadMs: initialized - adapterImported,
                totalMs: initialized - startupStarted,
            };
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
                    throw new Error("LLVM HTML adapter returned invalid HTML");
                }
                bridge.lastMemory = result.memory;
                return {
                    html: result.html,
                    timings: {
                        marshalMs: inputAdapted - started + result.timings.encodeMs,
                        executeMs: result.timings.executeMs,
                        decodeMs: result.timings.decodeMs,
                        renderMs: 0,
                        totalMs: finished - started,
                        adapterInputMs: inputAdapted - started,
                        encodeMs: result.timings.encodeMs,
                        requestBytes: result.memory.requestBytes,
                        responseBytes: result.memory.responseBytes,
                        formatNodes: result.memory.formatNodes,
                        annotationEntries: result.memory.annotationEntries,
                        heapBytesBefore: result.memory.heapBytesBefore,
                        heapBytesAfter: result.memory.heapBytesAfter,
                    },
                    memory: result.memory,
                };
            };
            bridge.dispose = function () {
                loaded.adapter.dispose();
            };
            window.addEventListener("pagehide", bridge.dispose, { once: true });
            bridge.status = "ready";
            return loaded.adapter;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            console.warn("LLVM Wasm HTML pretty-printer bootstrap failed.", error);
            return null;
        });
    backend.ready = bridge.ready;
})();
