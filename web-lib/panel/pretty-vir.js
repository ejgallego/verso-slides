// @ts-check
/* Optional lean-vir bootstrap for the pretty-printer prototype. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   enabled?: boolean,
     *   runtimeUrl?: string,
     *   wasmUrl?: string,
     *   wasmDebugUrl?: string,
     *   debugWasm?: boolean,
     *   fetchCache?: RequestCache,
     *   irPackageUrl?: string,
     *   jsonExportName?: string,
     *   formatExportName?: string
     * }} PrettyVirConfig
     *
     * @typedef {{
     *   enabled?: boolean,
     *   runtime?: {
     *     call: (name: string, ...args: *[]) => *,
     *     callTimed?: (name: string, ...args: *[]) => VirTimedCallResult
     *   },
     *   jsonExportName?: string,
     *   formatExportName?: string,
     *   formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string,
     *   formatSegments?: (fmt: *, width: number, indent: number) => *,
     *   formatJsonSegmentsJsonTimed?: (fmtJson: string, width: number, indent: number) => VirTimedCallResult,
     *   formatSegmentsTimed?: (fmt: *, width: number, indent: number) => VirTimedCallResult,
     *   ready?: Promise<*>,
     *   status?: string,
     *   error?: *,
     *   assets?: string[],
     *   startupTimings?: { importMs: number, initializeMs: number, totalMs: number },
     *   warnings?: Record<string, boolean>
     * }} PrettyVirBridge
     *
     * @typedef {{
     *   marshalMs: number,
     *   executeMs: number,
     *   decodeMs: number,
     *   hostMs: number,
     *   totalMs: number
     * }} VirCallTimings
     *
     * @typedef {{ value: *, timings: VirCallTimings }} VirTimedCallResult
     */

    var root = /** @type {Window & {
        __versoPrettyVirConfig?: PrettyVirConfig,
        __versoPrettyVir?: PrettyVirBridge
    }} */ (window);

    var config = root.__versoPrettyVirConfig || {};
    if (config.enabled === false) return;

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;

    /** @param {string} path */
    function fromScript(path) {
        return new URL(path, scriptUrl).href;
    }

    var startupStarted = performance.now();
    var runtimeImported = startupStarted;
    var runtimeUrl = config.runtimeUrl || fromScript("./lean-vir/js/vir-runtime.js");
    var wasmUrl = config.wasmUrl || fromScript("./lean-vir/wasm/vir-upstream.wasm");
    var irPackageUrl = config.irPackageUrl || fromScript("./verso-pretty.irpkg");

    var bridge = root.__versoPrettyVir || {};
    bridge.enabled = true;
    bridge.status = "loading";
    bridge.jsonExportName =
        config.jsonExportName ||
        bridge.jsonExportName ||
        "VersoSlides.Pretty.formatJsonSegmentsJsonForVir";
    bridge.formatExportName =
        config.formatExportName ||
        bridge.formatExportName ||
        "VersoSlides.Pretty.formatSegmentsForVir";
    bridge.assets = [scriptUrl, runtimeUrl, wasmUrl, irPackageUrl];
    root.__versoPrettyVir = bridge;

    bridge.ready = import(runtimeUrl)
        .then(function (runtimeModule) {
            runtimeImported = performance.now();
            if (typeof runtimeModule.createVirRuntime !== "function") {
                throw new Error("lean-vir runtime module does not export createVirRuntime");
            }
            var fetchCache = config.fetchCache || "default";
            /** @param {string | URL} path */
            function fetchBytes(path) {
                if (typeof runtimeModule.fetchBytes === "function") {
                    return runtimeModule.fetchBytes(path, { cache: fetchCache });
                }
                return fetch(path, { cache: fetchCache }).then(function (response) {
                    if (!response.ok) throw new Error("failed to load " + path);
                    return response.arrayBuffer();
                });
            }
            /** @type {Record<string, *>} */
            var runtimeOptions = {
                wasmUrl: wasmUrl,
                wasmDebugUrl: config.wasmDebugUrl,
                debugWasm: config.debugWasm === true,
                fetchBytes: fetchBytes,
            };
            if (typeof runtimeModule.IR_PACKAGE_SET_FORMAT === "string") {
                return fetchBytes(irPackageUrl).then(
                    function (/** @type {ArrayBuffer | Uint8Array} */ packageBytes) {
                        runtimeOptions.irPackageSetBytes = [packageBytes];
                        return runtimeModule.createVirRuntime(runtimeOptions);
                    },
                );
            }
            runtimeOptions.irPackageUrl = irPackageUrl;
            return runtimeModule.createVirRuntime(runtimeOptions);
        })
        .then(function (runtime) {
            var initialized = performance.now();
            bridge.runtime = runtime;
            bridge.startupTimings = {
                importMs: runtimeImported - startupStarted,
                initializeMs: initialized - runtimeImported,
                totalMs: initialized - startupStarted,
            };
            bridge.status = "ready";
            bridge.formatJsonSegmentsJson = function (fmtJson, width, indent) {
                if (!bridge.jsonExportName) throw new Error("missing VIR JSON pretty export name");
                return runtime.call(bridge.jsonExportName, fmtJson, width, indent);
            };
            bridge.formatSegments = function (fmt, width, indent) {
                if (!bridge.formatExportName)
                    throw new Error("missing VIR Std.Format pretty export name");
                return runtime.call(bridge.formatExportName, fmt, width, indent);
            };
            if (typeof runtime.callTimed === "function") {
                bridge.formatJsonSegmentsJsonTimed = function (fmtJson, width, indent) {
                    if (!bridge.jsonExportName)
                        throw new Error("missing VIR JSON pretty export name");
                    return runtime.callTimed(bridge.jsonExportName, fmtJson, width, indent);
                };
                bridge.formatSegmentsTimed = function (fmt, width, indent) {
                    if (!bridge.formatExportName)
                        throw new Error("missing VIR Std.Format pretty export name");
                    return runtime.callTimed(bridge.formatExportName, fmt, width, indent);
                };
            }
            return runtime;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            console.warn("VIR pretty-printer bootstrap failed.", error);
            return null;
        });
    ["vir", "vir-format"].forEach(function (id) {
        var backend = getPrettyBackend(id);
        if (backend) backend.ready = bridge.ready;
    });
})();
