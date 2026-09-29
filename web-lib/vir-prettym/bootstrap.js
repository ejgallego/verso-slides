// @ts-check

/* One embedded PrettyM program and one page-owned lifetime. */
(function () {
    "use strict";
    var urls = window.__versoVirResourceUrls;
    var disposed = false;
    window.addEventListener("pagehide", function (event) {
        if (event.persisted) return;
        disposed = true;
        window.versoVir?.dispose();
    });

    window.versoVirReady = (async function () {
        var runtimeModuleUrl = new URL(urls.runtimeModule, document.baseURI);
        var runtimeManifestUrl = new URL(urls.runtimeManifest, document.baseURI);
        var programManifestUrl = new URL(urls.programManifest, document.baseURI);
        var loader = await import(runtimeModuleUrl.href);
        var program = await loader.createProgram({ runtimeManifestUrl, programManifestUrl });
        if (disposed) {
            program.dispose();
            throw new Error("Page closed before PrettyM was ready");
        }
        window.versoVirFormatSegments = function (format, width, indent) {
            var request = JSON.stringify({
                schemaVersion: 1,
                widthUnit: "columns",
                width: width,
                indent: indent,
                format: format,
            });
            var response = JSON.parse(program.call("prettyM", request));
            if (response.schemaVersion !== 1) {
                throw new Error("Unexpected PrettyM response schema");
            }
            if (!response.ok) {
                throw new Error(response.error?.code || "PrettyM call failed");
            }
            if (response.widthUnit !== "columns" || !Array.isArray(response.segments)) {
                throw new Error("PrettyM response has no segments");
            }
            return response.segments;
        };
        window.versoVir = program;
        return program;
    })();
    window.versoVirReady.catch(function (error) {
        if (disposed) return;
        var message = document.createElement("p");
        message.setAttribute("role", "alert");
        message.textContent = "VIR initialization failed: " + String(error);
        document.body.appendChild(message);
    });
})();
