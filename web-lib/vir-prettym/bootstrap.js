// @ts-check

/* One embedded PrettyM program per attempt, owned by this page. */
(function () {
    "use strict";
    var urls = window.__versoVirResourceUrls;
    var disposed = false;
    /** @type {{pending: AbortController, program?: VersoVirProgram} | undefined} */
    var current;
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
                    "Lean formatting could not be initialized." : "Loading Lean formatting…";
                status.appendChild(message);
                if (state === "failed") {
                    var retry = document.createElement("button");
                    retry.type = "button";
                    retry.textContent = "Retry Lean formatting";
                    // Each promise is already observed by startAttempt. Retry
                    // reacquires a program; it never replays runtime calls.
                    retry.addEventListener("click", function () { startAttempt(); });
                    status.appendChild(retry);
                }
                document.body.appendChild(status);
            }
        } catch (reportingError) {
            reportDiagnostic("VIR failure presentation failed", reportingError);
        }
        try { window.dispatchEvent(new Event("verso-vir-statechange")); }
        catch (reportingError) { reportDiagnostic("VIR state notification failed", reportingError); }
    }

    function releaseCurrent() {
        var previous = current;
        current = undefined;
        delete window.versoVir;
        delete window.versoVirFormatSegments;
        if (!previous) return;
        // Detach ownership before cleanup, including when cleanup throws.
        if (previous.program) {
            try { previous.program.dispose(); }
            catch (cleanupError) { reportDiagnostic("VIR program disposal failed", cleanupError); }
        } else {
            previous.pending.abort();
        }
    }

    function obsoleteError() {
        var error = new Error(disposed ? "Page closed before PrettyM was ready" :
            "PrettyM initialization superseded by a newer attempt");
        error.name = "AbortError";
        return error;
    }

    /** @returns {Promise<VersoVirProgram>} */
    function startAttempt() {
        if (disposed) return window.versoVirReady;
        releaseCurrent();
        var attempt = {pending: new AbortController(), program: /** @type {VersoVirProgram | undefined} */ (undefined)};
        current = attempt;
        var ready = (async function () {
            var runtimeModuleUrl = new URL(urls.runtimeModule, document.baseURI);
            var runtimeManifestUrl = new URL(urls.runtimeManifest, document.baseURI);
            var programManifestUrl = new URL(urls.programManifest, document.baseURI);
            var loader = await import(runtimeModuleUrl.href);
            if (current !== attempt) throw obsoleteError();
            var program = await loader.createProgram({
                runtimeManifestUrl, programManifestUrl,
                expectedExports: window.__versoVirExpectedExports,
                signal: attempt.pending.signal
            });
            if (current !== attempt) {
                var failure = obsoleteError();
                try { program.dispose(); }
                catch (cleanupError) {
                    Object.defineProperty(failure, "cleanupError", { value: cleanupError, enumerable: true });
                }
                throw failure;
            }
            attempt.program = program;
            window.versoVirFormatSegments = function (format, width, indent) {
                return formatCompactSegments(program, format, width, indent);
            };
            window.versoVir = program;
            setState("ready");
            return program;
        })();
        window.versoVirReady = ready;
        ready.catch(function (error) {
            reportFailure(error);
            if (current === attempt) setState("failed");
        });
        // Listeners can synchronously retry or close the page. Publish and
        // observe this attempt before notification; do not overwrite a nested
        // attempt's promise when its notification returns.
        setState("loading");
        return ready;
    }

    window.addEventListener("pagehide", function (event) {
        if (event.persisted || disposed) return;
        disposed = true;
        releaseCurrent();
        setState("disposed");
    });
    window.versoVirRetry = startAttempt;
    startAttempt();
})();
