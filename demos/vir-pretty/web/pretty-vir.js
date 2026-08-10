// @ts-check
/* Pretty-printer API layered over the shared VIR browser loader. */
(function () {
    "use strict";

    var root = window;
    var config = root.__versoPrettyVirConfig || {};
    if (config.enabled === false) return;
    var existingBridge = root.__versoPrettyVir;
    if (!existingBridge || !existingBridge.ready) {
        throw new Error("pretty-vir.js requires vir-loader.js first");
    }
    var bridge = /** @type {VersoPrettyVirBridge} */ (existingBridge);
    var runtimeReady = /** @type {Promise<unknown>} */ (existingBridge.ready);

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

    bridge.ready = runtimeReady
        .then(function (runtimeValue) {
            if (!runtimeValue) return null;
            var runtime = /** @type {VersoPrettyVirRuntime} */ (runtimeValue);
            bridge.formatJsonSegmentsJson = function (fmtJson, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.jsonExportName),
                    fmtJson,
                    width,
                    indent,
                );
            };
            bridge.formatSegments = function (fmt, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.formatExportName),
                    fmt,
                    width,
                    indent,
                );
            };
            bridge.formatRendered = function (fmt, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.renderedExportName),
                    fmt,
                    width,
                    indent,
                );
            };
            bridge.formatRenderPlan = function (fmt, annotations, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.renderPlanExportName),
                    fmt,
                    annotations,
                    width,
                    indent,
                );
            };
            bridge.formatHtml = function (fmt, annotations, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.htmlExportName),
                    fmt,
                    annotations,
                    width,
                    indent,
                );
            };
            bridge.formatRenderedById = function (formatId, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.residentExportName),
                    formatId,
                    width,
                    indent,
                );
            };
            bridge.formatRenderPlanById = function (formatId, width, indent) {
                return runtime.call(
                    /** @type {string} */ (bridge.residentRenderPlanExportName),
                    formatId,
                    width,
                    indent,
                );
            };

            if (runtime.callTimed) {
                var callTimed = runtime.callTimed.bind(runtime);
                bridge.formatJsonSegmentsJsonTimed = function (fmtJson, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.jsonExportName),
                        fmtJson,
                        width,
                        indent,
                    );
                };
                bridge.formatSegmentsTimed = function (fmt, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.formatExportName),
                        fmt,
                        width,
                        indent,
                    );
                };
                bridge.formatRenderedTimed = function (fmt, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.renderedExportName),
                        fmt,
                        width,
                        indent,
                    );
                };
                bridge.formatRenderPlanTimed = function (fmt, annotations, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.renderPlanExportName),
                        fmt,
                        annotations,
                        width,
                        indent,
                    );
                };
                bridge.formatHtmlTimed = function (fmt, annotations, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.htmlExportName),
                        fmt,
                        annotations,
                        width,
                        indent,
                    );
                };
                bridge.formatRenderedByIdTimed = function (formatId, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.residentExportName),
                        formatId,
                        width,
                        indent,
                    );
                };
                bridge.formatRenderPlanByIdTimed = function (formatId, width, indent) {
                    return callTimed(
                        /** @type {string} */ (bridge.residentRenderPlanExportName),
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
            console.warn("VIR pretty-printer API failed.", error);
            return null;
        });

    if (typeof getPrettyBackend === "function") {
        [
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
    }
})();
