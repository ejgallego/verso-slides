// @ts-check

/* One application root, one runtime, and one page-owned lifetime. */
(function () {
    "use strict";
    var script = /** @type {HTMLScriptElement} */ (document.currentScript);
    var assetsUrl = new URL("./vir/", script.src);
    var disposed = false;
    window.addEventListener(
        "pagehide",
        function () {
            disposed = true;
            window.versoVir?.dispose();
        },
        { once: true },
    );

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
        try {
            runtime.runStartupEntries();
        } catch (error) {
            runtime.dispose();
            throw error;
        }
        var entry = factory.manifest.programs[0].module + ".formatSegments";
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
