// @ts-check
/* Optional FIR-produced native Wasm bootstrap for the pretty-printer prototype. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   enabled?: boolean,
     *   runtimeBaseUrl?: string,
     *   wasmUrl?: string,
     *   descriptorUrl?: string,
     *   buildUrl?: string,
     *   fetchCache?: RequestCache
     * }} PrettyNativeConfig
     *
     * @typedef {{
     *   enabled?: boolean,
     *   status?: string,
     *   ready?: Promise<*>,
     *   error?: *,
     *   build?: *,
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
     *     totalMs: number
     *   }
     * }} NativeFormatResult
     *
     * @typedef {{
     *   manifest: { params: string[], result: string },
     *   host: *,
     *   instance: WebAssembly.Instance,
     *   entry: (...args: *[]) => *
     * }} NativeArtifact
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

    /** @param {string} base */
    function asDirectoryUrl(base) {
        return base.endsWith("/") ? base : base + "/";
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
     * @param {string} url
     * @return {Promise<Response>}
     */
    function fetchChecked(url) {
        return fetch(url, { cache: config.fetchCache || "default" }).then(function (response) {
            if (!response.ok) {
                throw new Error("failed to load " + url + ": HTTP " + response.status);
            }
            return response;
        });
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
     * Validate the atomic package's machine-readable capability contract.
     * The raw trace ABI is intentionally experimental; these checks reject a
     * silent fallback to the earlier plain-string package.
     * @param {*} manifest
     * @param {*} build
     */
    function validateNativePackageMetadata(manifest, build) {
        if (
            !build ||
            build.format !== "fir-prettyM-package-metadata-v2" ||
            build.sourceDirty !== false ||
            build.entry !== manifest.entry ||
            build.result !== manifest.result
        ) {
            throw new Error("native pretty package metadata is inconsistent");
        }
        var capabilities = build.capabilities;
        var output = capabilities && capabilities.output;
        if (
            !output ||
            output.semantic !== "PrettyTrace" ||
            output.physical !== "object" ||
            output.taggedSegments !== true
        ) {
            throw new Error("native pretty package does not provide styled trace output");
        }
        if (
            capabilities.representation !== "wasm32-lean64" ||
            capabilities.memoryOwner !== "module"
        ) {
            throw new Error("native pretty package has an unsupported memory representation");
        }
    }

    /**
     * Convert the compact Verso format encoding directly into Lean 4.32's raw
     * `Std.Format` constructor layout owned by the artifact's concrete host.
     * @param {*} host
     * @param {*} json
     * @return {*}
     */
    function compactFormatToNative(host, json) {
        /** @param {number | bigint} payload */
        function tagged(payload) {
            return host.encode("tobject", {
                kind: "tagged",
                payload: BigInt(payload),
            });
        }

        /** @param {number | bigint} value */
        function natural(value) {
            var physical = host.allocateNatural(BigInt(value));
            return host.encode("tobject", host.decode("tobject", physical));
        }

        /** @param {string} value */
        function string(value) {
            var physical = host.allocateString(value);
            return host.encode("object", host.decode("object", physical));
        }

        /**
         * @param {string} name
         * @param {number} tag
         * @param {*[]} fields
         * @param {string[]} fieldKinds
         * @param {number[]} [scalarBytes]
         */
        function ctor(name, tag, fields, fieldKinds, scalarBytes) {
            var bytes = scalarBytes || [];
            var result = host.allocCtor(
                {
                    kind: "allocCtor",
                    name: name,
                    result: "tobject",
                    size: fields.length,
                    usize: 0,
                    ssize: bytes.length,
                    tag: String(tag),
                    fields: fieldKinds,
                },
                fields,
            );
            bytes.forEach(function (value, offset) {
                host.scalarSet(
                    {
                        kind: "scalarSet",
                        width: fields.length,
                        offset: offset,
                        field: "uint8",
                    },
                    [result, value],
                );
            });
            return result;
        }

        if (json === null) return tagged(0);
        if (json === 1) return tagged(1);
        if (typeof json === "string") {
            return ctor("Std.Format.text", 3, [string(json)], ["object"]);
        }
        if (!Array.isArray(json) || json.length === 0) {
            throw new Error("invalid compact Std.Format node");
        }

        switch (json[0]) {
            case 2:
                return ctor("Std.Format.align", 2, [], [], [json[1] ? 1 : 0]);
            case 3:
                if (!Number.isSafeInteger(json[1]) || json[1] < 0) {
                    throw new Error("invalid Std.Format.nest indentation");
                }
                return ctor(
                    "Std.Format.nest",
                    4,
                    [natural(json[1]), compactFormatToNative(host, json[2])],
                    ["tobject", "tobject"],
                );
            case 4:
                return ctor(
                    "Std.Format.append",
                    5,
                    [compactFormatToNative(host, json[1]), compactFormatToNative(host, json[2])],
                    ["tobject", "tobject"],
                );
            case 5:
            case 6:
                return ctor(
                    "Std.Format.group",
                    6,
                    [compactFormatToNative(host, json[1])],
                    ["tobject"],
                    [json[0] === 5 ? 0 : 1],
                );
            case 7:
                if (!Number.isSafeInteger(json[1]) || json[1] < 0) {
                    throw new Error("invalid Std.Format tag");
                }
                return ctor(
                    "Std.Format.tag",
                    7,
                    [natural(json[1]), compactFormatToNative(host, json[2])],
                    ["tobject", "tobject"],
                );
            default:
                throw new Error("unknown compact Std.Format node tag " + json[0]);
        }
    }

    /**
     * @param {NativeArtifact} artifact
     * @param {(host: *, result: *) => NativePrettyTrace} decodeTrace
     * @return {(fmtJson: *, width: number, indent: number, column: number) => NativeFormatResult}
     */
    function createNativePrettyClient(artifact, decodeTrace) {
        if (
            artifact.manifest.result !== "object" ||
            artifact.manifest.params.length !== 4 ||
            !artifact.manifest.params.every(function (kind) {
                return kind === "tobject";
            })
        ) {
            throw new Error("native pretty artifact has an incompatible raw ABI");
        }

        var host = artifact.host;
        var entry = artifact.entry;
        var setFrontier = artifact.instance.exports.fir_heap_set_frontier;
        if (setFrontier !== undefined && typeof setFrontier !== "function") {
            throw new Error("native pretty artifact has an invalid fir_heap_set_frontier export");
        }

        /** @param {number} value */
        function natural(value) {
            if (!Number.isSafeInteger(value) || value < 0) {
                throw new Error("native pretty argument must be a nonnegative safe integer");
            }
            var physical = host.allocateNatural(BigInt(value));
            return host.encode("tobject", host.decode("tobject", physical));
        }

        return function (fmtJson, width, indent, column) {
            var started = performance.now();
            var format = compactFormatToNative(host, fmtJson);
            var args = [format, natural(width), natural(indent), natural(column)];
            if (typeof setFrontier === "function") {
                setFrontier(host.heapCursor);
            }
            var marshaled = performance.now();
            var physical = entry.apply(null, args);
            var executed = performance.now();
            var trace = decodeTrace(host, physical);
            var segments = traceToSegments(trace);
            var decoded = performance.now();
            return {
                text: trace.text,
                segments: segments,
                timings: {
                    marshalMs: marshaled - started,
                    executeMs: executed - marshaled,
                    decodeMs: decoded - executed,
                    renderMs: 0,
                    totalMs: decoded - started,
                },
            };
        };
    }

    var runtimeBaseUrl = asDirectoryUrl(
        config.runtimeBaseUrl || fromScript("./lean-native/runtime/integration/talos/artifact/"),
    );
    var wasmUrl = config.wasmUrl || fromScript("./lean-native/prettyM.wasm");
    var descriptorUrl = config.descriptorUrl || wasmUrl + ".json";
    var buildUrl = config.buildUrl || fromScript("./lean-native/BUILD.json");

    bridge.ready = Promise.all([
        import(new URL("module-client.mjs", runtimeBaseUrl).href),
        import(new URL("concrete-host.mjs", runtimeBaseUrl).href),
        import(new URL("concrete-artifact-external-registry.mjs", runtimeBaseUrl).href),
        import(new URL("check-concrete-pretty-format-trace-module.mjs", runtimeBaseUrl).href),
        fetchChecked(wasmUrl).then(function (response) {
            return response.arrayBuffer();
        }),
        fetchChecked(descriptorUrl).then(function (response) {
            return response.json();
        }),
        fetchChecked(buildUrl).then(function (response) {
            return response.json();
        }),
    ])
        .then(function (loaded) {
            var clientModule = loaded[0];
            var hostModule = loaded[1];
            var registryModule = loaded[2];
            var traceModule = loaded[3];
            var bytes = loaded[4];
            var manifest = loaded[5];
            var build = loaded[6];
            if (typeof clientModule.instantiateModuleArtifact !== "function") {
                throw new Error("native runtime does not export instantiateModuleArtifact");
            }
            if (typeof hostModule.ConcreteHost !== "function") {
                throw new Error("native runtime does not export ConcreteHost");
            }
            var registry = registryModule.concreteArtifactExternalRegistry;
            if (!registry) {
                throw new Error("native runtime does not export its external registry");
            }
            if (typeof traceModule.decodeConcretePrettyTrace !== "function") {
                throw new Error("native runtime does not export its styled trace decoder");
            }
            validateNativePackageMetadata(manifest, build);
            bridge.build = build;
            var host = new hostModule.ConcreteHost(
                manifest.imports,
                undefined,
                registry,
                manifest.closureDispatch,
            );
            return clientModule
                .instantiateModuleArtifact({
                    bytes: bytes,
                    manifest: manifest,
                    host: host,
                })
                .then(
                    /** @param {NativeArtifact} artifact */
                    function (artifact) {
                        return {
                            artifact: artifact,
                            decodeTrace: traceModule.decodeConcretePrettyTrace,
                        };
                    },
                );
        })
        .then(function (loaded) {
            bridge.formatSegmentsTimed = createNativePrettyClient(
                loaded.artifact,
                loaded.decodeTrace,
            );
            bridge.formatSegments = function (fmtJson, width, indent, column) {
                if (!bridge.formatSegmentsTimed) {
                    throw new Error("native pretty timing client is unavailable");
                }
                return bridge.formatSegmentsTimed(fmtJson, width, indent, column).segments;
            };
            bridge.status = "ready";
            return loaded.artifact;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            warnOnce("load", "Native pretty-printer bootstrap failed.", error);
            return null;
        });
    nativeBackend.ready = bridge.ready;
})();
