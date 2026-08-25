// @ts-check

/**
 * Test-only differential corpus for the JavaScript and resident VIR/React
 * panel renderers. Playwright injects this file into the assembled deck.
 */
(function () {
    "use strict";

    /**
     * @typedef {{id: number, raw: string, origin: string}} ResidentFixture
     * @typedef {{id: number, width: number, origin: string, javascript: *, vir: *}} ParityFailure
     * @typedef {{id: number, panelWidth: number, origin: string, cellColumns: number[], cellRatios: number[], virWidths: number[], javascript: *, vir: *}} GeometryFailure
     */

    /** @param {ParentNode} root @param {string} origin @param {Map<number, ResidentFixture>} fixtures */
    function collectElements(root, origin, fixtures) {
        root.querySelectorAll("[data-rich-format][data-vir-panel-content]").forEach(function (el) {
            var rawId = el.getAttribute("data-vir-panel-content");
            var raw = el.getAttribute("data-rich-format");
            var id = rawId === null ? NaN : Number(rawId);
            if (!Number.isSafeInteger(id) || id < 0 || raw === null) {
                throw new Error("invalid resident panel fixture in " + origin);
            }
            var previous = fixtures.get(id);
            if (previous && previous.raw !== raw) {
                throw new Error("resident content ID " + id + " has conflicting payloads");
            }
            fixtures.set(id, { id: id, raw: raw, origin: origin });
        });
    }

    /** @param {*} value @param {string} origin @param {Map<number, ResidentFixture>} fixtures */
    function collectDocs(value, origin, fixtures) {
        if (typeof value === "string") {
            if (!value.includes("data-rich-format=")) return;
            var template = document.createElement("template");
            template.innerHTML = value;
            collectElements(template.content, origin, fixtures);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(function (item, index) {
                collectDocs(item, origin + "[" + index + "]", fixtures);
            });
            return;
        }
        if (value && typeof value === "object") {
            Object.entries(value).forEach(function (entry) {
                collectDocs(entry[1], origin + "." + entry[0], fixtures);
            });
        }
    }

    /** @param {Node} node @return {*} */
    function normalizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue === "" ? null : ["text", node.nodeValue];
        }
        if (!(node instanceof Element)) return null;
        var classes = Array.from(node.classList).sort();
        var binding = node.getAttribute("data-binding");
        return [node.localName, classes, binding, normalizeChildren(node)];
    }

    /** @param {Node} parent @return {*[]} */
    function normalizeChildren(parent) {
        /** @type {*[]} */
        var children = [];
        parent.childNodes.forEach(function (node) {
            var child = normalizeNode(node);
            if (child === null) return;
            var previous = children.at(-1);
            if (child[0] === "text" && previous && previous[0] === "text") {
                previous[1] += child[1];
            } else {
                children.push(child);
            }
        });
        return children;
    }

    /** @param {Element} host @return {*[]} */
    function snapshot(host) {
        return normalizeChildren(host);
    }

    function nextFrame() {
        return new Promise(function (resolve) {
            requestAnimationFrame(function () {
                resolve(undefined);
            });
        });
    }

    /** @param {number} pixels @param {number} spaceWidth @return {number} */
    function formatColumns(pixels, spaceWidth) {
        var columns = Math.floor(pixels / spaceWidth);
        return Number.isSafeInteger(columns) ? Math.max(1, Math.min(240, columns)) : 40;
    }

    /** @param {HTMLElement} panel @return {number} */
    function contentWidth(panel) {
        var style = getComputedStyle(panel);
        return (
            panel.clientWidth -
            parseFloat(style.paddingLeft || "0") -
            parseFloat(style.paddingRight || "0")
        );
    }

    /** @param {HTMLElement} host @param {*} payload @param {number} width */
    function renderJavascript(host, payload, width) {
        var measurer = createColumnMeasurer(width);
        if (Array.isArray(payload)) {
            var goals = goalsToHtml(payload);
            host.innerHTML = '<span class="hl lean">' + goals.html + "</span>";
            fillReflowedSpans(host, goals.formats, measurer);
        } else {
            var output = formatPrettyOutputTimed(
                payload.fmt,
                payload.annotations || {},
                width,
                measurer,
                "js",
                payload.formatId,
            );
            var reflowed = document.createElement("span");
            reflowed.className = "reflowed";
            insertPrettyOutput(reflowed, output);
            host.replaceChildren(reflowed);
        }
        measurer.cleanup();
    }

    /**
     * Render the production JavaScript goal path using the actual CSS geometry
     * of every `.type` cell.
     * @param {HTMLElement} host
     * @param {*} payload
     * @return {{cellColumns: number[], cellRatios: number[]}}
     */
    function renderJavascriptGeometry(host, payload) {
        var goals = goalsToHtml(payload);
        host.innerHTML = '<span class="hl lean">' + goals.html + "</span>";
        var measurer = createDOMMeasurer(host);
        var cellRatios = Array.from(host.querySelectorAll(".reflowed[data-fmt-idx]"))
            .map(function (span) {
                return span.closest(".type");
            })
            .filter(function (cell) {
                return cell !== null;
            })
            .map(function (cell) {
                return measurer.measureElWidth(cell) / measurer.spaceWidth;
            });
        var cellColumns = cellRatios.map(function (ratio) {
            return formatColumns(ratio, 1);
        });
        fillReflowedSpans(host, goals.formats, measurer, "js");
        measurer.cleanup();
        return { cellColumns: cellColumns, cellRatios: cellRatios };
    }

    /** @param {number} width @return {HTMLElement} */
    function geometryPanel(width) {
        var panel = document.createElement("div");
        panel.className = "info-panel";
        panel.style.cssText =
            "position:relative;inset:auto;box-sizing:border-box;" +
            "height:1000px;overflow:visible;width:" +
            width +
            "px";
        return panel;
    }

    /** @param {HTMLElement} host @return {number[]} */
    function measureVirWidths(host) {
        var measured = createDOMMeasurer(host);
        var widths = Array.from(host.querySelectorAll(".type .reflowed")).map(function (cell) {
            return formatColumns(
                measured.measureElWidth(/** @type {Element} */ (cell.closest(".type"))),
                measured.spaceWidth,
            );
        });
        if (widths.length === 0) {
            widths.push(formatColumns(contentWidth(host), measured.spaceWidth));
        }
        measured.cleanup();
        return widths;
    }

    /**
     * Compare every assembled goal/signature at an expand/shrink sequence of
     * deterministic column widths.
     * @param {{widths?: number[], expectedContents?: number}} [options]
     */
    async function runVirPanelParityCorpus(options) {
        var selected = options || {};
        var widths = selected.widths || [12, 40, 80, 20, 120, 1, 240, 32];
        var expectedContents = selected.expectedContents || 59;
        var bridge = window.__versoVirPanel;
        if (!bridge?.ready) throw new Error("VIR panel bridge is not configured");
        await bridge.ready;
        if (bridge.status !== "ready" || !bridge.mount || !bridge.unmount) {
            throw bridge.error || new Error("VIR panel bridge is unavailable");
        }

        /** @type {Map<number, ResidentFixture>} */
        var fixtures = new Map();
        collectElements(document, "index.html", fixtures);
        var docsResponse = await fetch(new URL("-verso-docs.json", window.location.href));
        if (!docsResponse.ok) throw new Error("failed to fetch generated hover documentation");
        collectDocs(await docsResponse.json(), "-verso-docs.json", fixtures);
        if (fixtures.size !== expectedContents) {
            throw new Error(
                "expected " + expectedContents + " resident contents, found " + fixtures.size,
            );
        }
        for (var id = 0; id < fixtures.size; id++) {
            if (!fixtures.has(id)) throw new Error("resident content IDs are not dense at " + id);
        }

        var fixtureHost = document.createElement("div");
        fixtureHost.style.cssText =
            "position:fixed;left:-10000px;top:0;width:1200px;visibility:hidden";
        var javascriptHost = document.createElement("div");
        var virHost = document.createElement("div");
        fixtureHost.append(javascriptHost, virHost);
        document.body.appendChild(fixtureHost);

        /** @type {ParityFailure[]} */
        var failures = [];
        var goalContents = 0;
        var signatureContents = 0;
        var cases = 0;
        try {
            for (var fixture of Array.from(fixtures.values()).sort(function (left, right) {
                return left.id - right.id;
            })) {
                var payload = JSON.parse(fixture.raw);
                if (Array.isArray(payload)) goalContents += 1;
                else signatureContents += 1;
                for (var width of widths) {
                    renderJavascript(javascriptHost, payload, width);
                    if (!bridge.mount(virHost, fixture.id, width)) {
                        throw new Error("VIR rejected resident content ID " + fixture.id);
                    }
                    await nextFrame();
                    await nextFrame();
                    cases += 1;
                    var javascript = snapshot(javascriptHost);
                    var vir = snapshot(virHost);
                    if (failures.length < 8 && JSON.stringify(javascript) !== JSON.stringify(vir)) {
                        failures.push({
                            id: fixture.id,
                            width: width,
                            origin: fixture.origin,
                            javascript: javascript,
                            vir: vir,
                        });
                    }
                }
            }
        } finally {
            bridge.unmount(virHost);
            fixtureHost.remove();
        }
        return {
            contents: fixtures.size,
            goalContents: goalContents,
            signatureContents: signatureContents,
            widths: widths,
            cases: cases,
            failures: failures,
        };
    }

    /**
     * Compare scalar, content-first-vector, and structure-first-vector VIR
     * protocols with the production JavaScript per-cell geometry path.
     * @param {{panelWidths?: number[], expectedGoals?: number}} [options]
     */
    async function runVirPanelGeometryCorpus(options) {
        var selected = options || {};
        var panelWidths = selected.panelWidths || [240, 360, 520, 760];
        var expectedGoals = selected.expectedGoals || 17;
        var bridge = window.__versoVirPanel;
        if (!bridge?.ready) throw new Error("VIR panel bridge is not configured");
        await bridge.ready;
        if (bridge.status !== "ready" || !bridge.mount || !bridge.unmount) {
            throw bridge.error || new Error("VIR panel bridge is unavailable");
        }

        /** @type {Map<number, ResidentFixture>} */
        var fixtures = new Map();
        collectElements(document, "index.html", fixtures);
        var docsResponse = await fetch(new URL("-verso-docs.json", window.location.href));
        if (!docsResponse.ok) throw new Error("failed to fetch generated hover documentation");
        collectDocs(await docsResponse.json(), "-verso-docs.json", fixtures);
        var goals = Array.from(fixtures.values())
            .map(function (fixture) {
                return { fixture: fixture, payload: JSON.parse(fixture.raw) };
            })
            .filter(function (entry) {
                return Array.isArray(entry.payload);
            });
        if (goals.length !== expectedGoals) {
            throw new Error("expected " + expectedGoals + " goal contents, found " + goals.length);
        }

        var fixtureHost = document.createElement("div");
        fixtureHost.style.cssText =
            "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
        var javascriptHost = geometryPanel(panelWidths[0]);
        var virHost = geometryPanel(panelWidths[0]);
        fixtureHost.append(javascriptHost, virHost);
        (document.querySelector(".reveal") || document.body).appendChild(fixtureHost);

        /** @type {GeometryFailure[]} */
        var failures = [];
        var cases = 0;
        var multiWidthCases = 0;
        var maxCellSpread = 0;
        var scalarDifferingCases = 0;
        var contentMeasuredVectorDifferingCases = 0;
        var differingCases = 0;
        var widthVectorMismatchCases = 0;
        /** @type {{id: number, panelWidth: number, cellColumns: number[], cellRatios: number[], virWidths: number[]}[]} */
        var observations = [];
        try {
            for (var entry of goals) {
                for (var panelWidth of panelWidths) {
                    javascriptHost.style.width = panelWidth + "px";
                    virHost.style.width = panelWidth + "px";
                    var geometry = renderJavascriptGeometry(javascriptHost, entry.payload);
                    var distinct = new Set(geometry.cellColumns);
                    if (distinct.size > 1) multiWidthCases += 1;
                    if (geometry.cellColumns.length > 0) {
                        maxCellSpread = Math.max(
                            maxCellSpread,
                            Math.max.apply(null, geometry.cellColumns) -
                                Math.min.apply(null, geometry.cellColumns),
                        );
                    }

                    var initialMeasured = createDOMMeasurer(virHost);
                    var initialWidth = formatColumns(
                        contentWidth(virHost),
                        initialMeasured.spaceWidth,
                    );
                    initialMeasured.cleanup();
                    if (!bridge.mount(virHost, entry.fixture.id, initialWidth, false)) {
                        throw new Error("VIR rejected initial control mount");
                    }
                    await nextFrame();
                    await nextFrame();
                    var javascript = snapshot(javascriptHost);
                    var contentMeasuredWidths = measureVirWidths(virHost);
                    if (!bridge.mount(virHost, entry.fixture.id, contentMeasuredWidths[0], false)) {
                        throw new Error("VIR rejected measured scalar-width control remount");
                    }
                    await nextFrame();
                    await nextFrame();
                    if (JSON.stringify(javascript) !== JSON.stringify(snapshot(virHost))) {
                        scalarDifferingCases += 1;
                    }

                    if (!bridge.mount(virHost, entry.fixture.id, contentMeasuredWidths, false)) {
                        throw new Error("VIR rejected content-measured control remount");
                    }
                    await nextFrame();
                    await nextFrame();
                    if (JSON.stringify(javascript) !== JSON.stringify(snapshot(virHost))) {
                        contentMeasuredVectorDifferingCases += 1;
                    }

                    if (!bridge.mount(virHost, entry.fixture.id, [], true)) {
                        throw new Error("VIR rejected resident content ID " + entry.fixture.id);
                    }
                    await nextFrame();
                    await nextFrame();
                    var virWidths = measureVirWidths(virHost);
                    if (JSON.stringify(geometry.cellColumns) !== JSON.stringify(virWidths)) {
                        widthVectorMismatchCases += 1;
                    }
                    if (!bridge.mount(virHost, entry.fixture.id, virWidths, false)) {
                        throw new Error("VIR rejected measured goal remount");
                    }
                    await nextFrame();
                    await nextFrame();

                    cases += 1;
                    var vir = snapshot(virHost);
                    var differs = JSON.stringify(javascript) !== JSON.stringify(vir);
                    if (differs) differingCases += 1;
                    if ((distinct.size > 1 || differs) && observations.length < 16) {
                        observations.push({
                            id: entry.fixture.id,
                            panelWidth: panelWidth,
                            cellColumns: geometry.cellColumns,
                            cellRatios: geometry.cellRatios.map(function (ratio) {
                                return Math.round(ratio * 1000) / 1000;
                            }),
                            virWidths: virWidths,
                        });
                    }
                    if (differs && failures.length < 8) {
                        failures.push({
                            id: entry.fixture.id,
                            panelWidth: panelWidth,
                            origin: entry.fixture.origin,
                            cellColumns: geometry.cellColumns,
                            cellRatios: geometry.cellRatios.map(function (ratio) {
                                return Math.round(ratio * 1000) / 1000;
                            }),
                            virWidths: virWidths,
                            javascript: javascript,
                            vir: vir,
                        });
                    }
                }
            }
        } finally {
            bridge.unmount(virHost);
            fixtureHost.remove();
        }
        return {
            goalContents: goals.length,
            panelWidths: panelWidths,
            cases: cases,
            multiWidthCases: multiWidthCases,
            maxCellSpread: maxCellSpread,
            widthVectorMismatchCases: widthVectorMismatchCases,
            scalarDifferingCases: scalarDifferingCases,
            contentMeasuredVectorDifferingCases: contentMeasuredVectorDifferingCases,
            differingCases: differingCases,
            observations: observations,
            failures: failures,
        };
    }

    window.runVirPanelParityCorpus = runVirPanelParityCorpus;
    window.runVirPanelGeometryCorpus = runVirPanelGeometryCorpus;
})();
