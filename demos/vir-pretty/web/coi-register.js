// @ts-check
/* Bootstrap cross-origin isolation on static hosts for threaded Wasm. */
(function () {
    "use strict";

    var reloadKey = "verso-coi-reload-attempted";
    if (globalThis.crossOriginIsolated) {
        sessionStorage.removeItem(reloadKey);
        return;
    }
    if (!("serviceWorker" in navigator)) return;

    var reloading = false;
    function reloadOnce() {
        if (reloading) return;
        if (sessionStorage.getItem(reloadKey) === "1") {
            console.warn("Cross-origin isolation is still unavailable after reloading.");
            return;
        }
        reloading = true;
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;
    var workerUrl = new URL("../coi-serviceworker.js", scriptUrl);
    var scopeUrl = new URL("../", scriptUrl);
    navigator.serviceWorker
        .register(workerUrl, { scope: scopeUrl.href, updateViaCache: "none" })
        .then(function (registration) {
            return registration
                .update()
                .catch(function () {})
                .then(function () {
                    return registration;
                });
        })
        .then(function (registration) {
            if (registration.active) reloadOnce();
        })
        .catch(function (error) {
            console.warn("Could not bootstrap cross-origin isolation.", error);
        });
})();
