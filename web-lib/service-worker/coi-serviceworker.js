// @ts-check
/* Add cross-origin isolation headers when a static host cannot configure them. */
"use strict";

var worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {*} */ (globalThis));

worker.addEventListener("install", function (event) {
    event.waitUntil(worker.skipWaiting());
});

worker.addEventListener("activate", function (event) {
    event.waitUntil(worker.clients.claim());
});

worker.addEventListener("fetch", function (event) {
    var request = event.request;
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
    event.respondWith(
        fetch(request).then(function (response) {
            if (response.status === 0) return response;
            var headers = new Headers(response.headers);
            headers.set("Cross-Origin-Opener-Policy", "same-origin");
            headers.set("Cross-Origin-Embedder-Policy", "require-corp");
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
            });
        }),
    );
});
