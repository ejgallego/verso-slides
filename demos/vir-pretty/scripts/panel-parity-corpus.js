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

    window.runVirPanelParityCorpus = runVirPanelParityCorpus;
})();
