// @ts-check

/* One embedded PrettyM program, initialized once and owned by this document. */
(function () {
    "use strict";
    var urls = window.__versoVirResourceUrls;
    var disposed = false;
    var pending = new AbortController();
    /** @type {VersoVirProgram | undefined} */
    var program;
    /** @type {HTMLElement | undefined} */
    var status;

    /** Diagnostics must not turn a handled failure into an unobserved rejection.
     * @param {string} label @param {unknown} value
     */
    function reportDiagnostic(label, value) {
        try { console.error(label, value); } catch (_) { /* Best-effort diagnostic sink. */ }
    }

    /** @param {unknown} error */
    function reportFailure(error) {
        reportDiagnostic("VIR initialization failed", error);
        try {
            // Preserve primary/context and raw secondary evidence even for an
            // obsolete page. Presence matters for nullish cause/cleanup values.
            if (error !== null && (typeof error === "object" || typeof error === "function")) {
                var evidence = /** @type {Record<string, unknown>} */ (error);
                if (Object.prototype.hasOwnProperty.call(error, "cause")) {
                    reportDiagnostic("VIR initialization cause", evidence.cause);
                }
                if (Object.prototype.hasOwnProperty.call(error, "cleanupError")) {
                    reportDiagnostic("VIR creation cleanup failed", evidence.cleanupError);
                }
            }
        } catch (diagnosticError) {
            reportDiagnostic("VIR diagnostic inspection failed", diagnosticError);
        }
    }

    /** @param {"loading" | "ready" | "failed" | "disposed"} state */
    function setState(state) {
        window.versoVirState = state;
        try {
            status?.remove();
            status = undefined;
            if (state === "loading" || state === "failed") {
                status = document.createElement("div");
                status.className = "vir-formatter-status";
                var message = document.createElement("p");
                message.setAttribute("role", state === "failed" ? "alert" : "status");
                message.textContent = state === "failed" ?
                    "Lean formatting is unavailable." : "Loading Lean formatting…";
                status.appendChild(message);
                document.body.appendChild(status);
            }
        } catch (reportingError) {
            reportDiagnostic("VIR failure presentation failed", reportingError);
        }
        try { window.dispatchEvent(new Event("verso-vir-statechange")); }
        catch (reportingError) { reportDiagnostic("VIR state notification failed", reportingError); }
    }

    function releaseProgram() {
        var previous = program;
        program = undefined;
        delete window.versoVir;
        delete window.versoVirFormatSegments;
        if (!previous) return;
        // Detach ownership before cleanup, including when cleanup throws.
        try { previous.dispose(); }
        catch (cleanupError) { reportDiagnostic("VIR program disposal failed", cleanupError); }
    }

    function closedError() {
        var error = new Error("Page closed before PrettyM was ready");
        error.name = "AbortError";
        return error;
    }

    /** @returns {Promise<VersoVirProgram>} */
    async function initialize() {
        var runtimeModuleUrl = new URL(urls.runtimeModule, document.baseURI);
        var runtimeManifestUrl = new URL(urls.runtimeManifest, document.baseURI);
        var programManifestUrl = new URL(urls.programManifest, document.baseURI);
        var loader = await import(runtimeModuleUrl.href);
        if (disposed) throw closedError();
        var created = await loader.createProgram({
            runtimeManifestUrl, programManifestUrl,
            expectedExports: window.__versoVirExpectedExports,
            signal: pending.signal
        });
        if (disposed) {
            var failure = closedError();
            try { created.dispose(); }
            catch (cleanupError) {
                Object.defineProperty(failure, "cleanupError", { value: cleanupError, enumerable: true });
            }
            throw failure;
        }
        program = created;
        window.versoVirFormatSegments = function (format, width, indent) {
            var active = program;
            if (!active) throw new Error("Lean formatting is unavailable");
            try { return formatCompactSegments(active, format, width, indent); }
            catch (error) {
                // Bounded expression errors keep the healthy instance.
                // Any unexpected failure closes formatting for this document.
                if (!(error instanceof PrettyFormatError) || active.status !== "active") {
                    reportDiagnostic("VIR formatting failed", error);
                    releaseProgram();
                    if (!disposed) setState("failed");
                }
                throw error;
            }
        };
        window.versoVir = program;
        setState("ready");
        return created;
    }

    window.addEventListener("pagehide", function (event) {
        if (event.persisted || disposed) return;
        disposed = true;
        if (!program) pending.abort();
        releaseProgram();
        setState("disposed");
    });
    var ready = initialize();
    window.versoVirReady = ready;
    ready.catch(function (error) {
        reportFailure(error);
        if (!disposed) setState("failed");
    });
    // Publish and observe readiness before listeners can close the document.
    setState("loading");
})();
