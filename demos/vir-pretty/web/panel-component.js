// @ts-check

/**
 * Browser adapter for the resident VIR/React panel-component pilot.
 *
 * The public host boundary is deliberately two calls: mount a resident content
 * ID for structural measurement or at measured per-cell column widths, and
 * unmount it. All goal and format data stays inside the generated VIR package.
 */

(function () {
    "use strict";

    const root = window;
    const selectors = new WeakMap();
    const panelStates = new WeakMap();
    const widthCache = new WeakMap();
    let nextHostId = 1;

    /** @type {VersoVirPanelBridge} */
    const bridge = {
        status: "loading",
        error: null,
        calls: [],
        interactions: [],
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

    /** @param {VersoVirPanelInteraction} interaction */
    function recordInteraction(interaction) {
        bridge.lastInteraction = interaction;
        bridge.interactions.push(interaction);
        if (bridge.interactions.length > 100) bridge.interactions.shift();
    }

    /** @param {number} width @return {number} */
    function safeWidth(width) {
        const rounded = Math.floor(width);
        return Number.isSafeInteger(rounded) ? Math.max(1, Math.min(240, rounded)) : 40;
    }

    /** @param {number | number[]} width @param {boolean} allowEmpty @return {number[]} */
    function safeWidths(width, allowEmpty) {
        const values = Array.isArray(width) ? width : [width];
        const widths = values.slice(0, 4096).map(safeWidth);
        return widths.length > 0 || allowEmpty ? widths : [40];
    }

    /** @param {HTMLElement} panel @return {number} */
    function panelContentWidth(panel) {
        const style = getComputedStyle(panel);
        return (
            panel.clientWidth -
            parseFloat(style.paddingLeft || "0") -
            parseFloat(style.paddingRight || "0")
        );
    }

    /** @param {HTMLElement} panel */
    function releasePanel(panel) {
        const state = panelStates.get(panel);
        panelStates.delete(panel);
        if (state && bridge.unmount) bridge.unmount(state.target);
    }

    /**
     * Production hook: keep browser geometry here while resident content and
     * React rendering stay behind the typed VIR boundary.
     * @param {HTMLElement} panel
     * @param {Element} source
     * @param {Element} target
     * @return {boolean}
     */
    function renderPanel(panel, source, target) {
        if (bridge.status !== "ready" || !bridge.mount) return false;
        const started = performance.now();
        const rawId = source.getAttribute("data-vir-panel-content");
        const contentId = rawId === null ? NaN : Number(rawId);
        if (!Number.isSafeInteger(contentId) || contentId < 0) return false;

        const previous = panelStates.get(panel);
        const panelWidth = panel.clientWidth;
        if (
            previous &&
            previous.target === target &&
            previous.contentId === contentId &&
            (previous.measuring || Math.abs(previous.panelWidth - panelWidth) < 0.5)
        ) {
            return true;
        }
        if (previous && previous.target !== target && bridge.unmount) {
            bridge.unmount(previous.target);
        }

        const cached = widthCache.get(source);
        if (
            cached &&
            cached.contentId === contentId &&
            Math.abs(cached.panelWidth - panelWidth) < 0.5
        ) {
            const finalStarted = performance.now();
            if (!bridge.mount(target, contentId, cached.widths, false)) return false;
            const finished = performance.now();
            panelStates.set(panel, {
                target,
                contentId,
                panelWidth,
                measuring: false,
            });
            recordInteraction({
                contentId,
                cacheHit: true,
                widths: cached.widths.slice(),
                structureCallMs: 0,
                frameWaitMs: 0,
                measureMs: 0,
                finalCallMs: finished - finalStarted,
                totalMs: finished - started,
                finalTimings: bridge.lastCall?.timings,
            });
            return true;
        }

        const structureStarted = performance.now();
        if (!bridge.mount(target, contentId, [], true)) return false;
        const structureFinished = performance.now();

        const state = {
            target,
            contentId,
            panelWidth,
            measuring: true,
            started,
            structureCallMs: structureFinished - structureStarted,
            structureTimings: bridge.lastCall?.timings,
            frameStarted: structureFinished,
        };
        panelStates.set(panel, state);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (panelStates.get(panel) !== state || !bridge.mount) return;
                const measureStarted = performance.now();
                const measured = createDOMMeasurer(panel);
                /** @type {number[]} */
                const widths = [];
                target.querySelectorAll(".type .reflowed").forEach(function (cell) {
                    const typeCell = cell.closest(".type");
                    if (typeCell) {
                        widths.push(
                            safeWidth(measured.measureElWidth(typeCell) / measured.spaceWidth),
                        );
                    }
                });
                if (widths.length === 0) {
                    const pixels =
                        target === panel
                            ? panelContentWidth(panel)
                            : measured.measureElWidth(target);
                    widths.push(safeWidth(pixels / measured.spaceWidth));
                }
                measured.cleanup();
                const measureFinished = performance.now();
                const finalStarted = performance.now();
                if (!bridge.mount(target, contentId, widths, false)) {
                    releasePanel(panel);
                } else {
                    const finished = performance.now();
                    state.measuring = false;
                    state.panelWidth = panel.clientWidth;
                    widthCache.set(source, {
                        contentId,
                        panelWidth: state.panelWidth,
                        widths: widths.slice(),
                    });
                    recordInteraction({
                        contentId,
                        cacheHit: false,
                        widths: widths.slice(),
                        structureCallMs: state.structureCallMs,
                        frameWaitMs: measureStarted - state.frameStarted,
                        measureMs: measureFinished - measureStarted,
                        finalCallMs: finished - finalStarted,
                        totalMs: finished - state.started,
                        structureTimings: state.structureTimings,
                        finalTimings: bridge.lastCall?.timings,
                    });
                }
            });
        });
        return true;
    }

    root.__versoPanelRenderer = { render: renderPanel, release: releasePanel };

    bridge.ready = (async () => {
        try {
            const pretty = root.__versoPrettyVir;
            if (!pretty?.ready) {
                throw new Error("shared VIR formatter runtime is not configured");
            }
            await pretty.ready;
            if (pretty.status !== "ready" || !pretty.runtime) {
                throw (
                    pretty.error || new Error("shared VIR formatter runtime failed to initialize")
                );
            }
            const runtime = pretty.runtime;
            const callTimed = runtime.callTimed?.bind(runtime);
            if (!callTimed) throw new Error("shared VIR runtime does not expose timed calls");
            bridge.runtime = runtime;
            bridge.mount = function (target, contentId, width, measureOnly = false) {
                const widths = safeWidths(width, measureOnly);
                const call = callTimed(
                    "VirPanelRegistry.mountContent",
                    selectorFor(target),
                    contentId,
                    widths,
                    measureOnly,
                );
                bridge.lastCall = call;
                bridge.calls.push({
                    kind: "mount",
                    contentId,
                    width: widths[0] || 0,
                    widths,
                    measureOnly,
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
            root.dispatchEvent(new CustomEvent("verso-panel-renderer-ready"));
            return bridge;
        } catch (error) {
            bridge.status = "error";
            bridge.error = error;
            reportStatus();
            console.error("VIR panel component failed to initialize", error);
            throw error;
        }
    })();
})();
