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
 * @typedef {"auto" | "js" | "vir" | "vir-format"} PrettyBackend
 *
 * @typedef {{
 *   enabled?: boolean,
 *   runtime?: { call: (name: string, ...args: *[]) => * },
 *   backend?: PrettyBackend,
 *   jsonExportName?: string,
 *   formatExportName?: string,
 *   formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string,
 *   formatSegments?: (fmt: *, width: number, indent: number) => *,
 *   status?: string,
 *   warned?: boolean
 * }} PrettyVirBridge
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
 * @typedef {{ html: string | null, durationMs: number }} TimedPrettyResult
 */

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
 * Convert the compact serialized `Std.Format` tree to lean-vir's direct
 * object-ABI representation for `Std.Format`.
 *
 * The object ABI uses Lean's generated constructor field names rather than
 * the compact JSON node names: `nest` stores `{ indent, f }`, `append` stores
 * `{ arg1, arg2 }`, `group` stores `{ arg1, behavior }`, and `tag` stores
 * `{ arg1, arg2 }`. Nat/Int fields cross this ABI as decimal strings.
 * @param {*} json
 * @return {*}
 */
function compactFormatToStdFormat(json) {
    if (json === null) return { kind: "nil" };
    if (typeof json === "string") return { kind: "text", value: json };
    if (json === 1) return { kind: "line" };
    if (!Array.isArray(json)) throw new Error("invalid format node");
    switch (json[0]) {
        case 2:
            return { kind: "align", value: !!json[1] };
        case 3:
            return {
                kind: "nest",
                fields: { indent: String(json[1]), f: compactFormatToStdFormat(json[2]) },
            };
        case 4:
            return {
                kind: "append",
                fields: {
                    arg1: compactFormatToStdFormat(json[1]),
                    arg2: compactFormatToStdFormat(json[2]),
                },
            };
        case 5:
            return {
                kind: "group",
                fields: { arg1: compactFormatToStdFormat(json[1]), behavior: "allOrNone" },
            };
        case 6:
            return {
                kind: "group",
                fields: { arg1: compactFormatToStdFormat(json[1]), behavior: "fill" },
            };
        case 7:
            return {
                kind: "tag",
                fields: { arg1: String(json[1]), arg2: compactFormatToStdFormat(json[2]) },
            };
        default:
            throw new Error("unknown format node tag " + json[0]);
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

/**
 * Convert a pixel budget to the column budget expected by `Std.Format.prettyM`.
 *
 * This is intentionally approximate. The existing DOM-measured JS printer can
 * make decisions using exact token widths; Lean's pretty-printer works in
 * character columns. Lean code is rendered monospace in normal slide themes, so
 * the space width is the best available conversion for the VIR prototype.
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @return {number}
 */
function pixelWidthToFormatColumns(pixelWidth, measurer) {
    var spaceWidth = measurer.spaceWidth > 0 ? measurer.spaceWidth : 1;
    var columns = Math.floor(pixelWidth / spaceWidth);
    return Math.max(1, columns);
}

/**
 * @param {*} value
 * @return {Segment[] | null}
 */
function normalizeVirSegments(value) {
    if (!Array.isArray(value)) return null;
    /** @type {Segment[]} */
    var segments = [];
    for (var i = 0; i < value.length; i++) {
        var seg = value[i];
        if (!seg || typeof seg.text !== "string" || !Array.isArray(seg.tags)) {
            return null;
        }
        /** @type {number[]} */
        var tags = [];
        for (var j = 0; j < seg.tags.length; j++) {
            var tag = Number(seg.tags[j]);
            if (!Number.isInteger(tag) || tag < 0) {
                return null;
            }
            tags.push(tag);
        }
        segments.push({ text: seg.text, tags: tags });
    }
    return segments;
}

/**
 * @param {PrettyVirBridge} bridge
 * @param {*} error
 */
function warnPrettyVirFallback(bridge, error) {
    if (bridge.warned) return;
    bridge.warned = true;
    console.warn("VIR pretty-printer failed; falling back to JS formatter.", error);
}

/**
 * Try rendering through an initialized lean-vir runtime.
 * @param {*} fmtJson
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @return {Segment[] | null}
 */
function tryFormatSegmentsWithVir(fmtJson, pixelWidth, measurer) {
    var bridge = /** @type {Window & { __versoPrettyVir?: PrettyVirBridge }} */ (window)
        .__versoPrettyVir;
    if (!bridge || bridge.enabled === false) return null;
    if (bridge.status && bridge.status !== "ready") return null;

    var fmtString = JSON.stringify(fmtJson);
    if (typeof fmtString !== "string") return null;

    try {
        var width = pixelWidthToFormatColumns(pixelWidth, measurer);
        var indent = 0;
        var rendered;
        if (typeof bridge.formatJsonSegmentsJson === "function") {
            rendered = bridge.formatJsonSegmentsJson(fmtString, width, indent);
        } else if (bridge.runtime && typeof bridge.runtime.call === "function") {
            rendered = bridge.runtime.call(
                bridge.jsonExportName || "VersoSlides.Pretty.formatJsonSegmentsJsonForVir",
                fmtString,
                width,
                indent,
            );
        } else {
            return null;
        }

        var result = typeof rendered === "string" ? JSON.parse(rendered) : rendered;
        if (!result || result.ok !== true) {
            warnPrettyVirFallback(bridge, result && result.error ? result.error : result);
            return null;
        }
        var segments = normalizeVirSegments(result.segments);
        if (segments === null) {
            warnPrettyVirFallback(bridge, "invalid segment payload");
            return null;
        }
        return segments;
    } catch (error) {
        warnPrettyVirFallback(bridge, error);
        return null;
    }
}

/**
 * Try rendering through lean-vir's direct `Std.Format` object ABI, avoiding
 * JSON serialization at the JavaScript/Lean boundary.
 * @param {*} fmtJson
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @return {Segment[] | null}
 */
function tryFormatSegmentsWithVirFormat(fmtJson, pixelWidth, measurer) {
    var bridge = /** @type {Window & { __versoPrettyVir?: PrettyVirBridge }} */ (window)
        .__versoPrettyVir;
    if (!bridge || bridge.enabled === false) return null;
    if (bridge.status && bridge.status !== "ready") return null;

    try {
        var width = pixelWidthToFormatColumns(pixelWidth, measurer);
        var indent = 0;
        var fmt = compactFormatToStdFormat(fmtJson);
        var rendered;
        if (typeof bridge.formatSegments === "function") {
            rendered = bridge.formatSegments(fmt, width, indent);
        } else if (bridge.runtime && typeof bridge.runtime.call === "function") {
            rendered = bridge.runtime.call(
                bridge.formatExportName || "VersoSlides.Pretty.formatSegmentsForVir",
                fmt,
                width,
                indent,
            );
        } else {
            return null;
        }

        var segments = normalizeVirSegments(rendered);
        if (segments === null) {
            warnPrettyVirFallback(bridge, "invalid Std.Format segment payload");
            return null;
        }
        return segments;
    } catch (error) {
        warnPrettyVirFallback(bridge, error);
        return null;
    }
}

/**
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @return {Segment[]}
 */
function formatSegmentsWithJs(fmtJson, annotations, pixelWidth, measurer) {
    var fmt = deserializeFormat(fmtJson);
    var ctx = makeRenderContext(annotations, measurer);
    prettyM(fmt, pixelWidth, 0, ctx, measurer);
    return ctx.segments;
}

/**
 * Render a format tree to HTML at a given pixel width, forcing a backend when
 * requested. Forced VIR backends return `null` instead of falling back.
 * @param {*} fmtJson  - compact array format from Highlighted.lean
 * @param {Record<string, TokenAnnotation>} annotations - tag index → { cssClass, binding }
 * @param {number} pixelWidth - target width in pixels
 * @param {DOMMeasurer} measurer
 * @param {PrettyBackend} backend
 * @return {string | null} HTML string, or null when the forced backend is unavailable
 */
function formatToHtmlWithBackend(fmtJson, annotations, pixelWidth, measurer, backend) {
    if (backend === "js") {
        return segmentsToHtml(
            formatSegmentsWithJs(fmtJson, annotations, pixelWidth, measurer),
            annotations,
        );
    }

    if (backend === "vir") {
        var virSegments = tryFormatSegmentsWithVir(fmtJson, pixelWidth, measurer);
        return virSegments ? segmentsToHtml(virSegments, annotations) : null;
    }

    if (backend === "vir-format") {
        var virFormatSegments = tryFormatSegmentsWithVirFormat(fmtJson, pixelWidth, measurer);
        return virFormatSegments ? segmentsToHtml(virFormatSegments, annotations) : null;
    }

    var autoVirSegments = tryFormatSegmentsWithVir(fmtJson, pixelWidth, measurer);
    if (autoVirSegments) return segmentsToHtml(autoVirSegments, annotations);
    return segmentsToHtml(
        formatSegmentsWithJs(fmtJson, annotations, pixelWidth, measurer),
        annotations,
    );
}

/**
 * Render a format tree to HTML at a given pixel width.
 * @param {*} fmtJson  - compact array format from Highlighted.lean
 * @param {Record<string, TokenAnnotation>} annotations - tag index → { cssClass, binding }
 * @param {number} pixelWidth - target width in pixels
 * @param {DOMMeasurer} measurer
 * @return {string} HTML string
 */
function formatToHtml(fmtJson, annotations, pixelWidth, measurer) {
    return formatToHtmlWithBackend(fmtJson, annotations, pixelWidth, measurer, "auto") || "";
}

/**
 * Render a format tree and measure the synchronous render duration.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @param {PrettyBackend} backend
 * @return {TimedPrettyResult}
 */
function formatToHtmlTimed(fmtJson, annotations, pixelWidth, measurer, backend) {
    var start = performance.now();
    var html = formatToHtmlWithBackend(fmtJson, annotations, pixelWidth, measurer, backend);
    return { html: html, durationMs: performance.now() - start };
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
 * @param {PrettyBackend} [backend]
 */
function fillReflowedSpans(container, formats, measurer, backend) {
    var spans = container.querySelectorAll(".reflowed[data-fmt-idx]");
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var idx = parseInt(span.getAttribute("data-fmt-idx") || "0");
        var entry = formats[idx];
        if (!entry) continue;
        var cell = span.closest(".type");
        if (!cell) continue;
        var width = measurer.measureElWidth(cell);
        var html = formatToHtmlWithBackend(
            entry.fmt,
            entry.annotations,
            width,
            measurer,
            backend || "auto",
        );
        span.innerHTML =
            html === null ? '<span class="pretty-compare-unavailable">unavailable</span>' : html;
    }
}
