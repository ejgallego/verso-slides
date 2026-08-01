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
    /** @type {*} */
    var prettyCorpusReport = null;
    /** @type {HTMLElement | null} */
    var prettyCorpusOverlay = null;
    var prettyCorpusRunning = false;
    var prettyCorpusProgress = "";
    /** @type {*} */
    var prettyScalingReport = null;
    var prettyScalingRunning = false;
    var prettyScalingProgress = "";
    /** @type {*} */
    var prettyRepeatedReport = null;
    var prettyRepeatedRunning = false;
    var prettyRepeatedProgress = "";
    /** @type {*} */
    var prettyMemoryReport = null;
    var prettyMemoryRunning = false;
    var prettyMemoryProgress = "";
    /** @type {*} */
    var prettyInteractionReport = null;
    var prettyInteractionRunning = false;
    var prettyInteractionProgress = "";

    function prettyBenchmarkRunning() {
        return (
            prettyCorpusRunning ||
            prettyScalingRunning ||
            prettyRepeatedRunning ||
            prettyMemoryRunning ||
            prettyInteractionRunning
        );
    }

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

        var corpus = document.createElement("fieldset");
        corpus.className = "pretty-controls-corpus";
        var corpusLegend = document.createElement("legend");
        corpusLegend.textContent = "Benchmark data";
        var corpusActions = document.createElement("div");
        corpusActions.className = "pretty-controls-corpus-actions";
        var runCorpus = document.createElement("button");
        runCorpus.type = "button";
        runCorpus.className = "pretty-corpus-run";
        runCorpus.disabled = prettyBenchmarkRunning();
        runCorpus.textContent = prettyCorpusRunning ? "Running…" : "Run corpus";
        runCorpus.addEventListener("click", runPrettyCorpusFromControls);
        corpusActions.appendChild(runCorpus);
        var runScaling = document.createElement("button");
        runScaling.type = "button";
        runScaling.className = "pretty-scaling-run";
        runScaling.disabled = prettyBenchmarkRunning();
        runScaling.textContent = prettyScalingRunning ? "Scaling…" : "Run scaling";
        runScaling.addEventListener("click", runPrettyScalingFromControls);
        corpusActions.appendChild(runScaling);
        var runRepeated = document.createElement("button");
        runRepeated.type = "button";
        runRepeated.className = "pretty-repeated-run";
        runRepeated.disabled = prettyBenchmarkRunning();
        runRepeated.textContent = prettyRepeatedRunning ? "Repeating…" : "Run repeats";
        runRepeated.addEventListener("click", runPrettyRepeatedFromControls);
        corpusActions.appendChild(runRepeated);
        var runMemory = document.createElement("button");
        runMemory.type = "button";
        runMemory.className = "pretty-memory-run";
        runMemory.disabled = prettyBenchmarkRunning();
        runMemory.textContent = prettyMemoryRunning ? "Measuring…" : "Run memory";
        runMemory.addEventListener("click", runPrettyMemoryFromControls);
        corpusActions.appendChild(runMemory);
        var runInteractions = document.createElement("button");
        runInteractions.type = "button";
        runInteractions.className = "pretty-interaction-run";
        runInteractions.disabled = prettyBenchmarkRunning();
        runInteractions.textContent = prettyInteractionRunning
            ? "Interacting…"
            : "Run interactions";
        runInteractions.addEventListener("click", runPrettyInteractionsFromControls);
        corpusActions.appendChild(runInteractions);
        if (prettyCorpusReport) {
            var viewCorpus = document.createElement("button");
            viewCorpus.type = "button";
            viewCorpus.className = "pretty-corpus-view";
            viewCorpus.textContent = "Corpus report";
            viewCorpus.addEventListener("click", function () {
                showPrettyCorpusReport(prettyCorpusReport);
            });
            corpusActions.appendChild(viewCorpus);
        }
        if (prettyScalingReport) {
            var viewScaling = document.createElement("button");
            viewScaling.type = "button";
            viewScaling.className = "pretty-scaling-view";
            viewScaling.textContent = "Scaling report";
            viewScaling.addEventListener("click", function () {
                showPrettyScalingReport(prettyScalingReport);
            });
            corpusActions.appendChild(viewScaling);
        }
        if (prettyRepeatedReport) {
            var viewRepeated = document.createElement("button");
            viewRepeated.type = "button";
            viewRepeated.className = "pretty-repeated-view";
            viewRepeated.textContent = "Repeat report";
            viewRepeated.addEventListener("click", function () {
                showPrettyRepeatedReport(prettyRepeatedReport);
            });
            corpusActions.appendChild(viewRepeated);
        }
        if (prettyMemoryReport) {
            var viewMemory = document.createElement("button");
            viewMemory.type = "button";
            viewMemory.className = "pretty-memory-view";
            viewMemory.textContent = "Memory report";
            viewMemory.addEventListener("click", function () {
                showPrettyMemoryReport(prettyMemoryReport);
            });
            corpusActions.appendChild(viewMemory);
        }
        if (prettyInteractionReport) {
            var viewInteractions = document.createElement("button");
            viewInteractions.type = "button";
            viewInteractions.className = "pretty-interaction-view";
            viewInteractions.textContent = "Interaction report";
            viewInteractions.addEventListener("click", function () {
                showPrettyInteractionReport(prettyInteractionReport);
            });
            corpusActions.appendChild(viewInteractions);
        }
        var corpusStatus = document.createElement("p");
        corpusStatus.className = "pretty-corpus-status";
        if (prettyCorpusRunning) {
            corpusStatus.textContent = prettyCorpusProgress || "Preparing backends…";
        } else if (prettyScalingRunning) {
            corpusStatus.textContent = prettyScalingProgress || "Preparing scaling study…";
        } else if (prettyRepeatedRunning) {
            corpusStatus.textContent = prettyRepeatedProgress || "Preparing repeated-call study…";
        } else if (prettyMemoryRunning) {
            corpusStatus.textContent = prettyMemoryProgress || "Preparing memory study…";
        } else if (prettyInteractionRunning) {
            corpusStatus.textContent = prettyInteractionProgress || "Preparing interaction study…";
        } else if (prettyInteractionReport) {
            corpusStatus.textContent =
                prettyInteractionReport.parityCount +
                "/" +
                prettyInteractionReport.scenarioCount +
                " interaction points agree";
            corpusStatus.classList.add(
                prettyInteractionReport.passed ? "status-pass" : "status-fail",
            );
        } else if (prettyMemoryReport) {
            corpusStatus.textContent =
                prettyMemoryReport.parityCount +
                "/" +
                prettyMemoryReport.pointCount +
                " retained-memory points agree";
            corpusStatus.classList.add(prettyMemoryReport.passed ? "status-pass" : "status-fail");
        } else if (prettyRepeatedReport) {
            corpusStatus.textContent =
                prettyRepeatedReport.totalBackendCalls +
                (prettyRepeatedReport.passed
                    ? " repeated calls checked without mismatch"
                    : " repeated calls checked; failures found");
            corpusStatus.classList.add(prettyRepeatedReport.passed ? "status-pass" : "status-fail");
        } else if (prettyScalingReport) {
            corpusStatus.textContent =
                prettyScalingReport.parityCount +
                "/" +
                prettyScalingReport.scenarioCount +
                " scaling points agree";
            corpusStatus.classList.add(prettyScalingReport.passed ? "status-pass" : "status-fail");
        } else if (prettyCorpusReport) {
            corpusStatus.textContent =
                prettyCorpusReport.parityCount +
                "/" +
                prettyCorpusReport.scenarioCount +
                " scenarios agree";
            corpusStatus.classList.add(prettyCorpusReport.passed ? "status-pass" : "status-fail");
        } else {
            var slideCases =
                typeof collectPrettyFormatsFromDocument === "function"
                    ? collectPrettyFormatsFromDocument().length
                    : 0;
            corpusStatus.textContent =
                "9 synthetic + " +
                slideCases +
                " slide formats; 6 scaling dimensions; 32 × 5 repeat cycle.";
        }
        corpus.append(corpusLegend, corpusActions, corpusStatus);
        menu.appendChild(corpus);

        var note = document.createElement("p");
        note.className = "pretty-controls-note";
        note.textContent = "Comparison uses one deterministic column budget for every processor.";
        menu.appendChild(note);

        prettyControls.replaceChildren(summary, menu);
        prettyControls.open = wasOpen;
    }

    function updatePrettyCorpusProgress() {
        if (!prettyControls) return;
        var status = prettyControls.querySelector(".pretty-corpus-status");
        if (status)
            status.textContent = prettyScalingRunning
                ? prettyScalingProgress
                : prettyRepeatedRunning
                  ? prettyRepeatedProgress
                  : prettyMemoryRunning
                    ? prettyMemoryProgress
                    : prettyInteractionRunning
                      ? prettyInteractionProgress
                      : prettyCorpusProgress;
    }

    async function runPrettyCorpusFromControls() {
        if (prettyCorpusRunning || typeof runPrettyDifferentialCorpus !== "function") return;
        prettyCorpusRunning = true;
        prettyCorpusProgress = "Preparing backends…";
        renderPrettyControls();
        try {
            prettyCorpusReport = await runPrettyDifferentialCorpus({
                onProgress: function (progress) {
                    prettyCorpusProgress =
                        progress.completed +
                        "/" +
                        progress.total +
                        " · " +
                        progress.caseId +
                        " @ " +
                        progress.width;
                    updatePrettyCorpusProgress();
                },
            });
            showPrettyCorpusReport(prettyCorpusReport);
        } catch (error) {
            prettyCorpusReport = {
                passed: false,
                parityCount: 0,
                scenarioCount: 0,
                error: error instanceof Error ? error.message : String(error),
            };
            console.warn("Pretty differential corpus failed.", error);
        } finally {
            prettyCorpusRunning = false;
            prettyCorpusProgress = "";
            renderPrettyControls();
        }
    }

    async function runPrettyScalingFromControls() {
        if (prettyScalingRunning || typeof runPrettyScalingStudy !== "function") return;
        prettyScalingRunning = true;
        prettyScalingProgress = "Preparing scaling study…";
        renderPrettyControls();
        try {
            prettyScalingReport = await runPrettyScalingStudy({
                onProgress: function (progress) {
                    prettyScalingProgress =
                        progress.completed +
                        "/" +
                        progress.total +
                        " · " +
                        (progress.dimension || progress.caseId) +
                        (progress.size === undefined ? "" : " · " + progress.size);
                    updatePrettyCorpusProgress();
                },
            });
            showPrettyScalingReport(prettyScalingReport);
        } catch (error) {
            prettyScalingReport = {
                passed: false,
                parityCount: 0,
                scenarioCount: 0,
                error: error instanceof Error ? error.message : String(error),
            };
            console.warn("Pretty scaling study failed.", error);
        } finally {
            prettyScalingRunning = false;
            prettyScalingProgress = "";
            renderPrettyControls();
        }
    }

    async function runPrettyRepeatedFromControls() {
        if (prettyRepeatedRunning || typeof runPrettyRepeatedCallStudy !== "function") return;
        prettyRepeatedRunning = true;
        prettyRepeatedProgress = "Preparing repeated-call study…";
        renderPrettyControls();
        try {
            prettyRepeatedReport = await runPrettyRepeatedCallStudy({
                onProgress: function (progress) {
                    prettyRepeatedProgress =
                        progress.completed + "/" + progress.total + " · " + progress.caseId;
                    updatePrettyCorpusProgress();
                },
            });
            showPrettyRepeatedReport(prettyRepeatedReport);
        } catch (error) {
            prettyRepeatedReport = {
                passed: false,
                parityCount: 0,
                scenarioCount: 0,
                totalBackendCalls: 0,
                error: error instanceof Error ? error.message : String(error),
            };
            console.warn("Pretty repeated-call study failed.", error);
        } finally {
            prettyRepeatedRunning = false;
            prettyRepeatedProgress = "";
            renderPrettyControls();
        }
    }

    async function runPrettyMemoryFromControls() {
        if (prettyMemoryRunning || typeof runPrettyMemoryScalingStudy !== "function") return;
        prettyMemoryRunning = true;
        prettyMemoryProgress = "Preparing retained-memory study…";
        renderPrettyControls();
        try {
            prettyMemoryReport = await runPrettyMemoryScalingStudy({
                onProgress: function (progress) {
                    prettyMemoryProgress =
                        progress.completed +
                        "/" +
                        progress.total +
                        " · " +
                        progress.dimension +
                        " · " +
                        progress.size;
                    updatePrettyCorpusProgress();
                },
            });
            showPrettyMemoryReport(prettyMemoryReport);
        } catch (error) {
            prettyMemoryReport = {
                passed: false,
                parityCount: 0,
                pointCount: 0,
                error: error instanceof Error ? error.message : String(error),
            };
            console.warn("Pretty retained-memory study failed.", error);
        } finally {
            prettyMemoryRunning = false;
            prettyMemoryProgress = "";
            renderPrettyControls();
        }
    }

    async function runPrettyInteractionsFromControls() {
        if (prettyInteractionRunning || typeof runPrettyInteractionStudy !== "function") return;
        prettyInteractionRunning = true;
        prettyInteractionProgress = "Preparing interaction study…";
        renderPrettyControls();
        try {
            prettyInteractionReport = await runPrettyInteractionStudy({
                onProgress: function (progress) {
                    prettyInteractionProgress =
                        progress.completed + "/" + progress.total + " · " + progress.caseId;
                    updatePrettyCorpusProgress();
                },
            });
            showPrettyInteractionReport(prettyInteractionReport);
        } catch (error) {
            prettyInteractionReport = {
                passed: false,
                parityCount: 0,
                scenarioCount: 0,
                error: error instanceof Error ? error.message : String(error),
            };
            console.warn("Pretty interaction study failed.", error);
        } finally {
            prettyInteractionRunning = false;
            prettyInteractionProgress = "";
            renderPrettyControls();
        }
    }

    /** @param {number} value */
    function formatCorpusTiming(value) {
        if (!Number.isFinite(value)) return "—";
        if (value < 0.01) return "<0.01";
        return value.toFixed(value < 10 ? 2 : 1);
    }

    /** @param {number | null} value */
    function formatCorpusBytes(value) {
        if (typeof value !== "number" || !Number.isFinite(value)) return "—";
        if (value < 1024) return Math.round(value) + " B";
        if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KiB";
        return (value / (1024 * 1024)).toFixed(2) + " MiB";
    }

    /**
     * @param {HTMLTableRowElement} row
     * @param {string} text
     * @param {string} [element]
     * @return {HTMLTableCellElement}
     */
    function appendCorpusCell(row, text, element) {
        var cell = /** @type {HTMLTableCellElement} */ (document.createElement(element || "td"));
        cell.textContent = text;
        row.appendChild(cell);
        return cell;
    }

    /** @param {*} report */
    function downloadPrettyCorpusReport(report) {
        var blob = new Blob([JSON.stringify(report, null, 2) + "\n"], {
            type: "application/json",
        });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download =
            "pretty-" +
            (report.kind || "differential") +
            "-" +
            new Date().toISOString().replace(/[:.]/g, "-") +
            ".json";
        link.click();
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 0);
    }

    /** @param {*} report */
    function showPrettyCorpusReport(report) {
        if (prettyCorpusOverlay) prettyCorpusOverlay.remove();
        var overlay = document.createElement("section");
        overlay.className = "pretty-corpus-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Pretty-printer differential report");
        overlay.addEventListener("keydown", function (event) {
            event.stopPropagation();
            if (event.key === "Escape") overlay.remove();
        });

        var header = document.createElement("header");
        var title = document.createElement("h2");
        title.textContent = "Pretty-printer differential report";
        var headerActions = document.createElement("div");
        var exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = "Export JSON";
        exportButton.addEventListener("click", function () {
            downloadPrettyCorpusReport(report);
        });
        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "pretty-corpus-close";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", function () {
            overlay.remove();
        });
        headerActions.append(exportButton, closeButton);
        header.append(title, headerActions);
        overlay.appendChild(header);

        if (report.error) {
            var error = document.createElement("p");
            error.className = "pretty-corpus-result status-fail";
            error.textContent = report.error;
            overlay.appendChild(error);
        } else {
            var result = document.createElement("p");
            result.className =
                "pretty-corpus-result " + (report.passed ? "status-pass" : "status-fail");
            result.textContent =
                report.parityCount +
                "/" +
                report.scenarioCount +
                " scenarios agree · " +
                (report.backendIds.length - report.unavailable.length) +
                "/" +
                report.backendIds.length +
                " backends ready · " +
                report.samples +
                " timed samples after " +
                report.warmup +
                " warm-ups · " +
                (report.benchmarkMs / 1000).toFixed(2) +
                " s corpus wall time";
            overlay.appendChild(result);

            var summaryHeading = document.createElement("h3");
            summaryHeading.textContent = "Aggregate formatter timings (ms)";
            overlay.appendChild(summaryHeading);
            var summaryTable = document.createElement("table");
            summaryTable.className = "pretty-corpus-summary";
            var summaryHead = document.createElement("tr");
            [
                "Backend",
                "Status",
                "Samples",
                "Total median",
                "Total p95",
                "Marshal median",
                "Execute median",
                "Decode median",
            ].forEach(function (heading) {
                appendCorpusCell(summaryHead, heading, "th");
            });
            summaryTable.appendChild(summaryHead);
            report.backendIds.forEach(function (/** @type {string} */ id) {
                var summary = report.summaries[id];
                var row = document.createElement("tr");
                appendCorpusCell(row, summary.label);
                appendCorpusCell(row, summary.status);
                appendCorpusCell(row, String(summary.timing.totalMs.samples));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.totalMs.median));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.totalMs.p95));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.marshalMs.median));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.executeMs.median));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.decodeMs.median));
                summaryTable.appendChild(row);
            });
            overlay.appendChild(summaryTable);

            if (report.runtimeProfile) {
                var runtimeHeading = document.createElement("h3");
                runtimeHeading.textContent = "Current-page startup and footprint";
                overlay.appendChild(runtimeHeading);
                var runtimeNote = document.createElement("p");
                runtimeNote.className = "pretty-corpus-note";
                runtimeNote.textContent =
                    "Asset bytes are exact SHA-256-profiled total browser payloads, including the shared formatter/segment harness. VIR JSON and VIR Format share one runtime; bridge startup and resource-wall time are reported separately.";
                overlay.appendChild(runtimeNote);
                var runtimeTable = document.createElement("table");
                runtimeTable.className = "pretty-corpus-runtime";
                var runtimeHead = document.createElement("tr");
                [
                    "Backend",
                    "Startup (ms)",
                    "Resource wall (ms)",
                    "Assets",
                    "Wasm",
                    "Memory initial → final",
                    "Pipeline",
                ].forEach(function (heading) {
                    appendCorpusCell(runtimeHead, heading, "th");
                });
                runtimeTable.appendChild(runtimeHead);
                report.backendIds.forEach(function (/** @type {string} */ id) {
                    var profile = report.runtimeProfile.backends[id];
                    var before =
                        report.runtimeProfileBefore && report.runtimeProfileBefore.backends[id];
                    var row = document.createElement("tr");
                    appendCorpusCell(row, report.summaries[id].label);
                    appendCorpusCell(
                        row,
                        profile && typeof profile.startupMs === "number"
                            ? formatCorpusTiming(profile.startupMs)
                            : "—",
                    );
                    appendCorpusCell(
                        row,
                        profile && typeof profile.resourceLoadMs === "number"
                            ? formatCorpusTiming(profile.resourceLoadMs)
                            : "—",
                    );
                    appendCorpusCell(row, profile ? formatCorpusBytes(profile.assetBytes) : "—");
                    appendCorpusCell(row, profile ? formatCorpusBytes(profile.wasmBytes) : "—");
                    appendCorpusCell(
                        row,
                        profile
                            ? formatCorpusBytes(before ? before.memoryBytes : null) +
                                  " → " +
                                  formatCorpusBytes(profile.memoryBytes)
                            : "—",
                    );
                    appendCorpusCell(
                        row,
                        profile && profile.provenance
                            ? profile.provenance.pipeline || "metadata"
                            : id === "js"
                              ? "JavaScript"
                              : id.startsWith("vir")
                                ? "lean-vir"
                                : "—",
                    );
                    runtimeTable.appendChild(row);
                });
                overlay.appendChild(runtimeTable);
            }

            var scenarioHeading = document.createElement("h3");
            var realCases = report.cases.filter(function (/** @type {*} */ corpusCase) {
                return corpusCase.origin === "slide";
            }).length;
            scenarioHeading.textContent =
                "Case and width breakdown — " +
                realCases +
                " real slide formats, median total (ms)";
            overlay.appendChild(scenarioHeading);
            var scenarioTable = document.createElement("table");
            scenarioTable.className = "pretty-corpus-scenarios";
            var scenarioHead = document.createElement("tr");
            appendCorpusCell(scenarioHead, "Case", "th");
            appendCorpusCell(scenarioHead, "Source", "th");
            appendCorpusCell(scenarioHead, "Width", "th");
            appendCorpusCell(scenarioHead, "Nodes", "th");
            appendCorpusCell(scenarioHead, "Output", "th");
            appendCorpusCell(scenarioHead, "Segments", "th");
            appendCorpusCell(scenarioHead, "Parity", "th");
            report.backendIds.forEach(function (/** @type {string} */ id) {
                appendCorpusCell(scenarioHead, report.summaries[id].label, "th");
            });
            scenarioTable.appendChild(scenarioHead);
            report.scenarios.forEach(function (/** @type {*} */ scenario) {
                var row = document.createElement("tr");
                row.className = scenario.parity ? "status-pass" : "status-fail";
                appendCorpusCell(row, scenario.label);
                appendCorpusCell(row, scenario.origin);
                appendCorpusCell(row, String(scenario.width));
                appendCorpusCell(row, String(scenario.input.formatNodes));
                appendCorpusCell(
                    row,
                    scenario.output ? formatCorpusBytes(scenario.output.textBytes) : "—",
                );
                appendCorpusCell(row, scenario.output ? String(scenario.output.segments) : "—");
                appendCorpusCell(row, scenario.parity ? "match" : "mismatch").classList.add(
                    "pretty-parity",
                );
                report.backendIds.forEach(function (/** @type {string} */ id) {
                    var backendResult = scenario.backends[id];
                    appendCorpusCell(
                        row,
                        backendResult
                            ? formatCorpusTiming(backendResult.summary.totalMs.median)
                            : "—",
                    );
                });
                scenarioTable.appendChild(row);
            });
            overlay.appendChild(scenarioTable);

            var differing = report.scenarios.filter(function (/** @type {*} */ scenario) {
                return !scenario.parity;
            });
            if (differing.length > 0) {
                var differences = document.createElement("details");
                differences.className = "pretty-corpus-differences";
                var differenceSummary = document.createElement("summary");
                differenceSummary.textContent =
                    "Inspect " + differing.length + " mismatching scenarios";
                differences.appendChild(differenceSummary);
                differing.forEach(function (/** @type {*} */ scenario) {
                    var heading = document.createElement("h4");
                    heading.textContent = scenario.label + " @ " + scenario.width + " columns";
                    differences.appendChild(heading);
                    report.backendIds.forEach(function (/** @type {string} */ id) {
                        var output = document.createElement("pre");
                        var backendResult = scenario.backends[id];
                        output.textContent =
                            report.summaries[id].label +
                            ": " +
                            (backendResult
                                ? JSON.stringify(backendResult.segments, null, 2)
                                : report.summaries[id].status);
                        differences.appendChild(output);
                    });
                });
                overlay.appendChild(differences);
            }
        }

        document.body.appendChild(overlay);
        prettyCorpusOverlay = overlay;
        closeButton.focus();
    }

    /**
     * @param {*} dimension
     * @param {string[]} backendIds
     * @param {Record<string, *>} summaries
     * @param {string} phase
     * @param {string} phaseLabel
     * @return {SVGSVGElement}
     */
    function createPrettyScalingChart(dimension, backendIds, summaries, phase, phaseLabel) {
        var namespace = "http://www.w3.org/2000/svg";
        var svg = /** @type {SVGSVGElement} */ (document.createElementNS(namespace, "svg"));
        svg.classList.add("pretty-scaling-chart");
        svg.setAttribute("viewBox", "0 0 900 270");
        svg.setAttribute("role", "img");
        svg.setAttribute(
            "aria-label",
            dimension.label +
                " versus median " +
                phaseLabel.toLowerCase() +
                " runtime; logarithmic time axis",
        );
        var left = 70;
        var right = 675;
        var top = 25;
        var bottom = 220;
        var colors = ["#74a9ff", "#f0a35e", "#77c879", "#d879c6", "#d7c45c"];
        /** @type {number[]} */
        var positive = [];
        dimension.points.forEach(function (/** @type {*} */ point) {
            backendIds.forEach(function (id) {
                var result = point.backends[id];
                var value = result && result.summary[phase].median;
                if (typeof value === "number" && value > 0) positive.push(value);
            });
        });
        var minimum = positive.length > 0 ? Math.min.apply(null, positive) : 0.001;
        var maximum = positive.length > 0 ? Math.max.apply(null, positive) : 1;
        var low = Math.log10(Math.max(0.0001, minimum * 0.75));
        var high = Math.log10(Math.max(minimum * 1.5, maximum * 1.25));

        /** @param {string} name @param {Record<string, string>} attributes */
        function element(name, attributes) {
            var node = document.createElementNS(namespace, name);
            Object.keys(attributes).forEach(function (key) {
                node.setAttribute(key, attributes[key]);
            });
            svg.appendChild(node);
            return node;
        }

        /** @param {string} value @param {number} x @param {number} y @param {string} anchor */
        function label(value, x, y, anchor) {
            var node = /** @type {SVGTextElement} */ (
                element("text", { x: String(x), y: String(y), "text-anchor": anchor })
            );
            node.textContent = value;
            return node;
        }

        element("line", {
            x1: String(left),
            y1: String(bottom),
            x2: String(right),
            y2: String(bottom),
            class: "axis",
        });
        element("line", {
            x1: String(left),
            y1: String(top),
            x2: String(left),
            y2: String(bottom),
            class: "axis",
        });
        for (var tick = 0; tick <= 4; tick++) {
            var tickLog = low + ((high - low) * tick) / 4;
            var y = bottom - ((tickLog - low) / (high - low)) * (bottom - top);
            element("line", {
                x1: String(left),
                y1: String(y),
                x2: String(right),
                y2: String(y),
                class: "grid",
            });
            label(formatCorpusTiming(10 ** tickLog), left - 8, y + 4, "end");
        }
        dimension.points.forEach(function (/** @type {*} */ point, /** @type {number} */ index) {
            var x =
                dimension.points.length === 1
                    ? left
                    : left + (index / (dimension.points.length - 1)) * (right - left);
            label(point.sizeLabel || String(point.size), x, bottom + 22, "middle");
        });
        label(phaseLabel.toLowerCase() + " median ms (log)", 8, top + 5, "start");

        backendIds.forEach(function (id, backendIndex) {
            /** @type {{ x: number, y: number, value: number, label: string, batch: number, limited: string | null }[]} */
            var points = [];
            dimension.points.forEach(
                function (/** @type {*} */ point, /** @type {number} */ index) {
                    var result = point.backends[id];
                    var value = result && result.summary[phase].median;
                    if (typeof value !== "number") return;
                    var x =
                        dimension.points.length === 1
                            ? left
                            : left + (index / (dimension.points.length - 1)) * (right - left);
                    var y =
                        bottom -
                        ((Math.log10(Math.max(value, minimum * 0.5)) - low) / (high - low)) *
                            (bottom - top);
                    points.push({
                        x: x,
                        y: y,
                        value: value,
                        label: point.sizeLabel,
                        batch: result.batchIterations || 1,
                        limited: result.batchLimitReason || null,
                    });
                },
            );
            var color = colors[backendIndex % colors.length];
            element("polyline", {
                points: points
                    .map(function (point) {
                        return point.x + "," + point.y;
                    })
                    .join(" "),
                fill: "none",
                stroke: color,
                "stroke-width": "2",
            });
            points.forEach(function (point) {
                var circle = element("circle", {
                    cx: String(point.x),
                    cy: String(point.y),
                    r: "3.5",
                    fill: color,
                });
                var title = document.createElementNS(namespace, "title");
                title.textContent =
                    summaries[id].label +
                    " · " +
                    point.label +
                    " · " +
                    formatCorpusTiming(point.value) +
                    " ms · batch " +
                    point.batch +
                    (point.limited ? " · " + point.limited : "");
                circle.appendChild(title);
            });
            var legendY = top + backendIndex * 25;
            element("line", {
                x1: "710",
                y1: String(legendY),
                x2: "735",
                y2: String(legendY),
                stroke: color,
                "stroke-width": "3",
            });
            label(summaries[id].label, 745, legendY + 4, "start");
        });
        return svg;
    }

    /** @param {*} report */
    function showPrettyScalingReport(report) {
        if (prettyCorpusOverlay) prettyCorpusOverlay.remove();
        var overlay = document.createElement("section");
        overlay.className = "pretty-corpus-overlay pretty-scaling-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Pretty-printer input scaling report");
        overlay.addEventListener("keydown", function (event) {
            event.stopPropagation();
            if (event.key === "Escape") overlay.remove();
        });
        var header = document.createElement("header");
        var title = document.createElement("h2");
        title.textContent = "Pretty-printer input scaling report";
        var actions = document.createElement("div");
        var exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = "Export JSON";
        exportButton.addEventListener("click", function () {
            downloadPrettyCorpusReport(report);
        });
        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "pretty-corpus-close";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", function () {
            overlay.remove();
        });
        actions.append(exportButton, closeButton);
        header.append(title, actions);
        overlay.appendChild(header);
        if (report.error) {
            var error = document.createElement("p");
            error.className = "pretty-corpus-result status-fail";
            error.textContent = report.error;
            overlay.appendChild(error);
        } else {
            var result = document.createElement("p");
            result.className =
                "pretty-corpus-result " + (report.passed ? "status-pass" : "status-fail");
            result.textContent =
                report.parityCount +
                "/" +
                report.scenarioCount +
                " scaling points agree · " +
                report.dimensions.length +
                " dimensions · " +
                report.samples +
                " samples · " +
                (report.benchmarkMs / 1000).toFixed(2) +
                " s wall time";
            overlay.appendChild(result);
            var note = document.createElement("p");
            note.className = "pretty-corpus-note";
            note.textContent =
                "Charts show warmed phase medians on a logarithmic time axis. Execute is the default because it best isolates the generated formatter; marshal, decode, and end-to-end total remain selectable. Adaptive batches target " +
                report.batchTargetMs +
                " ms, with allocation-heavy resident arenas capped by a " +
                formatCorpusBytes(report.batchMemoryBudgetBytes) +
                " study budget.";
            overlay.appendChild(note);
            var phaseControl = document.createElement("label");
            phaseControl.className = "pretty-scaling-phase-control";
            phaseControl.appendChild(document.createTextNode("Timing phase "));
            var phaseSelector = document.createElement("select");
            phaseSelector.className = "pretty-scaling-phase";
            var timingPhases = report.timingPhases || [
                { id: "executeMs", label: "Execute" },
                { id: "marshalMs", label: "Marshal" },
                { id: "decodeMs", label: "Decode" },
                { id: "totalMs", label: "Total" },
            ];
            timingPhases.forEach(function (/** @type {*} */ phase) {
                var option = document.createElement("option");
                option.value = phase.id;
                option.textContent = phase.label;
                option.selected = phase.id === "executeMs";
                phaseSelector.appendChild(option);
            });
            phaseControl.appendChild(phaseSelector);
            overlay.appendChild(phaseControl);
            var phaseContent = document.createElement("div");
            phaseContent.className = "pretty-scaling-phase-content";
            overlay.appendChild(phaseContent);

            function renderPhase() {
                var phase = phaseSelector.value;
                var phaseDefinition = timingPhases.find(function (/** @type {*} */ candidate) {
                    return candidate.id === phase;
                });
                var phaseLabel = phaseDefinition ? phaseDefinition.label : phase;
                phaseContent.replaceChildren();
                report.dimensions.forEach(function (/** @type {*} */ dimension) {
                    var heading = document.createElement("h3");
                    heading.textContent = dimension.label + " — " + phaseLabel;
                    phaseContent.appendChild(heading);
                    phaseContent.appendChild(
                        createPrettyScalingChart(
                            dimension,
                            report.backendIds,
                            report.summaries,
                            phase,
                            phaseLabel,
                        ),
                    );
                    var trends = document.createElement("p");
                    trends.className = "pretty-corpus-note pretty-scaling-trends";
                    var phaseTrends =
                        (dimension.phaseTrends && dimension.phaseTrends[phase]) || dimension.trends;
                    trends.textContent = report.backendIds
                        .map(function (/** @type {string} */ id) {
                            var trend = phaseTrends[id];
                            return (
                                report.summaries[id].label +
                                ": " +
                                (trend && typeof trend.growth === "number"
                                    ? trend.growth.toFixed(1) + "× growth"
                                    : "—") +
                                (trend && typeof trend.logLogSlope === "number"
                                    ? ", slope " + trend.logLogSlope.toFixed(2)
                                    : "")
                            );
                        })
                        .join(" · ");
                    phaseContent.appendChild(trends);
                    var table = document.createElement("table");
                    table.className = "pretty-scaling-table";
                    var head = document.createElement("tr");
                    [
                        "Size",
                        "Nodes",
                        "Input bytes",
                        "Depth",
                        "Tags",
                        "Breaks",
                        "Output bytes",
                        "Segments",
                        "Output lines",
                        "Parity",
                    ].forEach(function (column) {
                        appendCorpusCell(head, column, "th");
                    });
                    report.backendIds.forEach(function (/** @type {string} */ id) {
                        appendCorpusCell(head, report.summaries[id].label + " ms", "th");
                    });
                    table.appendChild(head);
                    dimension.points.forEach(function (/** @type {*} */ point) {
                        var row = document.createElement("tr");
                        row.className = point.parity ? "status-pass" : "status-fail";
                        appendCorpusCell(row, point.sizeLabel || String(point.size));
                        appendCorpusCell(row, String(point.input.formatNodes));
                        appendCorpusCell(row, String(point.input.textBytes));
                        appendCorpusCell(row, String(point.input.maxDepth));
                        appendCorpusCell(row, String(point.input.maxTagDepth));
                        appendCorpusCell(row, String(point.input.lineNodes));
                        appendCorpusCell(row, point.output ? String(point.output.textBytes) : "—");
                        appendCorpusCell(row, point.output ? String(point.output.segments) : "—");
                        appendCorpusCell(row, point.output ? String(point.output.lines) : "—");
                        appendCorpusCell(row, point.parity ? "match" : "mismatch").classList.add(
                            "pretty-parity",
                        );
                        report.backendIds.forEach(function (/** @type {string} */ id) {
                            var backend = point.backends[id];
                            appendCorpusCell(
                                row,
                                backend ? formatCorpusTiming(backend.summary[phase].median) : "—",
                            );
                        });
                        table.appendChild(row);
                    });
                    phaseContent.appendChild(table);
                });
            }

            phaseSelector.addEventListener("change", renderPhase);
            renderPhase();
        }
        document.body.appendChild(overlay);
        prettyCorpusOverlay = overlay;
        closeButton.focus();
    }

    /** @param {*} report */
    function showPrettyRepeatedReport(report) {
        if (prettyCorpusOverlay) prettyCorpusOverlay.remove();
        var overlay = document.createElement("section");
        overlay.className = "pretty-corpus-overlay pretty-repeated-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Pretty-printer repeated-call report");
        overlay.addEventListener("keydown", function (event) {
            event.stopPropagation();
            if (event.key === "Escape") overlay.remove();
        });
        var header = document.createElement("header");
        var title = document.createElement("h2");
        title.textContent = "Pretty-printer repeated-call report";
        var actions = document.createElement("div");
        var exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = "Export JSON";
        exportButton.addEventListener("click", function () {
            downloadPrettyCorpusReport(report);
        });
        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "pretty-corpus-close";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", function () {
            overlay.remove();
        });
        actions.append(exportButton, closeButton);
        header.append(title, actions);
        overlay.appendChild(header);

        if (report.error) {
            var error = document.createElement("p");
            error.className = "pretty-corpus-result status-fail";
            error.textContent = report.error;
            overlay.appendChild(error);
        } else {
            var result = document.createElement("p");
            result.className =
                "pretty-corpus-result " + (report.passed ? "status-pass" : "status-fail");
            result.textContent =
                report.totalBackendCalls +
                (report.passed
                    ? " repeated calls checked without mismatch · "
                    : " repeated calls checked; failures found · ") +
                report.cycles +
                " rotated cycles × " +
                report.workloadCount +
                " inputs · " +
                (report.benchmarkMs / 1000).toFixed(2) +
                " s wall time";
            overlay.appendChild(result);
            var note = document.createElement("p");
            note.className = "pretty-corpus-note";
            note.textContent =
                "Each cycle rotates plain, line-heavy, deeply tagged, large-text, and empty-output structural inputs. Every call is checked both against the other backends and against earlier calls of the same backend. Memory is committed Wasm capacity before and after the retained-instance workload.";
            overlay.appendChild(note);

            var summaryHeading = document.createElement("h3");
            summaryHeading.textContent = "Repeated-call timings and committed memory";
            overlay.appendChild(summaryHeading);
            var summaryTable = document.createElement("table");
            summaryTable.className = "pretty-repeated-summary";
            var summaryHead = document.createElement("tr");
            [
                "Backend",
                "Calls",
                "Total median",
                "Total p95",
                "Marshal",
                "Execute",
                "Decode",
                "Memory before",
                "Memory after",
                "Growth",
            ].forEach(function (heading) {
                appendCorpusCell(summaryHead, heading, "th");
            });
            summaryTable.appendChild(summaryHead);
            report.backendIds.forEach(function (/** @type {string} */ id) {
                var summary = report.summaries[id];
                var memory = report.memoryGrowth[id];
                var row = document.createElement("tr");
                appendCorpusCell(row, summary.label);
                appendCorpusCell(row, String(summary.timing.totalMs.samples));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.totalMs.median));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.totalMs.p95));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.marshalMs.median));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.executeMs.median));
                appendCorpusCell(row, formatCorpusTiming(summary.timing.decodeMs.median));
                appendCorpusCell(row, formatCorpusBytes(memory.beforeBytes));
                appendCorpusCell(row, formatCorpusBytes(memory.afterBytes));
                appendCorpusCell(
                    row,
                    typeof memory.deltaBytes === "number"
                        ? (memory.deltaBytes >= 0 ? "+" : "") + formatCorpusBytes(memory.deltaBytes)
                        : "—",
                );
                summaryTable.appendChild(row);
            });
            overlay.appendChild(summaryTable);

            var workloadHeading = document.createElement("h3");
            workloadHeading.textContent = "Alternating workload and output work";
            overlay.appendChild(workloadHeading);
            var workloadTable = document.createElement("table");
            workloadTable.className = "pretty-repeated-workloads";
            var workloadHead = document.createElement("tr");
            [
                "Input",
                "Width",
                "Calls/backend",
                "Nodes",
                "Input bytes",
                "Output bytes",
                "Segments",
                "Lines",
                "Tag transitions",
                "Parity/stability",
            ].forEach(function (heading) {
                appendCorpusCell(workloadHead, heading, "th");
            });
            workloadTable.appendChild(workloadHead);
            report.workloads.forEach(function (/** @type {*} */ workload) {
                var stable = report.backendIds.every(function (/** @type {string} */ id) {
                    return workload.stableByBackend[id];
                });
                var row = document.createElement("tr");
                row.className = workload.parity && stable ? "status-pass" : "status-fail";
                appendCorpusCell(row, workload.label);
                appendCorpusCell(row, String(workload.width));
                appendCorpusCell(row, String(workload.callsPerBackend));
                appendCorpusCell(row, String(workload.input.formatNodes));
                appendCorpusCell(row, String(workload.input.textBytes));
                appendCorpusCell(row, workload.output ? String(workload.output.textBytes) : "—");
                appendCorpusCell(row, workload.output ? String(workload.output.segments) : "—");
                appendCorpusCell(row, workload.output ? String(workload.output.lines) : "—");
                appendCorpusCell(
                    row,
                    workload.output ? String(workload.output.tagTransitions) : "—",
                );
                appendCorpusCell(
                    row,
                    workload.parity && stable ? "match/stable" : "failed",
                ).classList.add("pretty-parity");
                workloadTable.appendChild(row);
            });
            overlay.appendChild(workloadTable);
        }
        document.body.appendChild(overlay);
        prettyCorpusOverlay = overlay;
        closeButton.focus();
    }

    /**
     * @param {*} dimension
     * @param {string[]} backendIds
     * @param {string} metric
     * @param {string} metricLabel
     * @return {SVGSVGElement}
     */
    function createPrettyMemoryChart(dimension, backendIds, metric, metricLabel) {
        var namespace = "http://www.w3.org/2000/svg";
        var svg = /** @type {SVGSVGElement} */ (document.createElementNS(namespace, "svg"));
        svg.classList.add("pretty-scaling-chart", "pretty-memory-chart");
        svg.setAttribute("viewBox", "0 0 900 270");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", dimension.label + " versus " + metricLabel);
        var left = 78;
        var right = 675;
        var top = 25;
        var bottom = 220;
        var colors = ["#74a9ff", "#f0a35e", "#77c879", "#d879c6", "#d7c45c"];
        /** @type {number[]} */
        var values = [];
        dimension.points.forEach(function (/** @type {*} */ point) {
            backendIds.forEach(function (id) {
                var value = point.backends[id] && point.backends[id][metric];
                if (typeof value === "number" && value >= 0) values.push(value);
            });
        });
        var maximum = values.length > 0 ? Math.max.apply(null, values) : 1;
        var high = Math.log10(Math.max(2, maximum + 1));

        /** @param {string} name @param {Record<string, string>} attributes */
        function element(name, attributes) {
            var node = document.createElementNS(namespace, name);
            Object.keys(attributes).forEach(function (key) {
                node.setAttribute(key, attributes[key]);
            });
            svg.appendChild(node);
            return node;
        }

        /** @param {string} value @param {number} x @param {number} y @param {string} anchor */
        function label(value, x, y, anchor) {
            var node = /** @type {SVGTextElement} */ (
                element("text", { x: String(x), y: String(y), "text-anchor": anchor })
            );
            node.textContent = value;
            return node;
        }

        element("line", {
            x1: String(left),
            y1: String(bottom),
            x2: String(right),
            y2: String(bottom),
            class: "axis",
        });
        element("line", {
            x1: String(left),
            y1: String(top),
            x2: String(left),
            y2: String(bottom),
            class: "axis",
        });
        for (var tick = 0; tick <= 4; tick++) {
            var tickLog = (high * tick) / 4;
            var y = bottom - (tickLog / high) * (bottom - top);
            element("line", {
                x1: String(left),
                y1: String(y),
                x2: String(right),
                y2: String(y),
                class: "grid",
            });
            label(formatCorpusBytes(10 ** tickLog - 1), left - 8, y + 4, "end");
        }
        dimension.points.forEach(function (/** @type {*} */ point, /** @type {number} */ index) {
            var x =
                dimension.points.length === 1
                    ? left
                    : left + (index / (dimension.points.length - 1)) * (right - left);
            label(point.sizeLabel || String(point.size), x, bottom + 22, "middle");
        });
        label(metricLabel + " (log₁₀(bytes + 1))", 8, top + 5, "start");

        backendIds.forEach(function (id, backendIndex) {
            /** @type {{ x: number, y: number, value: number, label: string }[]} */
            var points = [];
            dimension.points.forEach(
                function (/** @type {*} */ point, /** @type {number} */ index) {
                    var value = point.backends[id] && point.backends[id][metric];
                    if (typeof value !== "number" || value < 0) return;
                    var x =
                        dimension.points.length === 1
                            ? left
                            : left + (index / (dimension.points.length - 1)) * (right - left);
                    var y = bottom - (Math.log10(value + 1) / high) * (bottom - top);
                    points.push({ x: x, y: y, value: value, label: point.sizeLabel });
                },
            );
            if (points.length === 0) return;
            var color = colors[backendIndex % colors.length];
            element("polyline", {
                points: points
                    .map(function (point) {
                        return point.x + "," + point.y;
                    })
                    .join(" "),
                fill: "none",
                stroke: color,
                "stroke-width": "2",
            });
            points.forEach(function (point) {
                var circle = element("circle", {
                    cx: String(point.x),
                    cy: String(point.y),
                    r: "3.5",
                    fill: color,
                });
                var title = document.createElementNS(namespace, "title");
                title.textContent =
                    dimension.points[0].backends[id].label +
                    " · " +
                    point.label +
                    " · " +
                    formatCorpusBytes(point.value);
                circle.appendChild(title);
            });
            var legendY = top + backendIndex * 25;
            element("line", {
                x1: "710",
                y1: String(legendY),
                x2: "735",
                y2: String(legendY),
                stroke: color,
                "stroke-width": "3",
            });
            label(dimension.points[0].backends[id].label, 745, legendY + 4, "start");
        });
        return svg;
    }

    /** @param {*} report */
    function showPrettyMemoryReport(report) {
        if (prettyCorpusOverlay) prettyCorpusOverlay.remove();
        var overlay = document.createElement("section");
        overlay.className = "pretty-corpus-overlay pretty-memory-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Pretty-printer retained-memory report");
        var header = document.createElement("header");
        var title = document.createElement("h2");
        title.textContent = "Pretty-printer retained-memory scaling";
        var actions = document.createElement("div");
        var exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = "Export JSON";
        exportButton.addEventListener("click", function () {
            downloadPrettyCorpusReport(report);
        });
        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "pretty-corpus-close";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", function () {
            overlay.remove();
        });
        actions.append(exportButton, closeButton);
        header.append(title, actions);
        overlay.appendChild(header);
        if (report.error) {
            var error = document.createElement("p");
            error.className = "pretty-corpus-result status-fail";
            error.textContent = report.error;
            overlay.appendChild(error);
        } else {
            var result = document.createElement("p");
            result.className =
                "pretty-corpus-result " + (report.passed ? "status-pass" : "status-fail");
            result.textContent =
                report.parityCount +
                "/" +
                report.pointCount +
                " one-call memory points agree · " +
                (report.durationMs / 1000).toFixed(2) +
                " s wall time";
            overlay.appendChild(result);
            var note = document.createElement("p");
            note.className = "pretty-corpus-note";
            note.textContent =
                "This in-page study reuses each module but invokes every backend exactly once per point. Per-call resident allocation is currently available from native; committed memory is available for every Wasm backend. Retained growth is sequence-dependent. The CLI additionally collects the same points from fresh browser contexts for isolated baselines.";
            overlay.appendChild(note);
            var metricControl = document.createElement("label");
            metricControl.className = "pretty-scaling-phase-control";
            metricControl.appendChild(document.createTextNode("Memory metric "));
            var metricSelector = document.createElement("select");
            metricSelector.className = "pretty-memory-metric";
            [
                { id: "residentDeltaBytes", label: "Resident allocation per call" },
                { id: "committedDeltaBytes", label: "Committed growth per call" },
                { id: "retainedCommittedGrowthBytes", label: "Retained committed growth" },
            ].forEach(function (metric) {
                var option = document.createElement("option");
                option.value = metric.id;
                option.textContent = metric.label;
                option.selected = metric.id === "residentDeltaBytes";
                metricSelector.appendChild(option);
            });
            metricControl.appendChild(metricSelector);
            overlay.appendChild(metricControl);
            var content = document.createElement("div");
            overlay.appendChild(content);

            function renderMetric() {
                var metric = metricSelector.value;
                var metricLabel =
                    metricSelector.options[metricSelector.selectedIndex].textContent || metric;
                content.replaceChildren();
                report.dimensions.forEach(function (/** @type {*} */ dimension) {
                    var heading = document.createElement("h3");
                    heading.textContent = dimension.label + " — " + metricLabel;
                    content.appendChild(heading);
                    content.appendChild(
                        createPrettyMemoryChart(dimension, report.backendIds, metric, metricLabel),
                    );
                    var table = document.createElement("table");
                    table.className = "pretty-memory-table";
                    var head = document.createElement("tr");
                    ["Size", "Input bytes", "Output bytes", "Parity"].forEach(function (column) {
                        appendCorpusCell(head, column, "th");
                    });
                    report.backendIds.forEach(function (/** @type {string} */ id) {
                        appendCorpusCell(head, dimension.points[0].backends[id].label, "th");
                    });
                    table.appendChild(head);
                    dimension.points.forEach(function (/** @type {*} */ point) {
                        var row = document.createElement("tr");
                        row.className = point.parity ? "status-pass" : "status-fail";
                        appendCorpusCell(row, point.sizeLabel || String(point.size));
                        appendCorpusCell(row, String(point.input.textBytes));
                        appendCorpusCell(row, point.output ? String(point.output.textBytes) : "—");
                        appendCorpusCell(row, point.parity ? "match" : "mismatch").classList.add(
                            "pretty-parity",
                        );
                        report.backendIds.forEach(function (/** @type {string} */ id) {
                            appendCorpusCell(row, formatCorpusBytes(point.backends[id][metric]));
                        });
                        table.appendChild(row);
                    });
                    content.appendChild(table);
                });
            }
            metricSelector.addEventListener("change", renderMetric);
            renderMetric();
        }
        document.body.appendChild(overlay);
        prettyCorpusOverlay = overlay;
        closeButton.focus();
    }

    /**
     * @param {*} interaction
     * @param {string} backendId
     * @param {string} backendLabel
     * @param {string} phase
     * @param {string} phaseLabel
     * @return {SVGSVGElement}
     */
    function createPrettyInteractionHeatmap(
        interaction,
        backendId,
        backendLabel,
        phase,
        phaseLabel,
    ) {
        var namespace = "http://www.w3.org/2000/svg";
        var svg = /** @type {SVGSVGElement} */ (document.createElementNS(namespace, "svg"));
        svg.classList.add("pretty-scaling-chart", "pretty-interaction-chart");
        svg.setAttribute("viewBox", "0 0 760 300");
        svg.setAttribute("role", "img");
        svg.setAttribute(
            "aria-label",
            interaction.label + " heatmap for " + backendLabel + " " + phaseLabel,
        );
        var left = 185;
        var top = 35;
        var cellWidth = 165;
        var cellHeight = 68;
        var values = interaction.points.map(function (/** @type {*} */ point) {
            return point.backends[backendId].summary[phase].median;
        });
        var maximum = Math.max.apply(null, values.concat([0.001]));

        /** @param {string} name @param {Record<string, string>} attributes */
        function element(name, attributes) {
            var node = document.createElementNS(namespace, name);
            Object.keys(attributes).forEach(function (key) {
                node.setAttribute(key, attributes[key]);
            });
            svg.appendChild(node);
            return node;
        }
        /** @param {string} value @param {number} x @param {number} y @param {string} anchor */
        function label(value, x, y, anchor) {
            var node = /** @type {SVGTextElement} */ (
                element("text", { x: String(x), y: String(y), "text-anchor": anchor })
            );
            node.textContent = value;
            return node;
        }

        interaction.xValues.forEach(
            function (/** @type {*} */ xValue, /** @type {number} */ xIndex) {
                label(xValue.label, left + xIndex * cellWidth + cellWidth / 2, 22, "middle");
            },
        );
        interaction.yValues.forEach(
            function (/** @type {*} */ yValue, /** @type {number} */ yIndex) {
                label(yValue.label, left - 12, top + yIndex * cellHeight + 39, "end");
                interaction.xValues.forEach(
                    function (/** @type {*} */ xValue, /** @type {number} */ xIndex) {
                        var point = interaction.points.find(function (/** @type {*} */ candidate) {
                            return candidate.x === xValue.value && candidate.y === yValue.value;
                        });
                        if (!point) return;
                        var value = point.backends[backendId].summary[phase].median;
                        var intensity = Math.max(
                            0.08,
                            Math.log10(value + 1) / Math.log10(maximum + 1),
                        );
                        var rect = element("rect", {
                            x: String(left + xIndex * cellWidth),
                            y: String(top + yIndex * cellHeight),
                            width: String(cellWidth - 4),
                            height: String(cellHeight - 4),
                            rx: "4",
                            fill: "rgba(74, 144, 226, " + intensity.toFixed(3) + ")",
                        });
                        var title = document.createElementNS(namespace, "title");
                        title.textContent =
                            backendLabel +
                            " · " +
                            xValue.label +
                            " × " +
                            yValue.label +
                            " · " +
                            formatCorpusTiming(value) +
                            " ms · output " +
                            (point.output ? formatCorpusBytes(point.output.textBytes) : "—");
                        title.textContent +=
                            " · batch " +
                            (point.backends[backendId].batchIterations || 1) +
                            (point.backends[backendId].batchLimitReason
                                ? " · " + point.backends[backendId].batchLimitReason
                                : "");
                        rect.appendChild(title);
                        label(
                            formatCorpusTiming(value) + " ms",
                            left + xIndex * cellWidth + cellWidth / 2,
                            top + yIndex * cellHeight + 38,
                            "middle",
                        );
                    },
                );
            },
        );
        label(
            interaction.xAxis,
            left + (interaction.xValues.length * cellWidth) / 2,
            288,
            "middle",
        );
        label(interaction.yAxis, 8, top + 5, "start");
        return svg;
    }

    /** @param {*} report */
    function showPrettyInteractionReport(report) {
        if (prettyCorpusOverlay) prettyCorpusOverlay.remove();
        var overlay = document.createElement("section");
        overlay.className = "pretty-corpus-overlay pretty-interaction-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Pretty-printer interaction report");
        var header = document.createElement("header");
        var title = document.createElement("h2");
        title.textContent = "Pretty-printer interaction study";
        var actions = document.createElement("div");
        var exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = "Export JSON";
        exportButton.addEventListener("click", function () {
            downloadPrettyCorpusReport(report);
        });
        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "pretty-corpus-close";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", function () {
            overlay.remove();
        });
        actions.append(exportButton, closeButton);
        header.append(title, actions);
        overlay.appendChild(header);
        if (report.error) {
            var error = document.createElement("p");
            error.className = "pretty-corpus-result status-fail";
            error.textContent = report.error;
            overlay.appendChild(error);
        } else {
            var result = document.createElement("p");
            result.className =
                "pretty-corpus-result " + (report.passed ? "status-pass" : "status-fail");
            result.textContent =
                report.parityCount +
                "/" +
                report.scenarioCount +
                " interaction points agree · " +
                report.interactions.length +
                " grids · adaptive batches target " +
                report.batchTargetMs +
                " ms · memory budget " +
                formatCorpusBytes(report.batchMemoryBudgetBytes);
            overlay.appendChild(result);
            var note = document.createElement("p");
            note.className = "pretty-corpus-note";
            note.textContent =
                "Heatmaps isolate breaks × width, nodes × depth, tag depth × output transitions, and input bytes × output expansion. Hover a cell for exact time and output size.";
            overlay.appendChild(note);
            var controls = document.createElement("div");
            controls.className = "pretty-interaction-controls";
            var backendLabel = document.createElement("label");
            backendLabel.appendChild(document.createTextNode("Backend "));
            var backendSelector = document.createElement("select");
            backendSelector.className = "pretty-interaction-backend";
            report.backendIds.forEach(function (/** @type {string} */ id) {
                var option = document.createElement("option");
                option.value = id;
                option.textContent = report.summaries[id].label;
                option.selected = id === "native";
                backendSelector.appendChild(option);
            });
            backendLabel.appendChild(backendSelector);
            var phaseLabel = document.createElement("label");
            phaseLabel.appendChild(document.createTextNode("Phase "));
            var phaseSelector = document.createElement("select");
            phaseSelector.className = "pretty-interaction-phase";
            report.timingPhases.forEach(function (/** @type {*} */ phase) {
                var option = document.createElement("option");
                option.value = phase.id;
                option.textContent = phase.label;
                option.selected = phase.id === "executeMs";
                phaseSelector.appendChild(option);
            });
            phaseLabel.appendChild(phaseSelector);
            controls.append(backendLabel, phaseLabel);
            overlay.appendChild(controls);
            var content = document.createElement("div");
            overlay.appendChild(content);

            function renderInteraction() {
                var backendId = backendSelector.value;
                var phase = phaseSelector.value;
                var selectedPhaseLabel =
                    phaseSelector.options[phaseSelector.selectedIndex].textContent || phase;
                content.replaceChildren();
                report.interactions.forEach(function (/** @type {*} */ interaction) {
                    var heading = document.createElement("h3");
                    heading.textContent =
                        interaction.label +
                        " — " +
                        report.summaries[backendId].label +
                        " " +
                        selectedPhaseLabel;
                    content.appendChild(heading);
                    content.appendChild(
                        createPrettyInteractionHeatmap(
                            interaction,
                            backendId,
                            report.summaries[backendId].label,
                            phase,
                            selectedPhaseLabel,
                        ),
                    );
                });
            }
            backendSelector.addEventListener("change", renderInteraction);
            phaseSelector.addEventListener("change", renderInteraction);
            renderInteraction();
        }
        document.body.appendChild(overlay);
        prettyCorpusOverlay = overlay;
        closeButton.focus();
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
