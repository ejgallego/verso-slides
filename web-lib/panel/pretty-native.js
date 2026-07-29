// @ts-check
/* Optional FIR-produced native Wasm bootstrap for the pretty-printer prototype. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   enabled?: boolean,
     *   adapterUrl?: string,
     *   wasmUrl?: string,
     *   descriptorUrl?: string,
     *   buildUrl?: string,
     *   fetchCache?: RequestCache,
     *   maximumNodes?: number
     * }} PrettyNativeConfig
     *
     * @typedef {{
     *   enabled?: boolean,
     *   status?: string,
     *   ready?: Promise<*>,
     *   error?: *,
     *   build?: *,
     *   adapter?: *,
     *   startupTimings?: *,
     *   formatSegments?: (
     *     fmtJson: *,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => Segment[],
     *   formatSegmentsTimed?: (
     *     fmtJson: *,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => NativeFormatResult,
     *   traceToSegments?: (trace: NativePrettyTrace) => Segment[],
     *   warnings?: Record<string, boolean>
     * }} PrettyNativeBridge
     *
     * @typedef {{
     *   text: string,
     *   segments: Segment[],
     *   timings: {
     *     marshalMs: number,
     *     executeMs: number,
     *     decodeMs: number,
     *     renderMs: number,
     *     totalMs: number,
     *     adapterInputMs?: number,
     *     normalizeMs?: number,
     *     allocateMs?: number,
     *     encodeMs?: number,
     *     inputBytes?: number,
     *     rawObjects?: number,
     *     allocationCalls?: number
     *   },
     *   memory?: *
     * }} NativeFormatResult
     *
     * @typedef {{ kind: number, text: string, value: bigint }} NativePrettyEvent
     *
     * @typedef {{ text: string, events: NativePrettyEvent[] }} NativePrettyTrace
     */

    var root = /** @type {Window & {
        __versoPrettyNativeConfig?: PrettyNativeConfig,
        __versoPrettyNative?: PrettyNativeBridge
    }} */ (window);
    var config = root.__versoPrettyNativeConfig || {};
    var bridge = root.__versoPrettyNative || {};
    bridge.enabled = config.enabled !== false;
    bridge.status = bridge.enabled ? "loading" : "disabled";
    root.__versoPrettyNative = bridge;

    /** @type {PrettyBackendDefinition} */
    var nativeBackend = {
        id: "native",
        label: "Native",
        capabilities: { output: "segments", width: "columns" },
        status: function () {
            return bridge.status || "unavailable";
        },
        renderTimed: function (fmtJson, _annotations, pixelWidth, measurer) {
            if (
                bridge.enabled === false ||
                bridge.status !== "ready" ||
                typeof bridge.formatSegments !== "function"
            ) {
                return {
                    segments: null,
                    timings: {
                        marshalMs: 0,
                        executeMs: 0,
                        decodeMs: 0,
                        renderMs: 0,
                        totalMs: 0,
                    },
                };
            }
            try {
                var spaceWidth = measurer.spaceWidth > 0 ? measurer.spaceWidth : 1;
                var width = Math.max(1, Math.floor(pixelWidth / spaceWidth));
                if (typeof bridge.formatSegmentsTimed === "function") {
                    var result = bridge.formatSegmentsTimed(fmtJson, width, 0, 0);
                    return {
                        segments: result.segments,
                        timings: result.timings,
                    };
                }
                var started = performance.now();
                var segments = bridge.formatSegments(fmtJson, width, 0, 0);
                var finished = performance.now();
                return {
                    segments: segments,
                    timings: {
                        marshalMs: 0,
                        executeMs: finished - started,
                        decodeMs: 0,
                        renderMs: 0,
                        totalMs: finished - started,
                    },
                };
            } catch (error) {
                warnOnce("render", "Native pretty-printer backend failed.", error);
                return {
                    segments: null,
                    timings: {
                        marshalMs: 0,
                        executeMs: 0,
                        decodeMs: 0,
                        renderMs: 0,
                        totalMs: 0,
                    },
                };
            }
        },
    };
    registerPrettyBackend(nativeBackend);
    bridge.traceToSegments = traceToSegments;

    if (bridge.enabled === false) return;

    var currentScript = document.currentScript;
    var scriptUrl =
        currentScript instanceof HTMLScriptElement && currentScript.src
            ? currentScript.src
            : window.location.href;

    /** @param {string} path */
    function fromScript(path) {
        return new URL(path, scriptUrl).href;
    }

    /**
     * @param {string} key
     * @param {string} message
     * @param {*} error
     */
    function warnOnce(key, message, error) {
        var warnings = bridge.warnings || (bridge.warnings = {});
        if (warnings[key]) return;
        warnings[key] = true;
        console.warn(message, error);
    }

    /**
     * Convert the artifact's raw `PrettyTrace` event stream into the segment
     * contract shared by the JS and VIR candidates.
     *
     * Event kinds are the `MonadPrettyFormat` operations output, newline,
     * startTag, and endTags respectively. Newline segments are deliberately
     * untagged, matching `VersoSlides.Pretty`.
     * @param {NativePrettyTrace} trace
     * @return {Segment[]}
     */
    function traceToSegments(trace) {
        /** @type {number[]} */
        var tagStack = [];
        /** @type {Segment[]} */
        var segments = [];

        /**
         * @param {bigint} value
         * @param {string} label
         * @return {number}
         */
        function safeNatural(value, label) {
            if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
                throw new Error(label + " is outside JavaScript's safe integer range");
            }
            return Number(value);
        }

        trace.events.forEach(function (event) {
            switch (event.kind) {
                case 0:
                    if (event.text.length > 0) {
                        segments.push({ text: event.text, tags: tagStack.slice() });
                    }
                    break;
                case 1: {
                    var indent = safeNatural(event.value, "native pretty newline indentation");
                    segments.push({ text: "\n" + " ".repeat(indent), tags: [] });
                    break;
                }
                case 2:
                    tagStack.push(safeNatural(event.value, "native pretty tag"));
                    break;
                case 3: {
                    var count = safeNatural(event.value, "native pretty endTags count");
                    if (count > tagStack.length) {
                        throw new Error("native pretty trace ends more tags than it started");
                    }
                    tagStack.length -= count;
                    break;
                }
                default:
                    throw new Error("native pretty trace has unknown event kind " + event.kind);
            }
        });

        if (tagStack.length !== 0) {
            throw new Error("native pretty trace leaves tags open");
        }
        var text = segments
            .map(function (segment) {
                return segment.text;
            })
            .join("");
        if (text !== trace.text) {
            throw new Error("native pretty trace text projection disagrees with its events");
        }
        return segments;
    }

    /**
     * Convert Verso's compact array encoding into the adapter's versioned
     * transport type. Raw Lean heap layout remains entirely upstream-owned.
     * @param {*} formatFactory
     * @param {*} json
     * @return {*}
     */
    function compactFormatToAdapterInput(formatFactory, json) {
        if (json === null) return formatFactory.nil();
        if (json === 1) return formatFactory.line();
        if (typeof json === "string") return formatFactory.text(json);
        if (!Array.isArray(json) || json.length === 0) {
            throw new Error("invalid compact Std.Format node");
        }

        switch (json[0]) {
            case 2:
                return formatFactory.align(Boolean(json[1]));
            case 3:
                if (!Number.isSafeInteger(json[1]) || json[1] < 0) {
                    throw new Error("invalid Std.Format.nest indentation");
                }
                return formatFactory.nest(
                    json[1],
                    compactFormatToAdapterInput(formatFactory, json[2]),
                );
            case 4:
                return formatFactory.append(
                    compactFormatToAdapterInput(formatFactory, json[1]),
                    compactFormatToAdapterInput(formatFactory, json[2]),
                );
            case 5:
            case 6:
                return formatFactory.group(
                    compactFormatToAdapterInput(formatFactory, json[1]),
                    json[0] === 5 ? "allOrNone" : "fill",
                );
            case 7:
                if (!Number.isSafeInteger(json[1]) || json[1] < 0) {
                    throw new Error("invalid Std.Format tag");
                }
                return formatFactory.tag(
                    json[1],
                    compactFormatToAdapterInput(formatFactory, json[2]),
                );
            default:
                throw new Error("unknown compact Std.Format node tag " + json[0]);
        }
    }

    /**
     * @param {*} adapter
     * @param {*} formatFactory
     * @return {(fmtJson: *, width: number, indent: number, column: number) => NativeFormatResult}
     */
    function createNativePrettyClient(adapter, formatFactory) {
        return function (fmtJson, width, indent, column) {
            var started = performance.now();
            var format = compactFormatToAdapterInput(formatFactory, fmtJson);
            var inputAdapted = performance.now();
            var result = adapter.render({
                format: format,
                width: width,
                indent: indent,
                column: column,
            });
            var traceDecoded = performance.now();
            var segments = traceToSegments(result.trace);
            var finished = performance.now();
            var adapterInputMs = inputAdapted - started;
            var segmentDecodeMs = finished - traceDecoded;
            return {
                text: result.trace.text,
                segments: segments,
                timings: {
                    marshalMs: adapterInputMs + result.timings.prepareMs,
                    executeMs: result.timings.executeMs,
                    decodeMs: result.timings.decodeMs + segmentDecodeMs,
                    renderMs: 0,
                    totalMs: finished - started,
                    adapterInputMs: adapterInputMs,
                    normalizeMs: result.timings.normalizeMs,
                    allocateMs: result.timings.allocateMs,
                    encodeMs: result.timings.encodeMs,
                    inputBytes: result.memory.inputBytes,
                    rawObjects: result.memory.rawObjects,
                    allocationCalls: result.memory.residentAllocationCalls,
                },
                memory: result.memory,
            };
        };
    }

    var adapterUrl = config.adapterUrl || fromScript("./lean-native/prettyM-browser-adapter.mjs");
    var wasmUrl = config.wasmUrl || fromScript("./lean-native/prettyM.wasm");
    var descriptorUrl = config.descriptorUrl || wasmUrl + ".json";
    var buildUrl = config.buildUrl || fromScript("./lean-native/BUILD.json");

    /** @param {RequestInfo | URL} url */
    function fetchArtifact(url) {
        return fetch(url, { cache: config.fetchCache || "default" });
    }

    bridge.ready = import(adapterUrl)
        .then(function (adapterModule) {
            if (
                typeof adapterModule.fetchPrettyMAdapter !== "function" ||
                !adapterModule.PrettyFormat
            ) {
                throw new Error("native package does not export its browser adapter API");
            }
            return adapterModule
                .fetchPrettyMAdapter(wasmUrl, {
                    descriptorUrl: descriptorUrl,
                    buildUrl: buildUrl,
                    maximumNodes: config.maximumNodes,
                    fetchImpl: fetchArtifact,
                })
                .then(
                    /** @param {*} adapter */
                    function (adapter) {
                        return {
                            adapter: adapter,
                            formatFactory: adapterModule.PrettyFormat,
                        };
                    },
                );
        })
        .then(function (loaded) {
            bridge.adapter = loaded.adapter;
            bridge.build = loaded.adapter.build;
            bridge.startupTimings = loaded.adapter.startupTimings;
            bridge.formatSegmentsTimed = createNativePrettyClient(
                loaded.adapter,
                loaded.formatFactory,
            );
            bridge.formatSegments = function (fmtJson, width, indent, column) {
                if (!bridge.formatSegmentsTimed) {
                    throw new Error("native pretty timing client is unavailable");
                }
                return bridge.formatSegmentsTimed(fmtJson, width, indent, column).segments;
            };
            bridge.status = "ready";
            return loaded.adapter;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            warnOnce("load", "Native pretty-printer bootstrap failed.", error);
            return null;
        });
    nativeBackend.ready = bridge.ready;
})();
