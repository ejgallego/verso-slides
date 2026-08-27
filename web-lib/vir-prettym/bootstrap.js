// @ts-check

/**
 * @typedef {Object} RankedCandidate
 * @property {"semantic" | "fullText"} kind
 * @property {number | bigint} sourceIndex
 * @property {number} score
 */

/* Load the one VIR runtime used by the deck. */
(function () {
    "use strict";

    var script = /** @type {HTMLScriptElement} */ (document.currentScript);
    var assetsUrl = new URL("./vir-prettym/", script.src);
    var lifecycle = { createRuntime: 0, startup: 0, dispose: 0 };
    window.versoVirLifecycle = lifecycle;

    /** @param {"createRuntime" | "startup" | "dispose"} phase */
    function recordLifecycle(phase) {
        lifecycle[phase] += 1;
        window.dispatchEvent(new CustomEvent("verso-vir-lifecycle", { detail: phase }));
        var target = document.querySelector("[data-verso-vir-lifecycle]");
        if (target) {
            target.textContent =
                "Shared runtime lifecycle: " +
                lifecycle.createRuntime +
                " create, " +
                lifecycle.startup +
                " startup, " +
                lifecycle.dispose +
                " dispose";
        }
    }

    /** @param {VersoVirRuntime} runtime */
    function renderRanking(runtime) {
        var semanticHits = [
            {
                sourceIndex: 0,
                rawScore: 0.5,
                semanticPriority: 75,
                domainPriority: 75,
                itemPriority: null,
            },
            {
                sourceIndex: 1,
                rawScore: 0.9,
                semanticPriority: null,
                domainPriority: null,
                itemPriority: null,
            },
        ];
        var fullTextHits = [
            {
                sourceIndex: 0,
                rawScore: 2,
                fullTextPriority: null,
                documentPriority: null,
            },
        ];
        var ranked = /** @type {RankedCandidate[]} */ (
            runtime.call(
                "VersoSlides.VirPrettyM.rankSearchCandidates",
                semanticHits,
                fullTextHits,
            )
        );
        var labels = {
            semantic: ["API documentation", "runtime guide"],
            fullText: ["benchmark report"],
        };
        var target = document.querySelector("[data-verso-vir-ranking]");
        if (!(target instanceof HTMLOListElement)) return;
        target.replaceChildren();
        for (var candidate of ranked) {
            var item = document.createElement("li");
            var sourceIndex = Number(candidate.sourceIndex);
            item.dataset.virKind = candidate.kind;
            item.dataset.virSourceIndex = String(sourceIndex);
            item.textContent =
                candidate.kind +
                ": " +
                labels[candidate.kind][sourceIndex] +
                " (score " +
                candidate.score.toFixed(2) +
                ")";
            target.append(item);
        }
        target.dataset.virRankingReady = "true";
    }

    window.versoVirReady = (async function () {
        var runtimeModule = await import(new URL("sdk/js/vir-web-assets.js", assetsUrl).href);
        var runtime = await runtimeModule.createVirWebAssetsRuntime(
            new URL("VIR_WEB_ASSETS.json", assetsUrl),
            "vir-prettym",
        );
        recordLifecycle("createRuntime");
        runtime.runStartupEntries();
        recordLifecycle("startup");
        window.versoVir = runtime;
        renderRanking(runtime);
        window.addEventListener(
            "pagehide",
            function () {
                runtime.dispose();
                recordLifecycle("dispose");
            },
            { once: true },
        );
        return runtime;
    })();
})();
