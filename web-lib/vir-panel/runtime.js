// @ts-check
/* Browser loader for the deck's resident VIR panel package. */
(function () {
    "use strict";

    var root = window;
    var config = root.__versoVirPanelConfig || {};

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;

    /** @param {string} path */
    function fromScript(path) {
        return new URL(path, scriptUrl).href;
    }

    var runtimeUrl = config.runtimeUrl || fromScript("./lean-vir/js/vir-runtime.js");
    var wasmUrl = config.wasmUrl || fromScript("./lean-vir/wasm/vir-upstream.wasm");
    var irPackageSetUrl =
        config.irPackageSetUrl || fromScript("./ir/VirPanelRegistry.irpkg-set.json");
    var irPackageUrl = config.irPackageUrl || null;

    /** @type {VersoVirPanelRuntimeBridge} */
    var bridge = root.__versoVirPanelRuntime || { status: "loading" };
    bridge.status = "loading";
    bridge.assets = [scriptUrl, runtimeUrl, wasmUrl, irPackageSetUrl || irPackageUrl].filter(
        function (asset) {
            return typeof asset === "string";
        },
    );
    root.__versoVirPanelRuntime = bridge;

    bridge.ready = import(runtimeUrl)
        .then(function (runtimeModule) {
            var hasFactory = typeof runtimeModule.createBrowserReactRuntimeFactory === "function";
            if (!hasFactory && typeof runtimeModule.createVirRuntime !== "function") {
                throw new Error("VIR runtime module does not export a supported factory");
            }
            var fetchCache = config.fetchCache || "default";
            /** @param {string | URL} path */
            function fetchBytes(path) {
                if (typeof runtimeModule.fetchBytes === "function") {
                    return runtimeModule.fetchBytes(path, { cache: fetchCache });
                }
                return fetch(path, { cache: fetchCache }).then(function (response) {
                    if (!response.ok) throw new Error("failed to load " + path);
                    return response.arrayBuffer();
                });
            }
            /** @type {Record<string, *>} */
            var runtimeOptions = {
                wasmUrl: wasmUrl,
                wasmDebugUrl: config.wasmDebugUrl,
                debugWasm: config.debugWasm === true,
                fetchBytes: fetchBytes,
            };
            if (hasFactory) {
                var factory = runtimeModule.createBrowserReactRuntimeFactory(runtimeOptions);
                if (irPackageSetUrl) {
                    return factory.createRuntime({ irPackageSetUrl: irPackageSetUrl });
                }
                if (!irPackageUrl) throw new Error("missing VIR IR package URL");
                return fetchBytes(irPackageUrl).then(
                    function (/** @type {ArrayBuffer | Uint8Array} */ packageBytes) {
                        return factory.createRuntime({ irPackageSetBytes: [packageBytes] });
                    },
                );
            }
            if (irPackageSetUrl) {
                runtimeOptions.irPackageSetUrl = irPackageSetUrl;
                return runtimeModule.createVirRuntime(runtimeOptions);
            }
            if (!irPackageUrl) throw new Error("missing VIR IR package URL");
            if (typeof runtimeModule.IR_PACKAGE_SET_FORMAT === "string") {
                return fetchBytes(irPackageUrl).then(
                    function (/** @type {ArrayBuffer | Uint8Array} */ packageBytes) {
                        runtimeOptions.irPackageSetBytes = [packageBytes];
                        return runtimeModule.createVirRuntime(runtimeOptions);
                    },
                );
            }
            runtimeOptions.irPackageUrl = irPackageUrl;
            return runtimeModule.createVirRuntime(runtimeOptions);
        })
        .then(function (runtime) {
            bridge.runtime = runtime;
            bridge.status = "ready";
            return runtime;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            console.warn("VIR runtime bootstrap failed.", error);
            return null;
        });
})();
