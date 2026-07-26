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
     *   fetchCache?: RequestCache
     * }} PrettyNativeConfig
     *
     * @typedef {{
     *   enabled?: boolean,
     *   status?: string,
     *   ready?: Promise<*>,
     *   error?: *,
     *   format?: (fmtJson: *, width: number, indent: number, column: number) => string,
     *   formatTimed?: (
     *     fmtJson: *,
     *     width: number,
     *     indent: number,
     *     column: number
     *   ) => NativeFormatResult,
     *   warnings?: Record<string, boolean>
     * }} PrettyNativeBridge
     *
     * @typedef {{
     *   text: string,
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

    /**
     * The current native artifact returns a plain Lean `String`, so this
     * candidate deliberately has no tag annotations. It compares layout and
     * execution time without pretending to preserve syntax highlighting.
     * @type {PrettyBackendDefinition}
     */
    var nativeBackend = {
        id: "native",
        label: "Native",
        capabilities: { output: "text", width: "columns" },
        status: function () {
            return bridge.status || "unavailable";
        },
        renderTimed: function (fmtJson, _annotations, pixelWidth, measurer) {
            if (
                bridge.enabled === false ||
                bridge.status !== "ready" ||
                typeof bridge.format !== "function"
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
                if (typeof bridge.formatTimed === "function") {
                    var result = bridge.formatTimed(fmtJson, width, 0, 0);
                    return {
                        segments: [{ text: result.text, tags: [] }],
                        timings: result.timings,
                    };
                }
                var started = performance.now();
                var text = bridge.format(fmtJson, width, 0, 0);
                var finished = performance.now();
                return {
                    segments: [{ text: text, tags: [] }],
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
     * @return {(fmtJson: *, width: number, indent: number, column: number) => NativeFormatResult}
     */
    function createNativePrettyClient(artifact) {
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
            var result = host.decode("object", physical);
            if (!result || result.kind !== "heap") {
                throw new Error("native pretty artifact returned a non-string value");
            }
            var text = host.readString(host.addressOf(result.location));
            var decoded = performance.now();
            return {
                text: text,
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

    bridge.ready = Promise.all([
        import(new URL("module-client.mjs", runtimeBaseUrl).href),
        import(new URL("concrete-host.mjs", runtimeBaseUrl).href),
        import(new URL("concrete-artifact-external-registry.mjs", runtimeBaseUrl).href),
        fetchChecked(wasmUrl).then(function (response) {
            return response.arrayBuffer();
        }),
        fetchChecked(descriptorUrl).then(function (response) {
            return response.json();
        }),
    ])
        .then(function (loaded) {
            var clientModule = loaded[0];
            var hostModule = loaded[1];
            var registryModule = loaded[2];
            var bytes = loaded[3];
            var manifest = loaded[4];
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
            var host = new hostModule.ConcreteHost(
                manifest.imports,
                undefined,
                registry,
                manifest.closureDispatch,
            );
            return clientModule.instantiateModuleArtifact({
                bytes: bytes,
                manifest: manifest,
                host: host,
            });
        })
        .then(function (artifact) {
            bridge.formatTimed = createNativePrettyClient(artifact);
            bridge.format = function (fmtJson, width, indent, column) {
                if (!bridge.formatTimed) {
                    throw new Error("native pretty timing client is unavailable");
                }
                return bridge.formatTimed(fmtJson, width, indent, column).text;
            };
            bridge.status = "ready";
            return artifact;
        })
        .catch(function (error) {
            bridge.status = "failed";
            bridge.error = error;
            warnOnce("load", "Native pretty-printer bootstrap failed.", error);
            return null;
        });
    nativeBackend.ready = bridge.ready;
})();
