// @ts-check
/* Optional lean-vir bootstrap for the pretty-printer prototype. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   enabled?: boolean,
     *   compare?: boolean,
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
     *   compare?: boolean,
     *   runtime?: { call: (name: string, ...args: *[]) => * },
     *   jsonExportName?: string,
     *   formatExportName?: string,
     *   formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string,
     *   formatSegments?: (fmt: *, width: number, indent: number) => *,
     *   ready?: Promise<*>,
     *   status?: string,
     *   error?: *,
     *   warned?: boolean
     * }} PrettyVirBridge
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

    var bridge = root.__versoPrettyVir || {};
    bridge.enabled = true;
    bridge.compare = config.compare === true || bridge.compare === true;
    bridge.status = "loading";
    bridge.jsonExportName =
        config.jsonExportName ||
        bridge.jsonExportName ||
        "VersoSlides.Pretty.formatJsonSegmentsJsonForVir";
    bridge.formatExportName =
        config.formatExportName ||
        bridge.formatExportName ||
        "VersoSlides.Pretty.formatSegmentsForVir";
    root.__versoPrettyVir = bridge;

    bridge.ready = import(config.runtimeUrl || fromScript("./lean-vir/js/vir-runtime.js"))
        .then(function (runtimeModule) {
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
            return runtimeModule.createVirRuntime({
                wasmUrl: config.wasmUrl || fromScript("./lean-vir/wasm/vir-upstream.wasm"),
                wasmDebugUrl: config.wasmDebugUrl,
                debugWasm: config.debugWasm === true,
                irPackageUrl: config.irPackageUrl || fromScript("./verso-pretty.irpkg"),
                fetchBytes: fetchBytes,
            });
        })
        .then(function (runtime) {
            bridge.runtime = runtime;
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
            return runtime;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            console.warn("VIR pretty-printer bootstrap failed.", error);
            return null;
        });
})();
