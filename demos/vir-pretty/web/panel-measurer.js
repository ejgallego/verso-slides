// @ts-check
/* Browser geometry retained when VIR owns semantic formatting and rendering. */
"use strict";

/**
 * @typedef {{
 *   measure: (s: string) => number,
 *   spaceWidth: number,
 *   measureElWidth: (el: Element) => number,
 *   cleanup: () => void
 * }} PanelDOMMeasurer
 */

/**
 * @param {HTMLElement} panel
 * @return {PanelDOMMeasurer}
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
    var scale = clientW > 0 ? panel.getBoundingClientRect().width / clientW : 1;
    /** @type {Record<string, number>} */
    var cache = {};
    /** @param {string} text */
    function measure(text) {
        if (text in cache) return cache[text];
        probe.textContent = text;
        var width = probe.getBoundingClientRect().width / scale;
        cache[text] = width;
        return width;
    }

    return {
        measure: measure,
        spaceWidth: measure(" "),
        measureElWidth: function (element) {
            return element.getBoundingClientRect().width / scale;
        },
        cleanup: function () {
            container.remove();
        },
    };
}
