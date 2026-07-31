// @ts-check
/* Interactive info panel for Lean code blocks in reveal.js slides. */
(function () {
    "use strict";

    /**
     * @typedef {HTMLElement & { _activeSource: Element | null }} PanelBlock
     * @typedef {HTMLElement & { _richFormatSource: Element | null }} InfoPanel
     */

    /** @type {Record<string, *> | null} */
    var docsJson = null; // fetched once on init
    /** @type {HTMLDetailsElement | null} */
    var prettyControls = null;

    function init() {
        initializePrettyConfig();

        // Fetch the hover-docs JSON
        fetch("-verso-docs.json")
            .then(function (r) {
                return r.ok ? r.json() : {};
            })
            .then(function (j) {
                docsJson = j;
            })
            .catch(function () {
                docsJson = {};
            });

        document.querySelectorAll(".code-with-panel").forEach(setupBlock);
        initPrettyControls();
        refreshPanelsWhenPrettyBackendsReady();

        Reveal.on("fragmentshown", onFragmentShown);
        Reveal.on("fragmenthidden", onFragmentHidden);
        Reveal.on("slidechanged", onSlideChanged);
        Reveal.on("resize", function () {
            document.querySelectorAll(".code-with-panel").forEach(function (el) {
                redrawFocusOutline(/** @type {PanelBlock} */ (el));
            });
        });
    }

    function refreshPanelsWhenPrettyBackendsReady() {
        getPrettyBackends().forEach(function (backend) {
            if (!backend.ready || typeof backend.ready.then !== "function") return;
            backend.ready.then(function () {
                reflowPrettyPanels();
                renderPrettyControls();
            });
        });
    }

    function initializePrettyConfig() {
        var root = /** @type {Window} */ (window);
        var config = root.__versoPrettyConfig || (root.__versoPrettyConfig = {});
        var params = new URLSearchParams(window.location.search);
        if (params.has("pretty")) {
            var queryBackends = (params.get("pretty") || "")
                .split(",")
                .map(function (id) {
                    return id.trim();
                })
                .filter(function (id) {
                    return id.length > 0;
                });
            config.backends = queryBackends.length > 0 ? queryBackends : undefined;
        }
        if (params.has("prettyCompare")) {
            config.compare = params.get("prettyCompare") !== "0";
        }
        if (params.has("prettyControls")) {
            config.controls = params.get("prettyControls") !== "0";
        }
        if (params.has("prettyBackend")) {
            config.backend = params.get("prettyBackend") || "js";
        }
        if (params.has("prettyColumns")) {
            var columns = Number(params.get("prettyColumns"));
            if (Number.isInteger(columns) && columns >= 1 && columns <= 240) {
                config.columns = columns;
            }
        }
        if (!Number.isInteger(config.columns)) config.columns = 40;
    }

    /** @return {PrettyBackendDefinition[]} */
    function selectedPrettyBackends() {
        var root = /** @type {Window} */ (window);
        var configured = root.__versoPrettyConfig && root.__versoPrettyConfig.backends;
        if (!Array.isArray(configured)) return getPrettyBackends();
        var selected = new Set(configured);
        var backends = getPrettyBackends().filter(function (backend) {
            return selected.has(backend.id);
        });
        return backends.length > 0 ? backends : getPrettyBackends().slice(0, 1);
    }

    /** @return {number} */
    function prettyComparisonColumns() {
        var root = /** @type {Window} */ (window);
        var columns = root.__versoPrettyConfig && root.__versoPrettyConfig.columns;
        return Number.isInteger(columns) ? Math.max(1, Math.min(240, Number(columns))) : 40;
    }

    function reflowPrettyPanels() {
        document.querySelectorAll(".info-panel").forEach(function (panel) {
            reflowPanel(/** @type {InfoPanel} */ (panel));
        });
    }

    function persistPrettyConfig() {
        var root = /** @type {Window} */ (window);
        var config = root.__versoPrettyConfig || {};
        var url = new URL(window.location.href);
        url.searchParams.set(
            "pretty",
            (
                config.backends ||
                getPrettyBackends().map(function (backend) {
                    return backend.id;
                })
            ).join(","),
        );
        url.searchParams.set("prettyCompare", config.compare === true ? "1" : "0");
        url.searchParams.set("prettyBackend", config.backend || "js");
        url.searchParams.set("prettyColumns", String(prettyComparisonColumns()));
        url.searchParams.set("prettyControls", config.controls === true ? "1" : "0");
        window.history.replaceState(null, "", url);
    }

    function initPrettyControls() {
        var root = /** @type {Window} */ (window);
        var config = root.__versoPrettyConfig;
        if (!config || config.controls !== true) return;
        prettyControls = document.createElement("details");
        prettyControls.className = "pretty-controls";
        document.body.appendChild(prettyControls);
        renderPrettyControls();
    }

    function renderPrettyControls() {
        if (!prettyControls) return;
        var wasOpen = prettyControls.open;
        var root = /** @type {Window} */ (window);
        var config = root.__versoPrettyConfig || (root.__versoPrettyConfig = {});
        var backends = getPrettyBackends();
        var selected = new Set(
            Array.isArray(config.backends)
                ? config.backends
                : backends.map(function (backend) {
                      return backend.id;
                  }),
        );
        var selectedCount = backends.filter(function (backend) {
            return selected.has(backend.id);
        }).length;

        var summary = document.createElement("summary");
        summary.textContent = "Formatters " + selectedCount + "/" + backends.length;
        var menu = document.createElement("div");
        menu.className = "pretty-controls-menu";

        var compareLabel = document.createElement("label");
        compareLabel.className = "pretty-controls-toggle";
        var compareInput = document.createElement("input");
        compareInput.type = "checkbox";
        compareInput.checked = config.compare === true;
        compareLabel.append(compareInput, document.createTextNode(" Compare panes"));
        compareInput.addEventListener("change", function () {
            config.compare = compareInput.checked;
            persistPrettyConfig();
            reflowPrettyPanels();
        });
        menu.appendChild(compareLabel);

        var processors = document.createElement("fieldset");
        var legend = document.createElement("legend");
        legend.textContent = "Processors";
        processors.appendChild(legend);
        backends.forEach(function (backend) {
            var label = document.createElement("label");
            label.className = "pretty-controls-backend";
            var input = document.createElement("input");
            input.type = "checkbox";
            input.value = backend.id;
            input.checked = selected.has(backend.id);
            var name = document.createElement("span");
            name.className = "pretty-controls-name";
            name.textContent = backend.label;
            var state = typeof backend.status === "function" ? backend.status() : "ready";
            var status = document.createElement("span");
            status.className =
                "pretty-controls-status status-" +
                state.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
            status.textContent = state;
            var capabilities = backend.capabilities;
            var capability = document.createElement("span");
            capability.className = "pretty-controls-capability";
            capability.textContent = capabilities
                ? capabilities.output + " · " + capabilities.width
                : "custom";
            label.append(input, name, capability, status);
            input.addEventListener("change", function () {
                var next = new Set(
                    Array.isArray(config.backends)
                        ? config.backends
                        : backends.map(function (candidate) {
                              return candidate.id;
                          }),
                );
                if (input.checked) next.add(backend.id);
                else next.delete(backend.id);
                if (next.size === 0) {
                    input.checked = true;
                    return;
                }
                config.backends = backends
                    .map(function (candidate) {
                        return candidate.id;
                    })
                    .filter(function (id) {
                        return next.has(id);
                    });
                persistPrettyConfig();
                reflowPrettyPanels();
                renderPrettyControls();
            });
            processors.appendChild(label);
        });
        menu.appendChild(processors);

        var columnsLabel = document.createElement("label");
        columnsLabel.className = "pretty-controls-columns";
        columnsLabel.appendChild(document.createTextNode("Shared columns "));
        var columnsInput = document.createElement("input");
        columnsInput.type = "number";
        columnsInput.min = "1";
        columnsInput.max = "240";
        columnsInput.step = "1";
        columnsInput.value = String(prettyComparisonColumns());
        columnsInput.addEventListener("change", function () {
            var columns = Number(columnsInput.value);
            if (!Number.isInteger(columns) || columns < 1 || columns > 240) {
                columnsInput.value = String(prettyComparisonColumns());
                return;
            }
            config.columns = columns;
            persistPrettyConfig();
            reflowPrettyPanels();
        });
        columnsLabel.appendChild(columnsInput);
        menu.appendChild(columnsLabel);

        var primaryLabel = document.createElement("label");
        primaryLabel.className = "pretty-controls-primary";
        primaryLabel.appendChild(document.createTextNode("Single backend "));
        var primary = document.createElement("select");
        backends.forEach(function (backend) {
            var option = document.createElement("option");
            option.value = backend.id;
            option.textContent = backend.label;
            option.selected = backend.id === (config.backend || "js");
            primary.appendChild(option);
        });
        primary.addEventListener("change", function () {
            config.backend = primary.value;
            persistPrettyConfig();
            reflowPrettyPanels();
        });
        primaryLabel.appendChild(primary);
        menu.appendChild(primaryLabel);

        var note = document.createElement("p");
        note.className = "pretty-controls-note";
        note.textContent = "Comparison uses one deterministic column budget for every processor.";
        menu.appendChild(note);

        prettyControls.replaceChildren(summary, menu);
        prettyControls.open = wasOpen;
    }

    // ---- Per-block setup ----

    /** @param {Element} blockEl */
    function setupBlock(blockEl) {
        var block = /** @type {PanelBlock} */ (blockEl);
        var codeEl = /** @type {Element} */ (block.querySelector("code.hl.lean.block"));
        var panel = /** @type {InfoPanel} */ (block.querySelector(".info-panel"));
        if (!block.querySelector("code.hl.lean.block") || !block.querySelector(".info-panel"))
            return;

        block._activeSource = null;

        // Click handler on code element
        codeEl.addEventListener("click", function (e) {
            var chain = findClickableChain(/** @type {Element} */ (e.target), codeEl);
            var chosen = cycleClickable(block, chain);
            if (chosen) {
                clearHoverPreview(codeEl);
                updatePanel(panel, chosen, block);
            }
        });

        // Hover preview — show what would be selected on click
        codeEl.addEventListener("mouseover", function (e) {
            var chain = findClickableChain(/** @type {Element} */ (e.target), codeEl);
            var chosen = cycleClickable(block, chain);
            if (chosen && chosen !== block._activeSource) {
                clearHoverPreview(codeEl);
                chosen.classList.add("panel-hover");
                drawElementOutline(codeEl, chosen, "panel-outline-hover");
            } else {
                clearHoverPreview(codeEl);
            }
        });
        /** @type {HTMLElement} */ (codeEl).addEventListener("mouseout", function (e) {
            if (!e.relatedTarget || !codeEl.contains(/** @type {Node} */ (e.relatedTarget))) {
                clearHoverPreview(codeEl);
            }
        });

        // Binding highlighting — works across code and panel
        /** @param {Event} e */
        function onBindingOver(e) {
            var tok = /** @type {Element} */ (e.target).closest(".token[data-binding]");
            if (!tok) return;
            var binding = tok.getAttribute("data-binding");
            if (!binding) return;
            var sel = '.token[data-binding="' + binding + '"]';
            codeEl.querySelectorAll(sel).forEach(function (t) {
                t.classList.add("binding-hl");
            });
            panel.querySelectorAll(sel).forEach(function (t) {
                t.classList.add("binding-hl");
            });
        }
        /** @param {Event} e */
        function onBindingOut(e) {
            var tok = /** @type {Element} */ (e.target).closest(".token[data-binding]");
            if (!tok) return;
            codeEl.querySelectorAll(".token.binding-hl").forEach(function (t) {
                t.classList.remove("binding-hl");
            });
            panel.querySelectorAll(".token.binding-hl").forEach(function (t) {
                t.classList.remove("binding-hl");
            });
        }
        codeEl.addEventListener("mouseover", onBindingOver);
        codeEl.addEventListener("mouseout", onBindingOut);
        panel.addEventListener("mouseover", onBindingOver);
        panel.addEventListener("mouseout", onBindingOut);

        // Divider drag
        var divider = block.querySelector(".panel-divider");
        if (divider) setupDividerDrag(block, /** @type {HTMLElement} */ (divider));

        // ResizeObserver for reflowing rich format content and redrawing the
        // focus outline (the code may rewrap when the divider moves)
        if (typeof ResizeObserver !== "undefined") {
            /** @type {ReturnType<typeof setTimeout> | null} */
            var reflowTimer = null;
            var observer = new ResizeObserver(function () {
                if (reflowTimer) clearTimeout(reflowTimer);
                reflowTimer = setTimeout(function () {
                    reflowPanel(panel);
                    redrawFocusOutline(block);
                }, 100);
            });
            observer.observe(panel);
            observer.observe(codeEl);
        }
    }

    /** @param {Element} codeEl */
    function clearHoverPreview(codeEl) {
        codeEl.querySelectorAll(".panel-hover").forEach(function (el) {
            el.classList.remove("panel-hover");
        });
        setOutlinePath(codeEl, "panel-outline-hover", "");
    }

    // ---- Focus/hover outline overlay ----
    //
    // CSS `outline` on an inline element that wraps across lines is drawn as a
    // separate closed box per line fragment in Firefox and Safari (only
    // Chromium merges the fragments). To get one contiguous border in every
    // browser we draw it ourselves: merge the element's client rects (one per
    // line) into a single staircase polygon and stroke it in an SVG overlay.

    var SVG_NS = "http://www.w3.org/2000/svg";

    /**
     * Get (or create) the outline overlay for a code block, with one path for
     * the focused element and one for the hover preview.
     * @param {Element} codeEl
     * @return {SVGSVGElement}
     */
    function ensureOutlineSvg(codeEl) {
        var existing = codeEl.querySelector(":scope > svg.panel-outline-svg");
        if (existing) return /** @type {SVGSVGElement} */ (existing);
        var svg = /** @type {SVGSVGElement} */ (document.createElementNS(SVG_NS, "svg"));
        svg.setAttribute("class", "panel-outline-svg");
        svg.setAttribute("aria-hidden", "true");
        ["panel-outline-focus", "panel-outline-hover"].forEach(function (cls) {
            var path = document.createElementNS(SVG_NS, "path");
            path.setAttribute("class", cls);
            svg.appendChild(path);
        });
        codeEl.appendChild(svg);
        return svg;
    }

    /**
     * @param {Element} codeEl
     * @param {string} cls
     * @param {string} d
     */
    function setOutlinePath(codeEl, cls, d) {
        var svg = ensureOutlineSvg(codeEl);
        var path = svg.querySelector("." + cls);
        if (path) path.setAttribute("d", d);
    }

    /**
     * Merge an element's client rects into one rect per line.
     * @param {Element} el
     * @return {Array<{left: number, right: number, top: number, bottom: number}>}
     */
    function lineRects(el) {
        /** @type {Array<{left: number, right: number, top: number, bottom: number}>} */
        var lines = [];
        var rects = el.getClientRects();
        for (var i = 0; i < rects.length; i++) {
            var r = rects[i];
            if (r.width === 0 || r.height === 0) continue;
            var merged = false;
            for (var j = 0; j < lines.length; j++) {
                var ln = lines[j];
                // Same line if the vertical ranges mostly overlap
                var overlap = Math.min(ln.bottom, r.bottom) - Math.max(ln.top, r.top);
                if (overlap > 0.5 * Math.min(ln.bottom - ln.top, r.height)) {
                    ln.left = Math.min(ln.left, r.left);
                    ln.right = Math.max(ln.right, r.right);
                    ln.top = Math.min(ln.top, r.top);
                    ln.bottom = Math.max(ln.bottom, r.bottom);
                    merged = true;
                    break;
                }
            }
            if (!merged) lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
        lines.sort(function (a, b) {
            return a.top - b.top;
        });
        return lines;
    }

    /**
     * Draw a single contiguous outline around all line fragments of `el`,
     * into the overlay path identified by `cls` ("" for el === null clears it).
     * @param {Element} codeEl
     * @param {Element | null} el
     * @param {string} cls
     */
    function drawElementOutline(codeEl, el, cls) {
        if (!el) {
            setOutlinePath(codeEl, cls, "");
            return;
        }
        var lines = lineRects(el);
        if (lines.length === 0) {
            setOutlinePath(codeEl, cls, "");
            return;
        }

        // Coordinates are computed relative to the SVG overlay itself, and
        // divided by the reveal.js zoom so they live in element-space pixels.
        var svg = ensureOutlineSvg(codeEl);
        var origin = svg.getBoundingClientRect();
        var scale =
            codeEl.getBoundingClientRect().width /
                /** @type {HTMLElement} */ (codeEl).offsetWidth || 1;
        var pad = 2; // outline offset, in element-space pixels

        /** @param {number} x */
        function relX(x) {
            return (x - origin.left) / scale;
        }
        /** @param {number} y */
        function relY(y) {
            return (y - origin.top) / scale;
        }

        var n = lines.length;
        // Vertical boundaries between consecutive lines, so adjacent fragments
        // share an edge instead of leaving a gap or double border.
        /** @type {number[]} */
        var bounds = [];
        for (var i = 0; i < n - 1; i++) {
            bounds.push(relY((lines[i].bottom + lines[i + 1].top) / 2));
        }

        /** @type {Array<{x: number, y: number}>} */
        var pts = [];
        /**
         * @param {number} x
         * @param {number} y
         */
        function pt(x, y) {
            // Skip zero-length jogs (e.g. consecutive lines with equal edges)
            var last = pts[pts.length - 1];
            if (last && Math.abs(last.x - x) < 0.5 && Math.abs(last.y - y) < 0.5) return;
            pts.push({ x: x, y: y });
        }

        // Clockwise: across the top, down the right side (jogging at each line
        // boundary), back across the bottom, and up the left side.
        pt(relX(lines[0].left) - pad, relY(lines[0].top) - pad);
        pt(relX(lines[0].right) + pad, relY(lines[0].top) - pad);
        for (var i = 0; i < n - 1; i++) {
            pt(relX(lines[i].right) + pad, bounds[i]);
            pt(relX(lines[i + 1].right) + pad, bounds[i]);
        }
        pt(relX(lines[n - 1].right) + pad, relY(lines[n - 1].bottom) + pad);
        pt(relX(lines[n - 1].left) - pad, relY(lines[n - 1].bottom) + pad);
        for (var i = n - 1; i > 0; i--) {
            pt(relX(lines[i].left) - pad, bounds[i - 1]);
            pt(relX(lines[i - 1].left) - pad, bounds[i - 1]);
        }

        setOutlinePath(codeEl, cls, roundedPathFrom(pts, 4));
    }

    /**
     * Build an SVG path for a closed polygon, rounding each corner with a
     * quadratic curve of the given radius (clamped to half of each adjacent
     * segment so short jogs stay well-formed).
     * @param {Array<{x: number, y: number}>} pts
     * @param {number} radius
     * @return {string}
     */
    function roundedPathFrom(pts, radius) {
        var n = pts.length;
        if (n < 3) return "";
        /** @type {string[]} */
        var parts = [];
        for (var i = 0; i < n; i++) {
            var prev = pts[(i + n - 1) % n];
            var cur = pts[i];
            var next = pts[(i + 1) % n];
            var inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
            var outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
            if (inLen === 0 || outLen === 0) {
                parts.push((i === 0 ? "M" : "L") + cur.x.toFixed(2) + " " + cur.y.toFixed(2));
                continue;
            }
            var r = Math.min(radius, inLen / 2, outLen / 2);
            // Corner start: back off along the incoming edge; corner end:
            // advance along the outgoing edge.
            var sx = cur.x + ((prev.x - cur.x) / inLen) * r;
            var sy = cur.y + ((prev.y - cur.y) / inLen) * r;
            var ex = cur.x + ((next.x - cur.x) / outLen) * r;
            var ey = cur.y + ((next.y - cur.y) / outLen) * r;
            parts.push(
                (i === 0 ? "M" : "L") + sx.toFixed(2) + " " + sy.toFixed(2),
                "Q" +
                    cur.x.toFixed(2) +
                    " " +
                    cur.y.toFixed(2) +
                    " " +
                    ex.toFixed(2) +
                    " " +
                    ey.toFixed(2),
            );
        }
        return parts.join(" ") + " Z";
    }

    /**
     * Redraw the focus outline of a block (e.g. after a resize or rewrap).
     * @param {PanelBlock} block
     */
    function redrawFocusOutline(block) {
        var codeEl = block.querySelector("code.hl.lean.block");
        if (!codeEl) return;
        drawElementOutline(codeEl, block._activeSource, "panel-outline-focus");
    }

    // ---- Clickable element discovery ----

    /**
     * @param {Element} el
     * @return {boolean}
     */
    function isClickable(el) {
        return (
            el.classList.contains("tactic") ||
            el.classList.contains("has-info") ||
            el.hasAttribute("data-verso-hover")
        );
    }

    /**
     * Collect clickable ancestors from target up to codeEl, outermost first.
     * @param {Element} target
     * @param {Element} codeEl
     * @return {Element[]}
     */
    function findClickableChain(target, codeEl) {
        /** @type {Element[]} */
        var chain = [];
        /** @type {Element | null} */
        var el = target;
        while (el && el !== codeEl) {
            if (isClickable(el)) chain.push(el);
            el = el.parentElement;
        }
        chain.reverse(); // outermost first
        return chain;
    }

    /**
     * Pick which element to select: outermost if nothing active in this chain,
     * otherwise cycle inward from the active element toward the click target.
     * @param {PanelBlock} block
     * @param {Element[]} chain
     * @return {Element | null}
     */
    function cycleClickable(block, chain) {
        if (chain.length === 0) return null;
        var active = block._activeSource;
        var idx = active ? chain.indexOf(active) : -1;
        if (idx >= 0 && idx < chain.length - 1) {
            return chain[idx + 1];
        }
        return chain[0];
    }

    // ---- Panel update ----

    /**
     * @param {InfoPanel} panel
     * @param {Element} el
     * @param {PanelBlock} block
     */
    function updatePanel(panel, el, block) {
        // Clear previous focus
        var codeEl = block.querySelector("code.hl.lean.block");
        if (codeEl) {
            codeEl.querySelectorAll(".panel-focus").forEach(function (f) {
                f.classList.remove("panel-focus");
            });
        }

        block._activeSource = el;
        el.classList.add("panel-focus");
        if (codeEl) drawElementOutline(codeEl, el, "panel-outline-focus");

        // Store the source element for reflow on resize
        panel._richFormatSource = null;
        setPrettyComparisonActive(panel, false);

        /** @type {string | null} */
        var html = "";

        if (el.classList.contains("tactic")) {
            // `:scope >` restricts to this tactic's _own_ state. A tactic with nested child tactics
            // (e.g. a multi-step `rw`) holds its own `.tactic-state` as a direct child, after the
            // nested tactics. Each child has its own `.tactic-state`. It's important to avoid
            // selecting one of them by accident.
            var ts = el.querySelector(":scope > .tactic-state");
            if (ts) {
                var richFmt = ts.getAttribute("data-rich-format");
                if (richFmt && typeof goalsToHtml === "function") {
                    panel._richFormatSource = ts;
                    try {
                        var goalsData = JSON.parse(richFmt);
                        renderGoalsFormat(panel, goalsData);
                        html = null; // already set innerHTML
                    } catch (e) {
                        html = '<span class="hl lean">' + ts.innerHTML + "</span>";
                        panel._richFormatSource = null;
                    }
                } else {
                    html = '<span class="hl lean">' + ts.innerHTML + "</span>";
                }
            }
        } else if (el.classList.contains("has-info")) {
            // `:scope >` ensures that nested info isn't chosen instead of this element's info.
            var msgs = el.querySelector(":scope > .hover-info.messages");
            if (msgs) html = '<span class="hl lean">' + msgs.innerHTML + "</span>";
        } else if (el.hasAttribute("data-verso-hover")) {
            var id = el.getAttribute("data-verso-hover");
            html = lookupHoverDoc(id);
        }

        if (html !== null) panel.innerHTML = html;

        // Check for reflowable signature format data in hover content
        var sigCode = /** @type {HTMLElement | null} */ (
            panel.querySelector("code[data-rich-format]")
        );
        if (sigCode && typeof formatToHtml === "function") {
            try {
                var fmtData = JSON.parse(sigCode.getAttribute("data-rich-format") || "{}");
                panel._richFormatSource = sigCode;
                renderSignatureFormat(panel, sigCode, fmtData);
            } catch (e) {
                // Fall back to plain text signature on error
                panel._richFormatSource = null;
            }
        }

        // Render docstrings with marked
        if (typeof marked !== "undefined") {
            var m = /** @type {typeof marked} */ (marked);
            panel.querySelectorAll(".docstring").forEach(function (ds) {
                ds.innerHTML = /** @type {string} */ (m.parse(ds.textContent || ""));
            });
        }
    }

    /**
     * Create a DOM measurer for text and element width measurement.
     * @param {HTMLElement} panel
     * @return {DOMMeasurer}
     */
    function getPanelMeasurer(panel) {
        return createDOMMeasurer(panel);
    }

    /**
     * @param {HTMLElement} panel
     * @param {boolean} active
     */
    function setPrettyComparisonActive(panel, active) {
        var block = panel.closest(".code-with-panel");
        if (block) block.classList.toggle("pretty-compare-active", active);
    }

    /**
     * @return {boolean}
     */
    function prettyComparisonEnabled() {
        var root = /** @type {Window} */ (window);
        var config = root.__versoPrettyConfig;
        return !!(config && config.compare === true);
    }

    /**
     * @return {string}
     */
    function selectedPrettyBackend() {
        var root = /** @type {Window} */ (window);
        var config = root.__versoPrettyConfig;
        var backend = config && config.backend;
        return typeof backend === "string" && backend.length > 0 ? backend : "js";
    }

    /**
     * @param {HTMLElement} el
     * @return {number}
     */
    function contentWidth(el) {
        var style = getComputedStyle(el);
        return (
            el.clientWidth -
            parseFloat(style.paddingLeft || "0") -
            parseFloat(style.paddingRight || "0")
        );
    }

    /**
     * @param {number} ms
     * @return {string}
     */
    function formatTiming(ms) {
        if (!Number.isFinite(ms)) return "";
        if (ms < 0.1) return "<0.1 ms";
        return ms.toFixed(ms < 10 ? 1 : 0) + " ms";
    }

    /**
     * @param {HTMLElement} timeEl
     * @param {PrettyTimings} timings
     * @param {number} wallMs
     */
    function setTimingDetails(timeEl, timings, wallMs) {
        timeEl.textContent = formatTiming(timings.totalMs);
        var details = [
            "Formatter total: " + formatTiming(timings.totalMs),
            "Marshal: " + formatTiming(timings.marshalMs),
        ];
        /** @type {Array<[keyof PrettyTimings, string]>} */
        var phaseDetails = [
            ["adapterInputMs", "  Verso input"],
            ["normalizeMs", "  Normalize"],
            ["allocateMs", "  Allocate"],
            ["encodeMs", "  Encode"],
        ];
        phaseDetails.forEach(function (detail) {
            var value = timings[detail[0]];
            if (typeof value === "number" && Number.isFinite(value)) {
                details.push(detail[1] + ": " + formatTiming(value));
            }
        });
        details.push(
            "Execute: " + formatTiming(timings.executeMs),
            "Decode: " + formatTiming(timings.decodeMs),
            "HTML: " + formatTiming(timings.renderMs),
        );
        if (
            typeof timings.inputBytes === "number" &&
            typeof timings.rawObjects === "number" &&
            typeof timings.allocationCalls === "number"
        ) {
            details.push(
                "Input arena: " +
                    Math.round(timings.inputBytes) +
                    " B, " +
                    Math.round(timings.rawObjects) +
                    " objects, " +
                    Math.round(timings.allocationCalls) +
                    " allocation" +
                    (timings.allocationCalls === 1 ? "" : "s"),
            );
        }
        if (
            typeof timings.requestBytes === "number" &&
            typeof timings.responseBytes === "number" &&
            typeof timings.formatNodes === "number"
        ) {
            details.push(
                "Wire: " +
                    Math.round(timings.requestBytes) +
                    " B request, " +
                    Math.round(timings.responseBytes) +
                    " B response, " +
                    Math.round(timings.formatNodes) +
                    " nodes",
            );
        }
        if (
            typeof timings.heapBytesBefore === "number" &&
            typeof timings.heapBytesAfter === "number"
        ) {
            details.push(
                "Emscripten heap: " +
                    Math.round(timings.heapBytesBefore) +
                    " → " +
                    Math.round(timings.heapBytesAfter) +
                    " B",
            );
        }
        details.push("Panel wall time: " + formatTiming(wallMs));
        timeEl.title = details.join("\n");
        timeEl.setAttribute("aria-label", timeEl.title);
        timeEl.dataset.marshalMs = String(timings.marshalMs);
        timeEl.dataset.executeMs = String(timings.executeMs);
        timeEl.dataset.decodeMs = String(timings.decodeMs);
        timeEl.dataset.renderMs = String(timings.renderMs);
        timeEl.dataset.totalMs = String(timings.totalMs);
        timeEl.dataset.wallMs = String(wallMs);
    }

    /**
     * @param {HTMLElement} container
     * @return {Array<{
     *   backend: PrettyBackendDefinition,
     *   body: HTMLElement,
     *   time: HTMLElement
     * }>}
     */
    function setupPrettyComparison(container) {
        var comparison = document.createElement("div");
        comparison.className = "pretty-compare";
        var panes = selectedPrettyBackends().map(function (backend) {
            var pane = document.createElement("div");
            pane.className = "pretty-compare-pane";
            pane.dataset.prettyBackend = backend.id;

            var header = document.createElement("div");
            header.className = "pretty-compare-header";
            var label = document.createElement("span");
            label.textContent = backend.label;
            if (backend.capabilities) {
                label.title =
                    "Output: " +
                    backend.capabilities.output +
                    "\nBackend width model: " +
                    backend.capabilities.width +
                    "\nComparison width model: shared columns";
            }
            var time = document.createElement("span");
            time.className = "pretty-compare-time";
            header.append(label, time);

            var body = document.createElement("div");
            body.className = "pretty-compare-body";
            pane.append(header, body);
            comparison.append(pane);
            return { backend: backend, body: body, time: time };
        });
        container.replaceChildren(comparison);
        return panes;
    }

    /**
     * @param {HTMLElement} body
     * @param {*} goalsData
     * @param {string} backend
     * @param {HTMLElement} timeEl
     */
    function renderGoalsPane(body, goalsData, backend, timeEl) {
        var start = performance.now();
        var result = goalsToHtml(goalsData);
        body.innerHTML = '<span class="hl lean">' + result.html + "</span>";
        var columns = prettyComparisonColumns();
        var measurer = createColumnMeasurer(columns);
        var timings = fillReflowedSpans(body, result.formats, measurer, backend, columns);
        setTimingDetails(timeEl, timings, performance.now() - start);
    }

    /**
     * @param {HTMLElement} panel
     * @param {*} goalsData
     */
    function renderGoalsFormat(panel, goalsData) {
        var comparing = prettyComparisonEnabled() && typeof formatToHtmlTimed === "function";
        setPrettyComparisonActive(panel, comparing);
        if (comparing) {
            var panes = setupPrettyComparison(panel);
            panes.forEach(function (pane) {
                renderGoalsPane(pane.body, goalsData, pane.backend.id, pane.time);
            });
            return;
        }

        var result = goalsToHtml(goalsData);
        // Pass 1: insert structural HTML so table layout computes cell widths.
        panel.innerHTML = '<span class="hl lean">' + result.html + "</span>";
        // Pass 2: measure actual .type cell widths and format expressions.
        var measurer = getPanelMeasurer(panel);
        fillReflowedSpans(panel, result.formats, measurer, selectedPrettyBackend());
    }

    /**
     * @param {HTMLElement} body
     * @param {*} fmtData
     * @param {string} backend
     * @param {HTMLElement} timeEl
     */
    function renderSignaturePane(body, fmtData, backend, timeEl) {
        var start = performance.now();
        var columns = prettyComparisonColumns();
        var measurer = createColumnMeasurer(columns);
        var timed = formatToHtmlTimed(fmtData.fmt, fmtData.annotations, columns, measurer, backend);
        body.innerHTML =
            '<span class="reflowed">' +
            (timed.html === null
                ? '<span class="pretty-compare-unavailable">unavailable</span>'
                : timed.html) +
            "</span>";
        setTimingDetails(timeEl, timed.timings, performance.now() - start);
    }

    /**
     * @param {HTMLElement} panel
     * @param {HTMLElement} sigCode
     * @param {*} fmtData
     */
    function renderSignatureFormat(panel, sigCode, fmtData) {
        var comparing = prettyComparisonEnabled() && typeof formatToHtmlTimed === "function";
        setPrettyComparisonActive(panel, comparing);
        if (comparing) {
            var panes = setupPrettyComparison(sigCode);
            panes.forEach(function (pane) {
                renderSignaturePane(pane.body, fmtData, pane.backend.id, pane.time);
            });
            return;
        }

        var measurer = getPanelMeasurer(panel);
        var rendered = formatToHtmlWithBackend(
            fmtData.fmt,
            fmtData.annotations,
            contentWidth(panel),
            measurer,
            selectedPrettyBackend(),
        );
        sigCode.innerHTML =
            '<span class="reflowed">' +
            (rendered === null
                ? '<span class="pretty-compare-unavailable">unavailable</span>'
                : rendered) +
            "</span>";
    }

    /**
     * Reflow the panel's rich format content at current width.
     * @param {InfoPanel} panel
     */
    function reflowPanel(panel) {
        var source = panel._richFormatSource;
        if (!source) return;
        var richFmt = source.getAttribute("data-rich-format");
        if (!richFmt) return;
        try {
            var parsed = JSON.parse(richFmt);
            // Detect whether this is goal data (array) or signature format data (has "fmt" key)
            if (Array.isArray(parsed) && typeof goalsToHtml === "function") {
                renderGoalsFormat(panel, parsed);
            } else if (parsed.fmt && typeof formatToHtml === "function") {
                renderSignatureFormat(panel, /** @type {HTMLElement} */ (source), parsed);
            }
        } catch (e) {
            // Fall back to pre-rendered HTML on error
        }
    }

    /**
     * @param {string | null} id
     * @return {string}
     */
    function lookupHoverDoc(id) {
        if (!docsJson || !id) return "";
        var entry = docsJson[id];
        if (!entry) return "";
        // entry is the HTML string from verso hover data
        if (typeof entry === "string") {
            return '<span class="hl lean">' + entry + "</span>";
        }
        // Could be an object with .hover field
        if (entry.hover) {
            return '<span class="hl lean">' + entry.hover + "</span>";
        }
        return "";
    }

    // ---- Fragment automation ----

    /** @param {{ fragment: HTMLElement }} evt */
    function onFragmentShown(evt) {
        var frag = evt.fragment;
        if (!frag || !frag.classList.contains("slide-click-only")) return;

        var block = /** @type {PanelBlock | null} */ (frag.closest(".code-with-panel"));
        if (!block) return;

        var panel = /** @type {InfoPanel | null} */ (block.querySelector(".info-panel"));
        if (!panel) return;

        // Find the clickable element targeted by this fragment
        var target = frag.querySelector(".tactic, .has-info, [data-verso-hover]");
        if (target) updatePanel(panel, target, block);
    }

    /** @param {{ fragment: HTMLElement }} evt */
    function onFragmentHidden(evt) {
        var frag = evt.fragment;
        if (!frag || !frag.classList.contains("slide-click-only")) return;

        var block = /** @type {PanelBlock | null} */ (frag.closest(".code-with-panel"));
        if (!block) return;

        syncPanelToLastVisible(block);
    }

    function onSlideChanged() {
        var slide = Reveal.getCurrentSlide();
        if (!slide) return;
        slide.querySelectorAll(".code-with-panel").forEach(function (el) {
            syncPanelToLastVisible(/** @type {PanelBlock} */ (el));
        });
    }

    /** @param {PanelBlock} block */
    function syncPanelToLastVisible(block) {
        var panel = /** @type {InfoPanel | null} */ (block.querySelector(".info-panel"));
        if (!panel) return;

        // Find the last visible slide-click-only fragment
        var frags = block.querySelectorAll(".fragment.slide-click-only.visible");
        if (frags.length > 0) {
            var last = frags[frags.length - 1];
            var target = last.querySelector(".tactic, .has-info, [data-verso-hover]");
            if (target) {
                updatePanel(panel, target, block);
                return;
            }
        }

        // No visible fragments — clear panel
        var codeEl = block.querySelector("code.hl.lean.block");
        if (codeEl) {
            codeEl.querySelectorAll(".panel-focus").forEach(function (f) {
                f.classList.remove("panel-focus");
            });
            drawElementOutline(codeEl, null, "panel-outline-focus");
        }
        block._activeSource = null;
        setPrettyComparisonActive(panel, false);
        panel.innerHTML = "";
    }

    // ---- Divider drag ----

    /**
     * @param {HTMLElement} block
     * @param {HTMLElement} divider
     */
    function setupDividerDrag(block, divider) {
        var dragging = false;

        divider.addEventListener("mousedown", function (e) {
            e.preventDefault();
            dragging = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", function (e) {
            if (!dragging) return;
            var rect = block.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var pct = x / rect.width;

            if (pct > 0.95) {
                // Collapse panel
                block.classList.add("panel-collapsed");
            } else {
                block.classList.remove("panel-collapsed");
                var codeFr = Math.max(0.2, Math.min(0.9, pct));
                var panelFr = 1 - codeFr;
                block.style.setProperty("--code-ratio", codeFr + "fr");
                block.style.setProperty("--panel-ratio", panelFr + "fr");
            }
        });

        document.addEventListener("mouseup", function () {
            if (!dragging) return;
            dragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        });
    }

    // ---- Entry point ----
    Reveal.on("ready", init);
})();
