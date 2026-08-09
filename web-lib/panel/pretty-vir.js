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
     *   formatExportName?: string,
     *   renderedExportName?: string,
     *   renderPlanExportName?: string,
     *   htmlExportName?: string,
     *   residentExportName?: string,
     *   residentRenderPlanExportName?: string
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
     *   renderedExportName?: string,
     *   renderPlanExportName?: string,
     *   htmlExportName?: string,
     *   residentExportName?: string,
     *   residentRenderPlanExportName?: string,
     *   formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string,
     *   formatSegments?: (fmt: *, width: number, indent: number) => *,
     *   formatRendered?: (fmt: *, width: number, indent: number) => *,
     *   formatRenderPlan?: (fmt: *, annotations: Array<*>, width: number, indent: number) => *,
     *   formatHtml?: (fmt: *, annotations: Array<*>, width: number, indent: number) => string,
     *   formatRenderedById?: (formatId: number, width: number, indent: number) => *,
     *   formatRenderPlanById?: (formatId: number, width: number, indent: number) => *,
     *   formatJsonSegmentsJsonTimed?: (fmtJson: string, width: number, indent: number) => VirTimedCallResult,
     *   formatSegmentsTimed?: (fmt: *, width: number, indent: number) => VirTimedCallResult,
     *   formatRenderedTimed?: (fmt: *, width: number, indent: number) => VirTimedCallResult,
     *   formatRenderPlanTimed?: (fmt: *, annotations: Array<*>, width: number, indent: number) => VirTimedCallResult,
     *   formatHtmlTimed?: (fmt: *, annotations: Array<*>, width: number, indent: number) => VirTimedCallResult,
     *   formatRenderedByIdTimed?: (formatId: number, width: number, indent: number) => VirTimedCallResult,
     *   formatRenderPlanByIdTimed?: (formatId: number, width: number, indent: number) => VirTimedCallResult,
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
    bridge.renderedExportName =
        config.renderedExportName ||
        bridge.renderedExportName ||
        "VersoSlides.Pretty.formatRenderedForVir";
    bridge.renderPlanExportName =
        config.renderPlanExportName ||
        bridge.renderPlanExportName ||
        "VersoSlides.Pretty.formatRenderPlanForVir";
    bridge.htmlExportName =
        config.htmlExportName || bridge.htmlExportName || "VersoSlides.Pretty.formatHtmlForVir";
    bridge.residentExportName =
        config.residentExportName ||
        bridge.residentExportName ||
        "VersoSlides.PrettyRegistry.formatRenderedByIdForVir";
    bridge.residentRenderPlanExportName =
        config.residentRenderPlanExportName ||
        bridge.residentRenderPlanExportName ||
        "VersoSlides.PrettyRegistry.formatRenderPlanByIdForVir";
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
            bridge.formatRendered = function (fmt, width, indent) {
                if (!bridge.renderedExportName)
                    throw new Error("missing VIR flat pretty export name");
                return runtime.call(bridge.renderedExportName, fmt, width, indent);
            };
            bridge.formatRenderPlan = function (fmt, annotations, width, indent) {
                if (!bridge.renderPlanExportName)
                    throw new Error("missing VIR semantic render-plan export name");
                return runtime.call(bridge.renderPlanExportName, fmt, annotations, width, indent);
            };
            bridge.formatHtml = function (fmt, annotations, width, indent) {
                if (!bridge.htmlExportName)
                    throw new Error("missing VIR complete HTML export name");
                return runtime.call(bridge.htmlExportName, fmt, annotations, width, indent);
            };
            bridge.formatRenderedById = function (formatId, width, indent) {
                if (!bridge.residentExportName)
                    throw new Error("missing VIR resident pretty export name");
                return runtime.call(bridge.residentExportName, formatId, width, indent);
            };
            bridge.formatRenderPlanById = function (formatId, width, indent) {
                if (!bridge.residentRenderPlanExportName)
                    throw new Error("missing VIR resident render-plan export name");
                return runtime.call(bridge.residentRenderPlanExportName, formatId, width, indent);
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
                bridge.formatRenderedTimed = function (fmt, width, indent) {
                    if (!bridge.renderedExportName)
                        throw new Error("missing VIR flat pretty export name");
                    return runtime.callTimed(bridge.renderedExportName, fmt, width, indent);
                };
                bridge.formatRenderPlanTimed = function (fmt, annotations, width, indent) {
                    if (!bridge.renderPlanExportName)
                        throw new Error("missing VIR semantic render-plan export name");
                    return runtime.callTimed(
                        bridge.renderPlanExportName,
                        fmt,
                        annotations,
                        width,
                        indent,
                    );
                };
                bridge.formatHtmlTimed = function (fmt, annotations, width, indent) {
                    if (!bridge.htmlExportName)
                        throw new Error("missing VIR complete HTML export name");
                    return runtime.callTimed(
                        bridge.htmlExportName,
                        fmt,
                        annotations,
                        width,
                        indent,
                    );
                };
                bridge.formatRenderedByIdTimed = function (formatId, width, indent) {
                    if (!bridge.residentExportName)
                        throw new Error("missing VIR resident pretty export name");
                    return runtime.callTimed(bridge.residentExportName, formatId, width, indent);
                };
                bridge.formatRenderPlanByIdTimed = function (formatId, width, indent) {
                    if (!bridge.residentRenderPlanExportName)
                        throw new Error("missing VIR resident render-plan export name");
                    return runtime.callTimed(
                        bridge.residentRenderPlanExportName,
                        formatId,
                        width,
                        indent,
                    );
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
    [
        "vir",
        "vir-format",
        "vir-semantic",
        "vir-html",
        "vir-flat",
        "vir-resident",
        "vir-render",
        "vir-dom",
    ].forEach(function (id) {
        var backend = getPrettyBackend(id);
        if (backend) backend.ready = bridge.ready;
    });
})();
