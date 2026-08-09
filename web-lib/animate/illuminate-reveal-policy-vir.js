// @ts-check

// Optional VIR implementation of the compiler-neutral Verso Reveal policy.
// The ordinary JavaScript policy remains active unless the global config is
// installed or the deck is opened with `?revealPolicy=vir`.

(function () {
    /**
     * @typedef {{runtimeUrl: string, wasmUrl: string, irPackageUrl: string}} VirPolicyConfig
     * @typedef {{call: (name: string, ...args: unknown[]) => unknown, dispose: () => void}} VirRuntime
     * @typedef {Window & {__versoRevealVirPolicyConfig?: VirPolicyConfig, __versoRevealPolicyBackend?: Promise<{name: string, plan: (policy: unknown, event: unknown) => unknown[], dispose: () => void}>}} VirPolicyWindow
     */
    var root = /** @type {VirPolicyWindow} */ (window);
    var requested = new URLSearchParams(window.location.search).get("revealPolicy") === "vir";
    var config = root.__versoRevealVirPolicyConfig;
    if (!config && !requested) return;
    if (!config) {
        var base = new URL("lib/verso-reveal-vir/", document.baseURI);
        config = {
            runtimeUrl: new URL("vir-runtime.js", base).href,
            wasmUrl: new URL("vir-upstream.wasm", base).href,
            irPackageUrl: new URL("verso-reveal-policy.irpkg", base).href,
        };
    }

    /** @param {string} url */
    async function fetchBytes(url) {
        var response = await fetch(url);
        if (!response.ok) throw new Error("failed to fetch " + url + ": HTTP " + response.status);
        return new Uint8Array(await response.arrayBuffer());
    }

    var selectedConfig = config;
    root.__versoRevealPolicyBackend = (async function () {
        var module = await import(selectedConfig.runtimeUrl);
        if (typeof module.createVirRuntime !== "function") {
            throw new Error("VIR runtime module does not export createVirRuntime");
        }
        var assets = await Promise.all([
            fetchBytes(selectedConfig.wasmUrl),
            fetchBytes(selectedConfig.irPackageUrl),
        ]);
        var runtime = /** @type {VirRuntime} */ (
            await module.createVirRuntime({
                wasmBytes: assets[0],
                irPackageSetBytes: [assets[1]],
            })
        );
        return {
            name: "vir",
            plan: function (policy, event) {
                var value = runtime.call("VersoSlides.RevealPolicy.Policy.plan", policy, event);
                if (!Array.isArray(value))
                    throw new Error("VIR Reveal policy returned a non-array");
                return value;
            },
            dispose: function () {
                runtime.dispose();
            },
        };
    })();
    // The animation adapter reports load failures and falls back to the JS
    // planner when it first needs the backend. Attach a rejection observer now
    // as well, so a slide deck that never enters an animated slide does not
    // produce an unhandled-rejection report.
    root.__versoRevealPolicyBackend.catch(function () {});

    window.addEventListener(
        "pagehide",
        function () {
            root.__versoRevealPolicyBackend
                ?.then(function (planner) {
                    planner.dispose();
                })
                .catch(function () {});
        },
        { once: true },
    );
})();
