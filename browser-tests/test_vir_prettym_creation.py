"""Consumer gate for the published strict loader and Slides' independent v2 reference."""
import hashlib
import json
from pathlib import Path

import pytest

from test_vir_prettym_site import open_demo

RUNTIME = "401b115ed3f4770b11e5b64d6066cbebb5b41beb468c3f9908603b89690776ba"
PROGRAM = "97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58"


def test_exact_pair_published_bytes_and_reference(site_dir):
    reference = json.loads((Path(__file__).parents[1] / "web-lib/vir-prettym/format-segments-v2.contract.json").read_text())
    for route in ("", "nested/deck"):
        root = site_dir / route
        manifests = [json.loads(p.read_text()) for p in root.glob("lib/vir/*/bundle.json")]
        assert {m["contentId"] for m in manifests} == {RUNTIME, PROGRAM}
        runtime = next(m for m in manifests if m["contentId"] == RUNTIME)
        assert runtime["descriptor"]["compatibility"] == {
            "leanRevision": "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b", "virVersion": 1,
        }
        for info in runtime["descriptor"]["files"]:
            payload = (root / "lib/vir" / RUNTIME / info["path"]).read_bytes()
            assert len(payload) == info["byteLength"]
            assert hashlib.sha256(payload).hexdigest() == info["sha256"]
        assert hashlib.sha256((root / "lib/vir" / RUNTIME / "runtime.js").read_bytes()).hexdigest() == "08e542ef60d71b9308b1e12ba3f4438fef24b7634e1aab1f380a93833e1469a0"
        assert hashlib.sha256((root / "lib/vir" / RUNTIME / "runtime.wasm").read_bytes()).hexdigest() == "e74e7f8e663537a4f0035c0edf594fbea9699f40b4b683ffe563922b4f453ec4"
        bootstrap = (root / "vir-bootstrap.js").read_text()
        embedded = bootstrap.split("window.__versoVirExpectedExports = ", 1)[1].split(";\n", 1)[0]
        assert json.loads(embedded) == reference


# All tests import the emitted ESM module, never producer source or a test SDK.
SETUP = """async () => {
    const urls = window.__versoVirResourceUrls;
    const {createProgram} = await import(new URL(urls.runtimeModule, document.baseURI).href);
    const options = {
        runtimeManifestUrl: new URL(urls.runtimeManifest, document.baseURI),
        programManifestUrl: new URL(urls.programManifest, document.baseURI),
        expectedExports: window.__versoVirExpectedExports,
    };
"""


def test_expected_identity_and_actual_signature_reject_before_instantiation(page, server):
    open_demo(page, server)
    result = page.evaluate(SETUP + """
    const changes = [
        ['role', e => { e.missing = e.formatSegments; delete e.formatSegments; }],
        ['declaration', e => e.formatSegments.declaration = 'Dependency.formatSegments'],
        ['alias', e => e.formatSegments.declaration = 'formatSegments'],
        ['id', e => e.formatSegments.interfaceId = 'verso-slides-format-segments-hostabi-v1'],
        ['arity', e => e.formatSegments.signature.args.pop()],
        ['argument order', e => e.formatSegments.signature.args.reverse()],
        ['result', e => e.formatSegments.signature.result = {type: 'Nat', interfaceTag: 0}],
        ['effect', e => e.formatSegments.signature.effect = 'io'],
        ['constructors', e => {
            const ctor = e.formatSegments.signature.args[0].constructors[4];
            ctor.name = 'Std.Format.otherNest'; ctor.jsName = 'otherNest';
        }],
        ['layout', e => {
            const fields = e.formatSegments.signature.result.constructors[1].type.element.fields;
            fields[0].layout.index = 1; fields[1].layout.index = 0;
        }],
        ['partial', e => delete e.formatSegments.signature],
    ];
    const original = WebAssembly.Instance, fetchOriginal = window.fetch;
    let instances = 0, requests = [];
    WebAssembly.Instance = new Proxy(original, {construct(target, args) {
        instances++; return Reflect.construct(target, args);
    }});
    window.fetch = (url, ...args) => { requests.push(String(url)); return fetchOriginal(url, ...args); };
    const results = [];
    try {
        for (const [name, change] of changes) {
            const expected = structuredClone(options.expectedExports); change(expected);
            instances = 0; requests = [];
            let error;
            try { const p = await createProgram({...options, expectedExports: expected}); p.dispose(); }
            catch (e) { error = e; }
            if (!error || error.phase !== 'program-validation' || instances !== 0) throw Error(name);
            if (['role', 'declaration', 'alias', 'id'].includes(name) &&
                !requests.every(url => url.endsWith('/bundle.json'))) throw Error('payload before identity ' + name);
            if (name === 'partial' && requests.length) throw Error('I/O before shape');
            if (['arity', 'argument order', 'result', 'effect', 'constructors', 'layout'].includes(name) &&
                !requests.some(url => url.endsWith('.irpkg'))) throw Error('no actual ABI comparison ' + name);
            results.push(name);
            const fresh = await createProgram(options);
            try {
                const value = formatCompactSegments(fresh, [7, '9007199254740993', 'v'], 0, 0);
                if (fresh.status !== 'active' || value[0].tags[0] !== '9007199254740993') throw Error('recovery');
            } finally { fresh.dispose(); }
        }
        const controller = new AbortController(); controller.abort('preabort');
        instances = 0; requests = [];
        let aborted;
        try { await createProgram({...options, signal: controller.signal}); }
        catch (e) { aborted = e.name === 'AbortError' && e.cause === 'preabort'; }
        if (!aborted || instances || requests.length) throw Error('preabort');
        return results.length;
    } finally { WebAssembly.Instance = original; window.fetch = fetchOriginal; }
}""")
    assert result == 11


@pytest.mark.parametrize("phase", ["manifest", "payload", "instance"])
def test_pending_creation_cancels_and_independent_program_recovers(page, server, phase):
    open_demo(page, server)
    page.evaluate("window.creationTestPhase = " + json.dumps(phase))
    result = page.evaluate(SETUP + """
    const controller = new AbortController(), reason = {cancelled: true};
    const original = WebAssembly.Instance, fetchOriginal = window.fetch;
    const clearOriginal = Set.prototype.clear;
    let created = 0, cleanups = 0, handedOff = false, trackedSignal;
    // Observe the real runtime's terminal callback-root cleanup, without replacing it.
    Set.prototype.clear = function () {
        if (new Error().stack.includes('releaseLiveCallbacks')) cleanups++;
        return clearOriginal.call(this);
    };
    WebAssembly.Instance = new Proxy(original, {construct(target, args) {
        created++;
        const instance = Reflect.construct(target, args);
        if (window.creationTestPhase === 'instance') controller.abort(reason);
        return instance;
    }});
    window.fetch = (url, init) => {
        const selected = window.creationTestPhase === 'manifest' ? String(url).endsWith('/bundle.json') :
            window.creationTestPhase === 'payload' && String(url).endsWith('.wasm');
        if (!selected) return fetchOriginal(url, init);
        trackedSignal = init.signal;
        return new Promise((_, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason), {once: true});
            controller.abort(reason);
        });
    };
    try {
        let error;
        try { const p = await createProgram({...options, signal: controller.signal}); handedOff = true; p.dispose(); }
        catch (e) { error = e; }
        if (!error || error.name !== 'AbortError' || error.cause !== reason || handedOff) throw Error('handoff');
        if (window.creationTestPhase === 'instance' ? created !== 1 || cleanups !== 1 :
                created !== 0 || !trackedSignal.aborted) throw Error('ownership');
        const cancelled = {created, cleanups, handedOff};
        WebAssembly.Instance = original; window.fetch = fetchOriginal;
        const freshController = new AbortController();
        const fresh = await createProgram({...options, signal: freshController.signal});
        freshController.abort('post-resolution');
        const value = formatCompactSegments(fresh, 'recovered', 0, 0);
        if (fresh.status !== 'active') throw Error('post-resolution abort');
        fresh.dispose(); fresh.dispose();
        if (fresh.status !== 'disposed') throw Error('terminal disposal');
        return {...cancelled, value};
    } finally {
        WebAssembly.Instance = original; window.fetch = fetchOriginal; Set.prototype.clear = clearOriginal;
    }
}""")
    assert result == {
        "created": int(phase == "instance"), "cleanups": int(phase == "instance"),
        "handedOff": False, "value": [{"text": "recovered", "tags": []}],
    }


@pytest.mark.parametrize("secondary", ["undefined", "null", "raw"])
def test_cancelled_real_instance_preserves_secondary_cleanup(page, server, secondary):
    open_demo(page, server)
    page.evaluate("window.creationTestSecondary = " + json.dumps(secondary))
    result = page.evaluate(SETUP + """
    const controller = new AbortController(), reason = {abort: true};
    const secondary = window.creationTestSecondary === 'undefined' ? undefined :
        window.creationTestSecondary === 'null' ? null : {cleanup: true};
    const original = WebAssembly.Instance, clearOriginal = Set.prototype.clear;
    let created = 0, cleanups = 0;
    // Test-only failure injection at the real terminal callback-root cleanup.
    Set.prototype.clear = function () {
        const result = clearOriginal.call(this);
        if (new Error().stack.includes('releaseLiveCallbacks')) { cleanups++; throw secondary; }
        return result;
    };
    WebAssembly.Instance = new Proxy(original, {construct(target, args) {
        const instance = Reflect.construct(target, args); created++; controller.abort(reason); return instance;
    }});
    try {
        let error;
        try { const p = await createProgram({...options, signal: controller.signal}); p.dispose(); }
        catch (e) { error = e; }
        return {
            created, cleanups, abort: error?.name === 'AbortError', cause: error?.cause === reason,
            own: Object.hasOwn(error, 'cleanupError'), same: error.cleanupError === secondary,
            readonly: Object.getOwnPropertyDescriptor(error, 'cleanupError')?.writable === false,
        };
    } finally { WebAssembly.Instance = original; Set.prototype.clear = clearOriginal; }
}""")
    assert result == {"created": 1, "cleanups": 1, "abort": True, "cause": True,
                      "own": True, "same": True, "readonly": True}
    # Fresh real independent instance after every injected failure.
    assert page.evaluate(SETUP + """
        const p = await createProgram(options);
        try { return formatCompactSegments(p, 'v', 0, 0); } finally { p.dispose(); }
    }""") == [{"text": "v", "tags": []}]


def test_published_bootstrap_pagehide_during_actual_creation_has_no_facade(page, server):
    page.add_init_script("""(() => {
        if (sessionStorage.getItem('strict-creation-aborted')) return;
        const original = WebAssembly.Instance, clearOriginal = Set.prototype.clear;
        let once = false;
        window.bootstrapCleanups = 0;
        Set.prototype.clear = function () {
            if (new Error().stack.includes('releaseLiveCallbacks')) window.bootstrapCleanups++;
            return clearOriginal.call(this);
        };
        WebAssembly.Instance = new Proxy(original, {construct(target, args) {
            const instance = Reflect.construct(target, args);
            if (!once) {
                once = true;
                sessionStorage.setItem('strict-creation-aborted', 'yes');
                window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: false}));
            }
            return instance;
        }});
    })();""")
    page.goto(f"{server}/nested/deck/index.html")
    page.wait_for_function("window.versoVirReady !== undefined")
    assert page.evaluate("""async () => {
        try { await window.versoVirReady; return {handedOff: true}; }
        catch (error) { return {
            name: error.name, cleanups: window.bootstrapCleanups,
            facade: window.versoVir !== undefined || window.versoVirFormatSegments !== undefined,
        }; }
    }""") == {"name": "AbortError", "cleanups": 1, "facade": False}
    assert page.locator('[role="alert"]').count() == 0
    page.reload()
    page.wait_for_function("window.versoVir !== undefined", timeout=30000)
    assert page.evaluate("window.versoVirFormatSegments('fresh page', 0, 0)") == [{"text": "fresh page", "tags": []}]
