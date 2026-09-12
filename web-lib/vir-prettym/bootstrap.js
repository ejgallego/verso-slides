// @ts-check

/* One application root, one runtime, and one page-owned lifetime. */
(function () {
    "use strict";
    var script = /** @type {HTMLScriptElement} */ (document.currentScript);
    var assetsUrl = new URL("./vir/", script.src);
    var disposed = false;
    window.addEventListener("pagehide", function (event) {
        // A bfcache entry retains this JS heap. Keep its runtime alive so
        // the restored page and its existing panel callbacks can reuse it.
        if (event.persisted) return;
        disposed = true;
        window.versoVir?.dispose();
    });

    window.versoVirReady = (async function () {
        var loader = await import(new URL("sdk/js/vir-web-assets.js", assetsUrl).href);
        var factory = await loader.createVirWebAssetsFactory(
            new URL("VIR_WEB_ASSETS.json", assetsUrl),
        );
        var runtime = await factory.createRuntime();
        if (disposed) {
            runtime.dispose();
            throw new Error("Page closed before VIR was ready");
        }
        var entry = factory.manifest.programs[0].module + ".formatSegments";
        try {
            var formatter = runtime.interfaceManifest?.exports.find(function (candidate) {
                return candidate.entry === entry;
            });
            if (!formatter || formatter.args.length !== 3) {
                throw new Error(
                    "Slides requires root export " +
                        entry +
                        " (Std.Format, Nat, Nat) → Array Segment. " +
                        "Add an @[vir_export] formatSegments wrapper to the selected application root.",
                );
            }
            runtime.runStartupEntries();
        } catch (error) {
            runtime.dispose();
            throw error;
        }
        window.versoVirFormatSegments = function (format, width, indent) {
            return runtime.call(entry, format, width, indent);
        };
        window.versoVir = runtime;
        return runtime;
    })();
    window.versoVirReady.catch(function (error) {
        var message = document.createElement("p");
        message.setAttribute("role", "alert");
        message.textContent = "VIR initialization failed: " + String(error);
        document.body.appendChild(message);
    });
})();
