// @ts-check
/* Load the one VIR runtime used by the deck. */
(function () {
    "use strict";

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;

    /** @param {string} path */
    function fromScript(path) {
        return new URL(path, scriptUrl).href;
    }

    window.versoVirReady = import(fromScript("./vir-prettym/sdk/js/vir-runtime.js"))
        .then(function (runtimeModule) {
            return runtimeModule.createVirRuntime({
                wasmUrl: fromScript("./vir-prettym/sdk/wasm/vir-upstream.wasm"),
                irPackageSetUrl: fromScript("./vir-prettym/module/VirPrettyM.irpkg-set.json"),
            });
        })
        .then(function (runtime) {
            window.versoVir = runtime;
            return runtime;
        });
})();
