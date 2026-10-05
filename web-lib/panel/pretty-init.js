// @ts-check

/* One Lean formatter, initialized once and owned by this document. */
(function () {
    "use strict";
    const script = /** @type {HTMLScriptElement} */ (document.currentScript);
    const urls =
        /** @type {{runtimeModule: string, runtimeManifest: string, programManifest: string}} */ (
            script.dataset
        );
    const pending = new AbortController();
    let disposed = false;
    /** @type {VersoVirProgram | undefined} */
    let program;
    /** @type {HTMLElement | undefined} */
    let status;

    /** @param {string} label @param {unknown} value */
    function report(label, value) {
        try {
            console.error(label, value);
        } catch (_) {
            /* A diagnostic sink must not reject readiness. */
        }
    }

    /** @param {unknown} error */
    function reportFailure(error) {
        report("VIR initialization failed", error);
        if (error == null) return;
        try {
            const evidence = /** @type {Record<string, unknown>} */ (error);
            for (const [key, label] of [
                ["cause", "VIR initialization cause"],
                ["cleanupError", "VIR creation cleanup failed"],
            ]) {
                if (Object.prototype.hasOwnProperty.call(error, key)) report(label, evidence[key]);
            }
        } catch (inspectionError) {
            report("VIR diagnostic inspection failed", inspectionError);
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
                const message = document.createElement("p");
                message.setAttribute("role", state === "failed" ? "alert" : "status");
                message.textContent =
                    state === "failed"
                        ? "Lean formatting is unavailable."
                        : "Loading Lean formatting…";
                status.appendChild(message);
                document.body.appendChild(status);
            }
        } catch (error) {
            report("VIR failure presentation failed", error);
        }
        try {
            window.dispatchEvent(new Event("verso-vir-statechange"));
        } catch (error) {
            report("VIR state notification failed", error);
        }
    }

    function releaseProgram() {
        const previous = program;
        program = undefined;
        delete window.versoVir;
        delete window.versoVirFormatSegments;
        try {
            previous?.dispose();
        } catch (error) {
            report("VIR program disposal failed", error);
        }
    }

    function closedError() {
        return Object.assign(new Error("Page closed before PrettyM was ready"), {
            name: "AbortError",
        });
    }

    async function initialize() {
        const runtimeModuleUrl = new URL(urls.runtimeModule, document.baseURI);
        const loader = await import(runtimeModuleUrl.href);
        if (disposed) throw closedError();
        const created = await loader.createProgram({
            runtimeManifestUrl: new URL(urls.runtimeManifest, document.baseURI),
            programManifestUrl: new URL(urls.programManifest, document.baseURI),
            signal: pending.signal,
        });
        if (disposed) {
            const failure = closedError();
            try {
                created.dispose();
            } catch (cleanupError) {
                Object.defineProperty(failure, "cleanupError", { value: cleanupError });
            }
            throw failure;
        }
        program = created;
        window.versoVir = created;
        window.versoVirFormatSegments = (format, width, indent) => {
            const active = program;
            if (!active) throw new Error("Lean formatting is unavailable");
            try {
                return formatCompactSegments(active, format, width, indent);
            } catch (error) {
                report("VIR formatting failed", error);
                if (active.status !== "active") {
                    releaseProgram();
                    if (!disposed) setState("failed");
                }
                throw error;
            }
        };
        setState("ready");
        return created;
    }

    window.addEventListener("pagehide", (event) => {
        if (event.persisted || disposed) return;
        disposed = true;
        if (!program) pending.abort();
        releaseProgram();
        setState("disposed");
    });
    const ready = initialize();
    window.versoVirReady = ready;
    ready.catch((error) => {
        reportFailure(error);
        if (!disposed) setState("failed");
    });
    // Publish readiness before a loading listener can close the document.
    setState("loading");
})();
