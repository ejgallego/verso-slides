import { createBrowserReactRuntimeFactory } from "./vir-react-runtime.js";

try {
    const factory = createBrowserReactRuntimeFactory({ wasmUrl: "./vir-upstream.wasm" });
    const runtime = await factory.createRuntime({
        irPackageSetUrl: "./ir/VirPanelExperiment.irpkg-set.json",
    });
    const mounted = runtime.callTimed("VirPanelExperiment.mountFixture", "#panel", 80);
    if (mounted.value !== true) throw new Error("VIR panel selector was not mounted");
    await new Promise((resolve) => {
        const poll = () => {
            if ((document.querySelector("#panel")?.textContent ?? "").length > 0) resolve();
            else requestAnimationFrame(poll);
        };
        poll();
    });
    const result = {
        package: runtime.packageInfo,
        timings: mounted.timings,
        text: document.querySelector("#panel")?.textContent ?? "",
    };
    document.querySelector("#metrics").textContent = JSON.stringify(result, null, 2);
    document.documentElement.dataset.virPanel = "ready";
    window.__virPanelExperiment = { runtime, result };
} catch (error) {
    document.documentElement.dataset.virPanel = "error";
    document.querySelector("#metrics").textContent = String(error?.stack ?? error);
    window.__virPanelExperiment = { error };
    console.error(error);
}
