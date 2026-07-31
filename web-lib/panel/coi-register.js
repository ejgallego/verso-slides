// @ts-check
/* Bootstrap cross-origin isolation on static hosts for threaded Wasm. */
(function () {
    "use strict";

    if (globalThis.crossOriginIsolated || !("serviceWorker" in navigator)) return;

    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (reloading) return;
        reloading = true;
        window.location.reload();
    });

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;
    var workerUrl = new URL("../coi-serviceworker.js", scriptUrl);
    var scopeUrl = new URL("../", scriptUrl);
    navigator.serviceWorker
        .register(workerUrl, { scope: scopeUrl.href })
        .then(function (registration) {
            if (registration.active && !navigator.serviceWorker.controller && !reloading) {
                reloading = true;
                window.location.reload();
            }
        })
        .catch(function (error) {
            console.warn("Could not bootstrap cross-origin isolation.", error);
        });
})();
