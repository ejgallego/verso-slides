// @ts-check
// pretty.js — Direct port of Lean 4's Std.Format pretty printer
// Source: Init/Data/Format/Basic.lean (leanprover/lean4-nightly:nightly-2026-02-23-rev2)
//
// Renders a serialized Std.Format tree at a given pixel width,
// producing an array of output segments with tag annotations.
// Uses DOM-based measurement for accurate pixel widths.

"use strict";

/**
 * @typedef {{ type: string, [key: string]: * }} FormatNode
 *
 * @typedef {{
 *   measure: (s: string) => number,
 *   spaceWidth: number,
 *   measureElWidth: (el: Element) => number,
 *   cleanup: () => void
 * }} DOMMeasurer
 *
 * @typedef {{ foundLine: boolean, foundFlattenedHardLine: boolean, space: number }} SpaceResult
 *
 * @typedef {{ type: string, fits: boolean }} Fla
 *
 * @typedef {{ f: FormatNode, indent: number, activeTags: number }} WorkItem
 *
 * @typedef {{ fla: Fla, flb: "allOrNone" | "fill", items: WorkItem[] }} WorkGroup
 *
 * @typedef {{ text: string, tags: number[] }} Segment
 *
 * @typedef {{ cssClass: string, binding?: string }} TokenAnnotation
 *
 * @typedef {{
 *   column: number,
 *   tagStack: number[],
 *   segments: Segment[],
 *   annotations: Record<string, TokenAnnotation>,
 *   pushOutput: (s: string) => void,
 *   pushNewline: (indent: number) => void,
 *   startTag: (t: number) => void,
 *   endTags: (count: number) => void
 * }} RenderContext
 *
 * @typedef {{ fmt: *, annotations: Record<string, TokenAnnotation> }} FormatData
 *
 * @typedef {{ names: string[], ppType?: string | FormatData }} Hypothesis
 *
 * @typedef {{ name?: string, hypotheses: Hypothesis[], goalPrefix: string, ppConclusion?: string | FormatData }} GoalData
 *
 * @typedef {{ html: string, formats: FormatData[] }} GoalsResult
 *
 * @typedef {"marshal" | "execute" | "decode" | "render" | "total"} PrettyTimingPhase
 *
 * @typedef {{ label: string, valueMs: number, phase?: PrettyTimingPhase }} PrettyTimingDetail
 *
 * @typedef {{
 *   marshalMs: number,
 *   executeMs: number,
 *   decodeMs: number,
 *   renderMs: number,
 *   totalMs: number,
 *   details?: PrettyTimingDetail[]
 * }} PrettyTimings
 *
 * @typedef {{ segments: Segment[] | null, timings: PrettyTimings }} PrettySegmentResult
 *
 * @typedef {{ html: string | null, durationMs: number, timings: PrettyTimings }} TimedPrettyResult
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   capabilities?: { output: string, width: string },
 *   status?: () => string,
 *   ready?: Promise<*>,
 *   renderSegments?: (
 *     fmtJson: *,
 *     annotations: Record<string, TokenAnnotation>,
 *     pixelWidth: number,
 *     measurer: DOMMeasurer
 *   ) => Segment[] | null,
 *   renderTimed?: (
 *     fmtJson: *,
 *     annotations: Record<string, TokenAnnotation>,
 *     pixelWidth: number,
 *     measurer: DOMMeasurer
 *   ) => PrettySegmentResult
 * }} PrettyBackend
 */

/** @type {PrettyBackend[]} */
var prettyBackends = [];

/**
 * Register a pretty-printing backend, replacing an earlier registration with
 * the same ID. Plugins should register synchronously; their optional `ready`
 * promise may resolve after the panel has initialized.
 * @param {PrettyBackend} backend
 */
function registerPrettyBackend(backend) {
    if (
        !backend ||
        typeof backend.id !== "string" ||
        backend.id.length === 0 ||
        typeof backend.label !== "string" ||
        backend.label.length === 0 ||
        (typeof backend.renderSegments !== "function" && typeof backend.renderTimed !== "function")
    ) {
        throw new TypeError("invalid pretty backend registration");
    }

    var index = prettyBackends.findIndex(function (candidate) {
        return candidate.id === backend.id;
    });
    if (index === -1) {
        prettyBackends.push(backend);
    } else {
        prettyBackends[index] = backend;
    }
}

/** @return {PrettyBackend[]} */
function getPrettyBackends() {
    return prettyBackends.slice();
}

/**
 * @param {string} id
 * @return {PrettyBackend | null}
 */
function getPrettyBackend(id) {
    return (
        prettyBackends.find(function (candidate) {
            return candidate.id === id;
        }) || null
    );
}

/**
 * Deserialize a compact JSON format node into a tree.
 *
 * Wire format (from Highlighted.lean formatToJson):
 *   null            → nil
 *   "str"           → text(str)
 *   1               → line
 *   [2, bool]       → align(force)
 *   [3, int, sub]   → nest(indent, sub)
 *   [4, a, b]       → append(a, b)
 *   [5, sub]        → group(sub, allOrNone)
 *   [6, sub]        → group(sub, fill)
 *   [7, nat, sub]   → tag(nat, sub)
 * @param {*} json
 * @return {FormatNode}
 */
function deserializeFormat(json) {
    if (json === null || json === undefined) return { type: "nil" };
    if (json === 1) return { type: "line" };
    if (typeof json === "string") return { type: "text", str: json };
    if (!Array.isArray(json) || json.length === 0) return { type: "nil" };
    switch (json[0]) {
        case 2:
            return { type: "align", force: !!json[1] };
        case 3:
            return { type: "nest", indent: json[1], f: deserializeFormat(json[2]) };
        case 4:
            return {
                type: "append",
                f1: deserializeFormat(json[1]),
                f2: deserializeFormat(json[2]),
            };
        case 5:
            return { type: "group", f: deserializeFormat(json[1]), behavior: "allOrNone" };
        case 6:
            return { type: "group", f: deserializeFormat(json[1]), behavior: "fill" };
        case 7:
            return { type: "tag", n: json[1], f: deserializeFormat(json[2]) };
        default:
            return { type: "nil" };
    }
}

/**
 * Create a DOM-based measurer for pixel-accurate text width measurement.
 * Accounts for reveal.js CSS transform scaling.
 * @param {HTMLElement} panel
 * @return {DOMMeasurer}
 */
function createDOMMeasurer(panel) {
    var container = document.createElement("span");
    container.className = "hl lean reflowed";
    container.style.cssText =
        "position:absolute;visibility:hidden;white-space:pre;pointer-events:none";
    var probe = document.createElement("span");
    container.appendChild(probe);
    panel.appendChild(container);

    // Compute CSS transform scale factor.
    // reveal.js applies transform:scale() to slides, which makes
    // getBoundingClientRect() return viewport-scaled values while
    // clientWidth returns CSS layout pixels. We need CSS pixels.
    var clientW = panel.clientWidth;
    var scale = 1;
    if (clientW > 0) {
        scale = panel.getBoundingClientRect().width / clientW;
    }

    /** @type {Record<string, number>} */
    var cache = {};
    /** @param {string} s @return {number} */
    function measure(s) {
        if (s in cache) return cache[s];
        probe.textContent = s;
        var w = probe.getBoundingClientRect().width / scale;
        cache[s] = w;
        return w;
    }
    var spaceWidth = measure(" ");
    return {
        measure: measure,
        spaceWidth: spaceWidth,
        measureElWidth: function (el) {
            return el.getBoundingClientRect().width / scale;
        },
        cleanup: function () {
            panel.removeChild(container);
        },
    };
}

/**
 * Constructs a SpaceResult with the given values, defaulting to false/0.
 * @param {boolean} [foundLine]
 * @param {boolean} [foundFlattenedHardLine]
 * @param {number} [space]
 * @return {SpaceResult}
 */
function spaceResult(foundLine, foundFlattenedHardLine, space) {
    return {
        foundLine: foundLine || false,
        foundFlattenedHardLine: foundFlattenedHardLine || false,
        space: space || 0,
    };
}

/**
 * @param {number} w
 * @param {SpaceResult} r1
 * @param {(w2: number) => SpaceResult} r2fn
 * @return {SpaceResult}
 */
function merge(w, r1, r2fn) {
    if (r1.space > w || r1.foundLine) return r1;
    var r2 = r2fn(w - r1.space);
    return {
        foundLine: r2.foundLine,
        foundFlattenedHardLine: r2.foundFlattenedHardLine,
        space: r1.space + r2.space,
    };
}

/**
 * Measures how much horizontal space a format takes (in pixels) before a line break.
 * @param {FormatNode} f
 * @param {boolean} flatten
 * @param {number} m
 * @param {number} w
 * @param {DOMMeasurer} measurer
 * @return {SpaceResult}
 */
function spaceUptoLine(f, flatten, m, w, measurer) {
    switch (f.type) {
        case "nil":
            return spaceResult();
        case "line":
            return flatten ? spaceResult(false, false, measurer.spaceWidth) : spaceResult(true);
        case "align":
            if (flatten && !f.force) return spaceResult();
            if (w < m) return spaceResult(false, false, Math.max(0, m - w));
            return spaceResult(true);
        case "text": {
            var idx = f.str.indexOf("\n");
            if (idx === -1) {
                return spaceResult(false, false, measurer.measure(f.str));
            } else {
                return spaceResult(true, flatten, measurer.measure(f.str.substring(0, idx)));
            }
        }
        case "append":
            return merge(w, spaceUptoLine(f.f1, flatten, m, w, measurer), function (w2) {
                return spaceUptoLine(f.f2, flatten, m, w2, measurer);
            });
        case "nest":
            return spaceUptoLine(f.f, flatten, m - f.indent * measurer.spaceWidth, w, measurer);
        case "group":
            return spaceUptoLine(f.f, true, m, w, measurer);
        case "tag":
            return spaceUptoLine(f.f, flatten, m, w, measurer);
        default:
            return spaceResult();
    }
}

/**
 * @param {Fla} fla
 * @return {boolean}
 */
function shouldFlatten(fla) {
    return fla.type === "allow" && !!fla.fits;
}

/**
 * Measures space for a list of work groups. Items within each group are stored
 * in reverse order (last element = next to process), so we iterate backwards.
 * @param {WorkGroup[]} groups - groups in reverse order (last = current)
 * @param {number} col
 * @param {number} w
 * @param {DOMMeasurer} measurer
 * @return {SpaceResult}
 */
function spaceUptoLineGroups(groups, col, w, measurer) {
    var result = spaceResult();
    var remainingW = w;

    for (var gi = groups.length - 1; gi >= 0; gi--) {
        var g = groups[gi];
        var flatten = shouldFlatten(g.fla);
        for (var ii = g.items.length - 1; ii >= 0; ii--) {
            var item = g.items[ii];
            var r = spaceUptoLine(
                item.f,
                flatten,
                remainingW + col - item.indent,
                remainingW,
                measurer,
            );
            result = {
                foundLine: r.foundLine,
                foundFlattenedHardLine: result.foundFlattenedHardLine || r.foundFlattenedHardLine,
                space: result.space + r.space,
            };
            if (r.space > remainingW || r.foundLine) return result;
            remainingW -= r.space;
        }
    }
    return result;
}

/**
 * Creates a new work group with a flattening decision based on available space.
 * Items and groups are in reverse order (last = next to process).
 * @param {"allOrNone" | "fill"} flb
 * @param {WorkItem[]} items - in reverse order
 * @param {WorkGroup[]} gs - in reverse order
 * @param {number} w
 * @param {RenderContext} ctx
 * @param {DOMMeasurer} measurer
 * @return {WorkGroup[]}
 */
function pushGroup(flb, items, gs, w, ctx, measurer) {
    var k = ctx.column;
    var remaining = w - k;
    var g = { fla: { type: "allow", fits: flb === "allOrNone" }, flb: flb, items: items };
    var r = spaceUptoLineGroups([g], k, remaining, measurer);
    var r2 = merge(remaining, r, function (w2) {
        return spaceUptoLineGroups(gs, k, w2, measurer);
    });
    var fits = !r.foundFlattenedHardLine && r2.space <= remaining;
    gs.push({ fla: { type: "allow", fits: fits }, flb: flb, items: items });
    return gs;
}

/**
 * Main layout engine (iterative port of Lean's `be`). Processes work groups,
 * making flattening and line-break decisions, and emits output via the render context.
 *
 * Items within each group are stored in reverse order: the last element is
 * processed next. This allows O(1) pop/push instead of O(n) slice/concat.
 * Groups are also in reverse order (last = current group).
 *
 * @param {number} w
 * @param {WorkGroup[]} groups - in reverse order (last = current)
 * @param {RenderContext} ctx
 * @param {DOMMeasurer} measurer
 */
function be(w, groups, ctx, measurer) {
    while (groups.length > 0) {
        var g = groups[groups.length - 1];
        if (g.items.length === 0) {
            groups.pop();
            continue;
        }
        // Pop current item — O(1). g.items retains the rest.
        // Length was checked above, so pop always returns a value.
        var i = /** @type {WorkItem} */ (g.items.pop());

        switch (i.f.type) {
            case "nil":
                ctx.endTags(i.activeTags);
                break;

            case "tag":
                ctx.startTag(i.f.n);
                // Push replacement (processed next) — O(1)
                g.items.push({ f: i.f.f, indent: i.indent, activeTags: i.activeTags + 1 });
                break;

            case "append":
                // Push f1 last so it is processed next (before f2) — O(1) each
                g.items.push({ f: i.f.f2, indent: i.indent, activeTags: i.activeTags });
                g.items.push({ f: i.f.f1, indent: i.indent, activeTags: 0 });
                break;

            case "nest":
                g.items.push({
                    f: i.f.f,
                    indent: i.indent + i.f.indent * measurer.spaceWidth,
                    activeTags: i.activeTags,
                });
                break;

            case "text": {
                var s = i.f.str;
                var nlIdx = s.indexOf("\n");
                if (nlIdx === -1) {
                    ctx.pushOutput(s);
                    ctx.endTags(i.activeTags);
                } else {
                    ctx.pushOutput(s.substring(0, nlIdx));
                    ctx.pushNewline(Math.max(0, i.indent));
                    /** @type {WorkItem} */
                    var newTextItem = {
                        f: { type: "text", str: s.substring(nlIdx + 1) },
                        indent: i.indent,
                        activeTags: i.activeTags,
                    };
                    // After hard line break, re-evaluate flattening
                    if (g.fla.type === "disallow") {
                        g.items.push(newTextItem);
                    } else {
                        // Remaining items stay in g.items; add newTextItem
                        g.items.push(newTextItem);
                        // Steal items from current group, pop it, create new group
                        var remainingItems = g.items;
                        groups.pop();
                        groups = pushGroup(g.flb, remainingItems, groups, w, ctx, measurer);
                    }
                }
                break;
            }

            case "line":
                if (g.flb === "allOrNone") {
                    if (shouldFlatten(g.fla)) {
                        ctx.pushOutput(" ");
                    } else {
                        ctx.pushNewline(Math.max(0, i.indent));
                    }
                    ctx.endTags(i.activeTags);
                } else {
                    // fill behavior
                    if (shouldFlatten(g.fla)) {
                        // Try to fit next item too — need a copy since pushGroup mutates
                        var savedItems = g.items.slice();
                        var savedGroups = groups.slice(0, groups.length - 1);
                        var tryGs = pushGroup(
                            "fill",
                            savedItems,
                            savedGroups,
                            w - measurer.spaceWidth,
                            ctx,
                            measurer,
                        );
                        var nextG = tryGs[tryGs.length - 1];
                        if (shouldFlatten(nextG.fla)) {
                            ctx.pushOutput(" ");
                            ctx.endTags(i.activeTags);
                            groups = tryGs;
                        } else {
                            // Break: use original items
                            ctx.pushNewline(Math.max(0, i.indent));
                            ctx.endTags(i.activeTags);
                            var breakItems = g.items;
                            groups.pop();
                            groups = pushGroup("fill", breakItems, groups, w, ctx, measurer);
                        }
                    } else {
                        ctx.pushNewline(Math.max(0, i.indent));
                        ctx.endTags(i.activeTags);
                        var breakItems2 = g.items;
                        groups.pop();
                        groups = pushGroup("fill", breakItems2, groups, w, ctx, measurer);
                    }
                }
                break;

            case "align":
                if (shouldFlatten(g.fla) && !i.f.force) {
                    ctx.endTags(i.activeTags);
                } else {
                    var k = ctx.column;
                    if (k < i.indent) {
                        var pad = Math.max(0, i.indent - k);
                        ctx.pushOutput(" ".repeat(Math.round(pad / measurer.spaceWidth)));
                    } else {
                        ctx.pushNewline(Math.max(0, i.indent));
                    }
                    ctx.endTags(i.activeTags);
                }
                break;

            case "group":
                if (shouldFlatten(g.fla)) {
                    // flatten(group f) = flatten f
                    g.items.push({ f: i.f.f, indent: i.indent, activeTags: i.activeTags });
                } else {
                    var groupItem = { f: i.f.f, indent: i.indent, activeTags: i.activeTags };
                    groups = pushGroup(i.f.behavior, [groupItem], groups, w, ctx, measurer);
                }
                break;

            default:
                // Unknown format node, skip
                ctx.endTags(i.activeTags);
                break;
        }
    }
}

/**
 * Entry point: pretty-prints a format tree at a given pixel width.
 * @param {FormatNode} f
 * @param {number} w
 * @param {number} indent
 * @param {RenderContext} ctx
 * @param {DOMMeasurer} measurer
 */
function prettyM(f, w, indent, ctx, measurer) {
    indent = indent || 0;
    be(
        w,
        [
            {
                flb: "allOrNone",
                fla: { type: "disallow", fits: false },
                items: [{ f: f, indent: indent, activeTags: 0 }],
            },
        ],
        ctx,
        measurer,
    );
}

/**
 * Creates a rendering context that collects tagged output segments.
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {DOMMeasurer} measurer
 * @return {RenderContext}
 */
function makeRenderContext(annotations, measurer) {
    return {
        column: 0,
        tagStack: [],
        segments: [], // Array of { text, tags }
        annotations: annotations || {},

        pushOutput: function (s) {
            if (s.length === 0) return;
            this.segments.push({ text: s, tags: this.tagStack.slice() });
            this.column += measurer.measure(s);
        },

        pushNewline: function (indent) {
            this.segments.push({ text: "\n", tags: [] });
            if (indent > 0) {
                var spaces = Math.round(indent / measurer.spaceWidth);
                if (spaces > 0) {
                    this.segments.push({ text: " ".repeat(spaces), tags: [] });
                }
            }
            this.column = indent;
        },

        startTag: function (t) {
            this.tagStack.push(t);
        },

        endTags: function (count) {
            for (var j = 0; j < count; j++) {
                this.tagStack.pop();
            }
        },
    };
}

/** @return {PrettyTimings} */
function emptyPrettyTimings() {
    return {
        marshalMs: 0,
        executeMs: 0,
        decodeMs: 0,
        renderMs: 0,
        totalMs: 0,
    };
}

/**
 * @param {*} value
 * @return {PrettyTimings}
 */
function requirePrettyTimings(value) {
    if (!value || typeof value !== "object") {
        throw new TypeError("pretty backend did not return phase timings");
    }
    var checked = emptyPrettyTimings();
    /** @type {Array<"marshalMs" | "executeMs" | "decodeMs" | "renderMs" | "totalMs">} */
    var timingKeys = ["marshalMs", "executeMs", "decodeMs", "renderMs", "totalMs"];
    timingKeys.forEach(function (key) {
        var timing = value[key];
        if (typeof timing !== "number" || !Number.isFinite(timing) || timing < 0) {
            throw new TypeError("invalid pretty backend timing: " + key);
        }
        checked[key] = timing;
    });
    if (value.details !== undefined) {
        if (!Array.isArray(value.details)) {
            throw new TypeError("pretty backend timing details must be an array");
        }
        var inputDetails = /** @type {*[]} */ (value.details);
        checked.details = inputDetails.map(function (detail) {
            if (
                !detail ||
                typeof detail.label !== "string" ||
                detail.label.length === 0 ||
                typeof detail.valueMs !== "number" ||
                !Number.isFinite(detail.valueMs) ||
                detail.valueMs < 0 ||
                (detail.phase !== undefined &&
                    !["marshal", "execute", "decode", "render", "total"].includes(detail.phase))
            ) {
                throw new TypeError("invalid pretty backend timing detail");
            }
            return {
                label: detail.label,
                valueMs: detail.valueMs,
                phase: detail.phase,
            };
        });
    }
    return checked;
}

/**
 * @param {PrettyTimings} target
 * @param {PrettyTimings} source
 * @return {PrettyTimings}
 */
function addPrettyTimings(target, source) {
    target.marshalMs += source.marshalMs;
    target.executeMs += source.executeMs;
    target.decodeMs += source.decodeMs;
    target.renderMs += source.renderMs;
    target.totalMs += source.totalMs;
    if (source.details) {
        var details = target.details || (target.details = []);
        source.details.forEach(function (sourceDetail) {
            var existing = details.find(function (detail) {
                return detail.label === sourceDetail.label && detail.phase === sourceDetail.phase;
            });
            if (existing) {
                existing.valueMs += sourceDetail.valueMs;
            } else {
                details.push(Object.assign({}, sourceDetail));
            }
        });
    }
    return target;
}

/**
 * A deterministic character-column measurer for formatter comparison. Every
 * backend receives the same budget instead of deriving it independently from
 * the width of its pane.
 * @param {number} columns
 * @return {DOMMeasurer}
 */
function createColumnMeasurer(columns) {
    var width = Math.max(1, Math.floor(columns));
    return {
        measure: function (text) {
            return Array.from(text).length;
        },
        spaceWidth: 1,
        measureElWidth: function () {
            return width;
        },
        cleanup: function () {},
    };
}

/**
 * Run and time the built-in JavaScript formatter.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @return {PrettySegmentResult}
 */
function formatSegmentsWithJsTimed(fmtJson, annotations, pixelWidth, measurer) {
    var started = performance.now();
    var fmt = deserializeFormat(fmtJson);
    var ctx = makeRenderContext(annotations, measurer);
    var marshaled = performance.now();
    prettyM(fmt, pixelWidth, 0, ctx, measurer);
    var executed = performance.now();
    return {
        segments: ctx.segments,
        timings: {
            marshalMs: Math.max(0, marshaled - started),
            executeMs: Math.max(0, executed - marshaled),
            decodeMs: 0,
            renderMs: 0,
            totalMs: Math.max(0, executed - started),
        },
    };
}

registerPrettyBackend({
    id: "js",
    label: "JavaScript",
    capabilities: { output: "segments", width: "pixels" },
    status: function () {
        return "ready";
    },
    renderTimed: formatSegmentsWithJsTimed,
});

/**
 * Execute one backend and normalize its phase timings.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @param {PrettyBackend} backend
 * @return {PrettySegmentResult}
 */
function renderPrettySegmentsTimed(fmtJson, annotations, pixelWidth, measurer, backend) {
    if (backend.status && backend.status() !== "ready") {
        return { segments: null, timings: emptyPrettyTimings() };
    }
    if (typeof backend.renderTimed === "function") {
        var result = backend.renderTimed(fmtJson, annotations, pixelWidth, measurer);
        if (!result || (result.segments !== null && !Array.isArray(result.segments))) {
            throw new TypeError("invalid timed pretty backend result");
        }
        return { segments: result.segments, timings: requirePrettyTimings(result.timings) };
    }
    if (typeof backend.renderSegments !== "function") {
        return { segments: null, timings: emptyPrettyTimings() };
    }
    var started = performance.now();
    var segments = backend.renderSegments(fmtJson, annotations, pixelWidth, measurer);
    var finished = performance.now();
    var timings = emptyPrettyTimings();
    timings.executeMs = Math.max(0, finished - started);
    timings.totalMs = timings.executeMs;
    return { segments: segments, timings: timings };
}

/**
 * Render a format tree and retain normalized formatter and HTML timings.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @param {string} backendId
 * @return {TimedPrettyResult}
 */
function formatToHtmlTimed(fmtJson, annotations, pixelWidth, measurer, backendId) {
    var started = performance.now();
    var backend = getPrettyBackend(backendId);
    if (!backend) {
        return { html: null, durationMs: 0, timings: emptyPrettyTimings() };
    }
    var result = renderPrettySegmentsTimed(fmtJson, annotations, pixelWidth, measurer, backend);
    var renderStarted = performance.now();
    var html = result.segments === null ? null : segmentsToHtml(result.segments, annotations);
    var finished = performance.now();
    result.timings.renderMs += Math.max(0, finished - renderStarted);
    result.timings.totalMs = Math.max(0, finished - started);
    return { html: html, durationMs: result.timings.totalMs, timings: result.timings };
}

/**
 * Render a format tree through one explicitly selected backend.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @param {string} backendId
 * @return {string | null}
 */
function formatToHtmlWithBackend(fmtJson, annotations, pixelWidth, measurer, backendId) {
    return formatToHtmlTimed(fmtJson, annotations, pixelWidth, measurer, backendId).html;
}

/**
 * Render a format tree with Verso Slides' built-in JavaScript formatter.
 * This preserves the original API for existing consumers.
 * @param {*} fmtJson  - compact array format from Highlighted.lean
 * @param {Record<string, TokenAnnotation>} annotations - tag index → { cssClass, binding }
 * @param {number} pixelWidth - target width in pixels
 * @param {DOMMeasurer} measurer
 * @return {string} HTML string
 */
function formatToHtml(fmtJson, annotations, pixelWidth, measurer) {
    return formatToHtmlWithBackend(fmtJson, annotations, pixelWidth, measurer, "js") || "";
}

/**
 * @param {Segment[]} segments
 * @param {Record<string, TokenAnnotation>} annotations
 * @return {string}
 */
function segmentsToHtml(segments, annotations) {
    var parts = [];
    for (var si = 0; si < segments.length; si++) {
        var seg = segments[si];
        var text = escapeHtml(seg.text);

        // Find the innermost tag with annotation
        var annotation = null;
        for (var ti = seg.tags.length - 1; ti >= 0; ti--) {
            var tagKey = String(seg.tags[ti]);
            if (annotations[tagKey]) {
                annotation = annotations[tagKey];
                break;
            }
        }

        if (annotation) {
            var cls = annotation.cssClass + " token";
            var bindAttr = annotation.binding
                ? ' data-binding="' + escapeHtml(annotation.binding) + '"'
                : "";
            parts.push('<span class="' + cls + '"' + bindAttr + ">" + text + "</span>");
        } else {
            parts.push(text);
        }
    }
    return parts.join("");
}

/**
 * @param {string} s
 * @return {string}
 */
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Build structural goal HTML with empty .reflowed placeholders.
 * Returns { html, formats } where formats is an array of { fmt, annotations }
 * indexed by data-fmt-idx attributes on the .reflowed spans.
 * Caller inserts html into the DOM, measures .type cell widths, then calls
 * fillReflowedSpans to format expressions at measured widths.
 * @param {GoalData[]} goalsJson
 * @return {GoalsResult}
 */
function goalsToHtml(goalsJson) {
    /** @type {FormatData[]} */
    var formats = [];
    var parts = [];
    for (var gi = 0; gi < goalsJson.length; gi++) {
        var goal = goalsJson[gi];
        var goalParts = [];

        if (goal.name) {
            goalParts.push('<span class="goal-name">' + escapeHtml(goal.name) + "</span>");
        }

        // Hypotheses
        if (goal.hypotheses.length > 0) {
            var hypParts = [];
            for (var hi = 0; hi < goal.hypotheses.length; hi++) {
                var hyp = goal.hypotheses[hi];
                var typeHtml;
                if (hyp.ppType) {
                    var fmtData =
                        typeof hyp.ppType === "string" ? JSON.parse(hyp.ppType) : hyp.ppType;
                    var idx = formats.length;
                    formats.push({ fmt: fmtData.fmt, annotations: fmtData.annotations || {} });
                    typeHtml = '<span class="reflowed" data-fmt-idx="' + idx + '"></span>';
                } else {
                    typeHtml = '<span class="no-format">(no format data)</span>';
                }
                hypParts.push(
                    '<span class="hypothesis"><span class="name">' +
                        hyp.names.map(escapeHtml).join(" ") +
                        '</span><span class="colon">:</span><span class="type">' +
                        typeHtml +
                        "</span></span>",
                );
            }
            goalParts.push('<span class="hypotheses">' + hypParts.join("") + "</span>");
        }

        // Conclusion
        var vdash = escapeHtml(goal.goalPrefix);
        var conclHtml;
        if (goal.ppConclusion) {
            var conclData =
                typeof goal.ppConclusion === "string"
                    ? JSON.parse(goal.ppConclusion)
                    : goal.ppConclusion;
            var idx = formats.length;
            formats.push({ fmt: conclData.fmt, annotations: conclData.annotations || {} });
            conclHtml = '<span class="reflowed" data-fmt-idx="' + idx + '"></span>';
        } else {
            conclHtml = '<span class="no-format">(no format data)</span>';
        }
        goalParts.push(
            '<span class="conclusion"><span class="goal-vdash">' +
                vdash +
                '</span><span class="type">' +
                conclHtml +
                "</span></span>",
        );

        parts.push('<div class="goal">' + goalParts.join("") + "</div>");
    }
    return { html: parts.join(""), formats: formats };
}

/**
 * Format expressions into .reflowed spans using measured .type cell widths.
 * @param {Element} container
 * @param {FormatData[]} formats
 * @param {DOMMeasurer} measurer
 * @param {string} [backendId]
 * @param {number} [fixedWidth]
 * @return {PrettyTimings}
 */
function fillReflowedSpans(container, formats, measurer, backendId, fixedWidth) {
    var totals = emptyPrettyTimings();
    var spans = container.querySelectorAll(".reflowed[data-fmt-idx]");
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var idx = parseInt(span.getAttribute("data-fmt-idx") || "0");
        var entry = formats[idx];
        if (!entry) continue;
        var cell = span.closest(".type");
        if (!cell) continue;
        var width = typeof fixedWidth === "number" ? fixedWidth : measurer.measureElWidth(cell);
        var rendered = formatToHtmlTimed(
            entry.fmt,
            entry.annotations,
            width,
            measurer,
            backendId || "js",
        );
        addPrettyTimings(totals, rendered.timings);
        span.innerHTML =
            rendered.html === null
                ? '<span class="pretty-compare-unavailable">unavailable</span>'
                : rendered.html;
    }
    return totals;
}
