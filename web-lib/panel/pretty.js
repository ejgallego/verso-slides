// @ts-check
// pretty.js — Browser adapter around Lean's Std.Format.prettyM.
//
// VIR owns format layout. JavaScript retains DOM measurement, annotation
// lookup, HTML construction, and the existing panel lifecycle.

"use strict";

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
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   status?: () => string,
 *   ready?: Promise<*>,
 *   renderSegments: (
 *     fmtJson: *,
 *     annotations: Record<string, TokenAnnotation>,
 *     pixelWidth: number,
 *     measurer: DOMMeasurer
 *   ) => Segment[] | null
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
        typeof backend.renderSegments !== "function"
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
 * Convert the compact format emitted by Verso into VIR's direct object-ABI
 * representation of `Std.Format`. Nat and Int fields cross as decimal strings.
 * @param {*} json
 * @return {*}
 */
function compactFormatToStdFormat(json) {
    if (json === null || json === undefined) return { kind: "nil" };
    if (typeof json === "string") return { kind: "text", value: json };
    if (json === 1) return { kind: "line" };
    if (!Array.isArray(json) || json.length === 0) {
        throw new Error("invalid compact format node");
    }
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
                fields: {
                    arg1: String(json[1]),
                    arg2: compactFormatToStdFormat(json[2]),
                },
            };
        default:
            throw new Error("unknown compact format node tag " + json[0]);
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
 * @return {Segment[] | null}
 */
function formatSegmentsWithVir(fmtJson, annotations, pixelWidth, measurer) {
    if (!window.versoVir) return null;
    var spaceWidth = measurer.spaceWidth;
    if (!Number.isFinite(spaceWidth) || spaceWidth <= 0) spaceWidth = 1;
    var columns = Math.max(1, Math.floor(pixelWidth / spaceWidth));
    var format = compactFormatToStdFormat(fmtJson);
    return /** @type {Segment[]} */ (
        window.versoVir.call("VersoSlides.VirPrettyM.formatSegments", format, columns, 0)
    );
}

registerPrettyBackend({
    id: "vir-prettym",
    label: "VIR prettyM",
    status: function () {
        return window.versoVir ? "ready" : window.versoVirReady ? "loading" : "unavailable";
    },
    ready: window.versoVirReady,
    renderSegments: formatSegmentsWithVir,
});

/**
 * Render a format tree through one explicitly selected backend. Missing or
 * unavailable backends return `null`; callers decide how to present that
 * state instead of silently falling back to another implementation.
 * @param {*} fmtJson
 * @param {Record<string, TokenAnnotation>} annotations
 * @param {number} pixelWidth
 * @param {DOMMeasurer} measurer
 * @param {string} backendId
 * @return {string | null}
 */
function formatToHtmlWithBackend(fmtJson, annotations, pixelWidth, measurer, backendId) {
    var backend = getPrettyBackend(backendId);
    if (!backend) return null;
    if (backend.status && backend.status() !== "ready") return null;
    var segments = backend.renderSegments(fmtJson, annotations, pixelWidth, measurer);
    return segments === null ? null : segmentsToHtml(segments, annotations);
}

/**
 * Render a format tree with Verso Slides' built-in VIR formatter.
 * This preserves the original API for existing consumers.
 * @param {*} fmtJson  - compact array format from Highlighted.lean
 * @param {Record<string, TokenAnnotation>} annotations - tag index → { cssClass, binding }
 * @param {number} pixelWidth - target width in pixels
 * @param {DOMMeasurer} measurer
 * @return {string} HTML string
 */
function formatToHtml(fmtJson, annotations, pixelWidth, measurer) {
    var rendered = formatToHtmlWithBackend(
        fmtJson,
        annotations,
        pixelWidth,
        measurer,
        "vir-prettym",
    );
    if (rendered === null) throw new Error("VIR prettyM runtime is not ready");
    return rendered;
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
 * @param {string} [backendId]
 */
function fillReflowedSpans(container, formats, measurer, backendId) {
    var spans = container.querySelectorAll(".reflowed[data-fmt-idx]");
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var idx = parseInt(span.getAttribute("data-fmt-idx") || "0");
        var entry = formats[idx];
        if (!entry) continue;
        var cell = span.closest(".type");
        if (!cell) continue;
        var width = measurer.measureElWidth(cell);
        var rendered = formatToHtmlWithBackend(
            entry.fmt,
            entry.annotations,
            width,
            measurer,
            backendId || "vir-prettym",
        );
        span.innerHTML =
            rendered === null ? '<span class="pretty-unavailable">unavailable</span>' : rendered;
    }
}
