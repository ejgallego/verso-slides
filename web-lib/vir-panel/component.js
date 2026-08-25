// @ts-check
/* Host geometry and lifecycle adapter for the resident Lean/VIR panel. */
(function () {
    "use strict";

    var root = window;
    var selectors = new WeakMap();
    var panelStates = new WeakMap();
    var widthCache = new WeakMap();
    var nextHostId = 1;

    /** @type {VersoVirPanelBridge} */
    var bridge = { status: "loading" };
    root.__versoVirPanel = bridge;

    /** @param {Element} target @return {string} */
    function selectorFor(target) {
        var existing = selectors.get(target);
        if (existing) return existing;
        var id = "verso-vir-panel-" + nextHostId++;
        target.setAttribute("data-vir-panel-host", id);
        var selector = '[data-vir-panel-host="' + id + '"]';
        selectors.set(target, selector);
        return selector;
    }

    /** @param {number} width @return {number} */
    function safeWidth(width) {
        var rounded = Math.floor(width);
        return Number.isSafeInteger(rounded) ? Math.max(1, Math.min(240, rounded)) : 40;
    }

    /** @param {HTMLElement} panel @return {number} */
    function panelContentWidth(panel) {
        var style = getComputedStyle(panel);
        return (
            panel.clientWidth -
            parseFloat(style.paddingLeft || "0") -
            parseFloat(style.paddingRight || "0")
        );
    }

    /** @param {HTMLElement} panel */
    function releasePanel(panel) {
        var state = panelStates.get(panel);
        panelStates.delete(panel);
        if (state && bridge.unmount) bridge.unmount(state.target);
    }

    /**
     * @param {HTMLElement} panel
     * @param {Element} source
     * @param {Element} target
     * @return {boolean}
     */
    function renderPanel(panel, source, target) {
        if (bridge.status !== "ready" || !bridge.mount) return false;
        var rawId = source.getAttribute("data-vir-panel-content");
        var contentId = rawId === null ? NaN : Number(rawId);
        if (!Number.isSafeInteger(contentId) || contentId < 0) return false;

        var previous = panelStates.get(panel);
        var panelWidth = panel.clientWidth;
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

        var cached = widthCache.get(source);
        if (
            cached &&
            cached.contentId === contentId &&
            Math.abs(cached.panelWidth - panelWidth) < 0.5
        ) {
            if (!bridge.mount(target, contentId, cached.widths, false)) return false;
            panelStates.set(panel, {
                target: target,
                contentId: contentId,
                panelWidth: panelWidth,
            });
            return true;
        }

        if (!bridge.mount(target, contentId, [], true)) return false;
        var state = {
            target: target,
            contentId: contentId,
            panelWidth: panelWidth,
            measuring: true,
        };
        panelStates.set(panel, state);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (panelStates.get(panel) !== state || !bridge.mount) return;
                var measured = createDOMMeasurer(panel);
                /** @type {number[]} */
                var widths = [];
                target.querySelectorAll(".type .reflowed").forEach(function (cell) {
                    var typeCell = cell.closest(".type");
                    if (typeCell) {
                        widths.push(
                            safeWidth(measured.measureElWidth(typeCell) / measured.spaceWidth),
                        );
                    }
                });
                if (widths.length === 0) {
                    var pixels =
                        target === panel
                            ? panelContentWidth(panel)
                            : measured.measureElWidth(target);
                    widths.push(safeWidth(pixels / measured.spaceWidth));
                }
                measured.cleanup();
                if (!bridge.mount(target, contentId, widths, false)) {
                    releasePanel(panel);
                    return;
                }
                state.measuring = false;
                state.panelWidth = panel.clientWidth;
                widthCache.set(source, {
                    contentId: contentId,
                    panelWidth: state.panelWidth,
                    widths: widths.slice(),
                });
            });
        });
        return true;
    }

    root.__versoPanelRenderer = { render: renderPanel, release: releasePanel };

    bridge.ready = (async function () {
        try {
            var runtimeBridge = root.__versoVirPanelRuntime;
            if (!runtimeBridge || !runtimeBridge.ready) {
                throw new Error("VIR panel runtime is not configured");
            }
            var runtime = await runtimeBridge.ready;
            if (!runtime || runtimeBridge.status !== "ready") {
                throw runtimeBridge.error || new Error("VIR panel runtime failed to initialize");
            }
            var loadedRuntime = /** @type {VirRuntime} */ (runtime);
            bridge.runtime = loadedRuntime;
            bridge.mount = function (target, contentId, widths, measureOnly) {
                var safeWidths = widths.slice(0, 4096).map(safeWidth);
                return (
                    loadedRuntime.call(
                        "VirPanelRegistry.mountContent",
                        selectorFor(target),
                        contentId,
                        safeWidths,
                        measureOnly,
                    ) === true
                );
            };
            bridge.unmount = function (target) {
                var selector = selectors.get(target);
                return (
                    !selector || loadedRuntime.call("VirPanelRegistry.unmount", selector) === true
                );
            };
            bridge.status = "ready";
            root.dispatchEvent(new CustomEvent("verso-panel-renderer-ready"));
            return bridge;
        } catch (error) {
            bridge.status = "error";
            bridge.error = error;
            console.error("VIR panel component failed to initialize", error);
            return bridge;
        }
    })();
})();
