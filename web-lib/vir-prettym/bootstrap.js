// @ts-check

/* One embedded PrettyM program and one page-owned lifetime. */
(function () {
    "use strict";
    var urls = window.__versoVirResourceUrls;
    var disposed = false;
    var pending = new AbortController();

    /** Diagnostics must not turn a handled failure into an unobserved rejection.
     * @param {string} label @param {unknown} value
     */
    function reportDiagnostic(label, value) {
        try { console.error(label, value); } catch (_) { /* Best-effort diagnostic sink. */ }
    }

    window.addEventListener("pagehide", function (event) {
        if (event.persisted) return;
        disposed = true;
        pending.abort();
        window.versoVir?.dispose();
    });

    window.versoVirReady = (async function () {
        var runtimeModuleUrl = new URL(urls.runtimeModule, document.baseURI);
        var runtimeManifestUrl = new URL(urls.runtimeManifest, document.baseURI);
        var programManifestUrl = new URL(urls.programManifest, document.baseURI);
        var loader = await import(runtimeModuleUrl.href);
        var program = await loader.createProgram({
            runtimeManifestUrl, programManifestUrl,
            expectedExports: window.__versoVirExpectedExports,
            signal: pending.signal
        });
        if (disposed) {
            var failure = new Error("Page closed before PrettyM was ready");
            try { program.dispose(); }
            catch (cleanupError) {
                Object.defineProperty(failure, "cleanupError", { value: cleanupError, enumerable: true });
            }
            throw failure;
        }
        window.versoVirFormatSegments = function (format, width, indent) {
            return formatCompactSegments(program, format, width, indent);
        };
        window.versoVir = program;
        return program;
    })();
    window.versoVirReady.catch(function (error) {
        reportDiagnostic("VIR initialization failed", error);
        try {
            // Preserve primary/context and raw secondary evidence even for an
            // obsolete page. Presence matters for nullish cause/cleanup values.
            if (error !== null && (typeof error === "object" || typeof error === "function")) {
                if (Object.prototype.hasOwnProperty.call(error, "cause")) {
                    reportDiagnostic("VIR initialization cause", error.cause);
                }
                if (Object.prototype.hasOwnProperty.call(error, "cleanupError")) {
                    reportDiagnostic("VIR creation cleanup failed", error.cleanupError);
                }
            }
        } catch (diagnosticError) {
            reportDiagnostic("VIR diagnostic inspection failed", diagnosticError);
        }
        if (disposed) return;
        try {
            var message = document.createElement("p");
            message.setAttribute("role", "alert");
            message.textContent = "Lean formatting could not be initialized.";
            document.body.appendChild(message);
        } catch (reportingError) {
            reportDiagnostic("VIR failure presentation failed", reportingError);
        }
    });
})();
