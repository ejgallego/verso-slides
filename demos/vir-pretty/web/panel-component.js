// @ts-check

/**
 * Browser adapter for the resident VIR/React panel-component pilot.
 *
 * The public host boundary is deliberately two calls: mount a resident content
 * ID at a measured column width, or unmount it. All goal and format data stays
 * inside the generated VIR package set.
 */

const root = window;
const selectors = new WeakMap();
let nextHostId = 1;

/** @type {VersoVirPanelBridge} */
const bridge = {
    status: "loading",
    error: null,
    calls: [],
};
root.__versoVirPanel = bridge;

/** @param {Element} target @return {string} */
function selectorFor(target) {
    const existing = selectors.get(target);
    if (existing) return existing;
    const id = `verso-vir-panel-${nextHostId++}`;
    target.setAttribute("data-vir-panel-host", id);
    const selector = `[data-vir-panel-host="${id}"]`;
    selectors.set(target, selector);
    return selector;
}

function reportStatus() {
    window.dispatchEvent(new CustomEvent("verso-vir-panel-status", { detail: bridge.status }));
}

/** @param {number} width @return {number} */
function safeWidth(width) {
    const rounded = Math.floor(width);
    return Number.isSafeInteger(rounded) ? Math.max(1, Math.min(240, rounded)) : 40;
}

bridge.ready = (async () => {
    try {
        const pretty = root.__versoPrettyVir;
        if (!pretty?.ready) {
            throw new Error("shared VIR formatter runtime is not configured");
        }
        await pretty.ready;
        if (pretty.status !== "ready" || !pretty.runtime) {
            throw pretty.error || new Error("shared VIR formatter runtime failed to initialize");
        }
        const runtime = pretty.runtime;
        const callTimed = runtime.callTimed?.bind(runtime);
        if (!callTimed) throw new Error("shared VIR runtime does not expose timed calls");
        bridge.runtime = runtime;
        bridge.mount = function (target, contentId, width) {
            const boundedWidth = safeWidth(width);
            const call = callTimed(
                "VirPanelRegistry.mountContent",
                selectorFor(target),
                contentId,
                boundedWidth,
            );
            bridge.lastCall = call;
            bridge.calls.push({
                kind: "mount",
                contentId,
                width: boundedWidth,
                timings: call.timings,
            });
            if (bridge.calls.length > 100) bridge.calls.shift();
            return call.value === true;
        };
        bridge.unmount = function (target) {
            const selector = selectors.get(target);
            if (!selector) return true;
            const call = callTimed("VirPanelRegistry.unmount", selector);
            bridge.lastCall = call;
            bridge.calls.push({ kind: "unmount", timings: call.timings });
            if (bridge.calls.length > 100) bridge.calls.shift();
            return call.value === true;
        };
        bridge.status = "ready";
        reportStatus();
        return bridge;
    } catch (error) {
        bridge.status = "error";
        bridge.error = error;
        reportStatus();
        console.error("VIR panel component failed to initialize", error);
        throw error;
    }
})();
