// @ts-check

/* Load the one VIR runtime used by the deck. */
(function () {
    "use strict";

    var script = /** @type {HTMLScriptElement} */ (document.currentScript);
    var assetsUrl = new URL("./vir-prettym/", script.src);

    window.versoVirReady = (async function () {
        var runtimeModule = await import(new URL("sdk/js/vir-web-assets.js", assetsUrl).href);
        var runtime = await runtimeModule.createVirWebAssetsRuntime(
            new URL("VIR_WEB_ASSETS.json", assetsUrl),
            "vir-prettym",
        );
        runtime.runStartupEntries();
        window.versoVir = runtime;
        window.addEventListener(
            "pagehide",
            function () {
                runtime.dispose();
            },
            { once: true },
        );
        return runtime;
    })();
})();
