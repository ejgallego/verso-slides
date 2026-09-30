// @ts-check
// pretty.js — Browser adapter around Lean's Std.Format.prettyM.
//
// VIR owns format layout. JavaScript retains DOM measurement, annotation
// lookup, HTML construction, and the existing panel lifecycle.

"use strict";

// Must agree with VersoSlides.Pretty.limits. Input admission runs before any
// recursive ABI conversion; Lean independently checks it before layout.
var VIR_FORMAT_LIMITS = Object.freeze({
    maxNodes: 10000, maxDepth: 128, maxInputBytes: 65536,
    maxTextBytes: 16384, maxHardLines: 4096,
    maxColumns: 4096, maxIndent: 4096,
    maxOutputBytes: 1048576, maxSegments: 10000, maxTagEntries: 65536,
});

class PrettyFormatError extends Error {
    /** @param {string} code */
    constructor(code) {
        super("PrettyM limit or input error: " + code);
        this.name = "PrettyFormatError";
        this.code = code;
    }
}

/** Exact bounded decimal scalars; reject lossy numbers before string conversion.
 * @param {*} value @param {boolean} signed @return {string}
 */
function formatScalar(value, signed) {
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value) || (!signed && value < 0)) {
            throw new PrettyFormatError("invalidInput");
        }
        return String(value);
    }
    if (typeof value !== "string" || value.length > 21 ||
        !(signed ? /^(0|-?[1-9][0-9]*)$/ : /^(0|[1-9][0-9]*)$/).test(value)) {
        throw new PrettyFormatError("invalidInput");
    }
    return value;
}

/** @param {number} width @param {number} indent */
function checkFormatDimensions(width, indent) {
    if (!Number.isSafeInteger(width) || width < 0 || width > VIR_FORMAT_LIMITS.maxColumns) {
        throw new PrettyFormatError("width");
    }
    if (!Number.isSafeInteger(indent) || indent < 0 || indent > VIR_FORMAT_LIMITS.maxIndent) {
        throw new PrettyFormatError("indentation");
    }
}

/** Typed v2 boundary. Admission completes before the first ABI call.
 * @param {VersoVirProgram} program @param {*} format
 * @param {number} width @param {number} indent
 * @return {PrettySegment[]}
 */
function formatCompactSegments(program, format, width, indent) {
    checkFormatDimensions(width, indent);
    var admitted = compactFormatToStdFormat(format, indent);
    var result = /** @type {PrettyFormatResult} */ (program.call("formatSegments", admitted, width, indent));
    if (result.kind === "error") throw new PrettyFormatError(result.value);
    if (result.kind !== "ok" || !Array.isArray(result.value)) {
        throw new Error("Invalid PrettyM v2 result");
    }
    return result.value;
}

/**
 * @typedef {{
 *   measure: (s: string) => number,
 *   spaceWidth: number,
 *   measureElWidth: (el: Element) => number,
 *   cleanup: () => void
 * }} DOMMeasurer
 *
 * @typedef {{ text: string, tags: (number | string)[] }} Segment
 *
 * @typedef {{ cssClass: string, binding?: string }} TokenAnnotation
 *
 * @typedef {{ fmt: *, annotations: Record<string, TokenAnnotation> }} FormatData
 *
 * @typedef {{ names: string[], ppType?: string | FormatData }} Hypothesis
 *
 * @typedef {{ name?: string, hypotheses: Hypothesis[], goalPrefix: string, ppConclusion?: string | FormatData }} GoalData
 *
 * @typedef {{ html: string, formats: FormatData[] }} GoalsResult
 */

/**
 * Convert the compact format emitted by Verso into VIR's direct object-ABI
 * representation of `Std.Format`. Nat and Int fields cross as decimal strings.
 * @param {*} json
 * @param {number} [indent]
 * @param {typeof VIR_FORMAT_LIMITS} [limits] Small test policies use the same admission code.
 * @return {*}
 */
function compactFormatToStdFormat(json, indent = 0, limits = VIR_FORMAT_LIMITS) {
    var pending = [{ node: json, depth: 1, indent: indent }];
    var nodes = 0, bytes = 0, hardLines = 0;
    while (pending.length) {
        var item = pending.pop();
        if (++nodes > limits.maxNodes) throw new PrettyFormatError("inputNodes");
        if (item.depth > limits.maxDepth) throw new PrettyFormatError("inputDepth");
        if (!Number.isSafeInteger(item.indent) || Math.abs(item.indent) > limits.maxIndent) {
            throw new PrettyFormatError("indentation");
        }
        var node = item.node;
        if (node === null || node === 1) continue;
        if (typeof node === "string") {
            if (node.length > limits.maxTextBytes) throw new PrettyFormatError("textBytes");
            var textBytes = 0, textLines = 0;
            for (var i = 0; i < node.length; i++) {
                var c = node.charCodeAt(i);
                if (c === 10) textLines++;
                if (c < 0x80) textBytes++;
                else if (c < 0x800) textBytes += 2;
                else if (c >= 0xd800 && c <= 0xdbff) {
                    var lo = node.charCodeAt(++i);
                    if (!(lo >= 0xdc00 && lo <= 0xdfff)) throw new PrettyFormatError("invalidInput");
                    textBytes += 4;
                } else {
                    if (c >= 0xdc00 && c <= 0xdfff) throw new PrettyFormatError("invalidInput");
                    textBytes += 3;
                }
                if (textBytes > limits.maxTextBytes) throw new PrettyFormatError("textBytes");
            }
            bytes += textBytes;
            if (bytes > limits.maxInputBytes) throw new PrettyFormatError("inputBytes");
            hardLines += textLines;
            if (hardLines > limits.maxHardLines) throw new PrettyFormatError("hardLines");
            continue;
        }
        if (!Array.isArray(node)) throw new PrettyFormatError("invalidInput");
        var child = (value, nesting = item.indent) => ({
            node: value, depth: item.depth + 1, indent: nesting,
        });
        switch (node[0]) {
            case 2:
                if (node.length !== 2 || typeof node[1] !== "boolean") throw new PrettyFormatError("invalidInput");
                break;
            case 3: {
                if (node.length !== 3) throw new PrettyFormatError("invalidInput");
                var nest = BigInt(formatScalar(node[1], true));
                // Bound the cumulative value, not each delta: a negative nest
                // followed by a positive one may legitimately cancel.
                pending.push(child(node[2], Number(BigInt(item.indent) + nest)));
                break;
            }
            case 4:
                if (node.length !== 3) throw new PrettyFormatError("invalidInput");
                pending.push(child(node[2]), child(node[1]));
                break;
            case 5: case 6:
                if (node.length !== 2) throw new PrettyFormatError("invalidInput");
                pending.push(child(node[1]));
                break;
            case 7:
                if (node.length !== 3) throw new PrettyFormatError("invalidInput");
                if (formatScalar(node[1], false).length > 20) throw new PrettyFormatError("tagValue");
                pending.push(child(node[2]));
                break;
            default: throw new PrettyFormatError("invalidInput");
        }
    }
    return compactFormatToStdFormatUnchecked(json);
}

/** @param {*} json @return {*} Only called after complete bounded admission. */
function compactFormatToStdFormatUnchecked(json) {
    if (json === null) return { kind: "nil" };
    if (typeof json === "string") return { kind: "text", value: json };
    if (json === 1) return { kind: "line" };
    if (!Array.isArray(json) || json.length === 0) {
        throw new PrettyFormatError("invalidInput");
    }
    switch (json[0]) {
        case 2:
            return { kind: "align", value: !!json[1] };
        case 3:
            return {
                kind: "nest",
                fields: { indent: formatScalar(json[1], true), f: compactFormatToStdFormatUnchecked(json[2]) },
            };
        case 4:
            return {
                kind: "append",
                fields: {
                    arg1: compactFormatToStdFormatUnchecked(json[1]),
                    arg2: compactFormatToStdFormatUnchecked(json[2]),
                },
            };
        case 5:
            return {
                kind: "group",
                fields: { arg1: compactFormatToStdFormatUnchecked(json[1]), behavior: "allOrNone" },
            };
        case 6:
            return {
                kind: "group",
                fields: { arg1: compactFormatToStdFormatUnchecked(json[1]), behavior: "fill" },
            };
        case 7:
            return {
                kind: "tag",
                fields: {
                    arg1: formatScalar(json[1], false),
                    arg2: compactFormatToStdFormatUnchecked(json[2]),
                },
            };
        default:
            throw new PrettyFormatError("invalidInput");
    }
}

/**
 * Create a DOM-based measurer for panel widths. The text itself is monospace,
 * so one measured space converts the CSS-pixel boundary to `prettyM` columns.
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
        var width = probe.getBoundingClientRect().width / scale;
        cache[s] = width;
        return width;
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
 * Render a compact format through Lean's `Std.Format.prettyM`, then feed the
 * result back into the existing JavaScript annotation/HTML stage.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @return {string}
 */
function formatToHtml(fmtJson, annotations, pixelWidth, measurer) {
    var spaceWidth = measurer.spaceWidth;
    if (!Number.isFinite(spaceWidth) || spaceWidth <= 0) spaceWidth = 1;
    var columns = Math.max(1, Math.floor(pixelWidth / spaceWidth));
    var segments = window.versoVirFormatSegments(fmtJson, columns, 0);
    return segmentsToHtml(segments, annotations || {});
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

/** @param {string} s @return {string} */
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Build structural goal HTML with empty .reflowed placeholders.
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
 */
function fillReflowedSpans(container, formats, measurer) {
    var spans = container.querySelectorAll(".reflowed[data-fmt-idx]");
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var idx = parseInt(span.getAttribute("data-fmt-idx") || "0");
        var entry = formats[idx];
        if (!entry) continue;
        var cell = span.closest(".type");
        if (!cell) continue;
        var width = measurer.measureElWidth(cell);
        span.innerHTML = formatToHtml(entry.fmt, entry.annotations, width, measurer);
    }
}
