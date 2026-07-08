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
     *   irPackageUrl?: string,
     *   exportName?: string,
     *   objectExportName?: string
     * }} PrettyVirConfig
     *
     * @typedef {{
     *   enabled?: boolean,
     *   compare?: boolean,
     *   runtime?: { call: (name: string, ...args: *[]) => * },
     *   exportName?: string,
     *   objectExportName?: string,
     *   formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string,
     *   formatCompatSegments?: (fmt: *, width: number, indent: number) => *,
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
    bridge.exportName =
        config.exportName || bridge.exportName || "VersoSlides.Pretty.formatJsonSegmentsJsonForVir";
    bridge.objectExportName =
        config.objectExportName ||
        bridge.objectExportName ||
        "VersoSlides.Pretty.formatCompatSegmentsForVir";
    root.__versoPrettyVir = bridge;

    bridge.ready = import(config.runtimeUrl || fromScript("./lean-vir/js/vir-runtime.js"))
        .then(function (runtimeModule) {
            if (typeof runtimeModule.createVirRuntime !== "function") {
                throw new Error("lean-vir runtime module does not export createVirRuntime");
            }
            return runtimeModule.createVirRuntime({
                wasmUrl: config.wasmUrl || fromScript("./lean-vir/wasm/vir-upstream.wasm"),
                wasmDebugUrl: config.wasmDebugUrl,
                debugWasm: config.debugWasm === true,
                irPackageUrl: config.irPackageUrl || fromScript("./verso-pretty.irpkg"),
            });
        })
        .then(function (runtime) {
            bridge.runtime = runtime;
            bridge.status = "ready";
            bridge.formatJsonSegmentsJson = function (fmtJson, width, indent) {
                if (!bridge.exportName) throw new Error("missing VIR pretty export name");
                return runtime.call(bridge.exportName, fmtJson, width, indent);
            };
            bridge.formatCompatSegments = function (fmt, width, indent) {
                if (!bridge.objectExportName)
                    throw new Error("missing VIR object pretty export name");
                return runtime.call(bridge.objectExportName, fmt, width, indent);
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
