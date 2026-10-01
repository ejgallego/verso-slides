"""One-shot document ownership against the emitted bootstrap and published runtime.

The Wasm fetch is held/failed. Acquisition, validation, instantiation,
formatting and disposal still run through the published VIR loader.
"""
import json

import pytest
from playwright.sync_api import expect

from test_vir_prettym_site import open_demo, open_proof_panel


def observe(page, mode):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script("""(() => {
        const mode = MODE;
        const control = window.lifecycleProbe = {unhandled: [], wasmRequests: 0, instances: 0, aborted: 0, diagnostics: []};
        window.addEventListener('unhandledrejection', e => control.unhandled.push(String(e.reason)));
        const instanceOriginal = WebAssembly.Instance;
        WebAssembly.Instance = new Proxy(instanceOriginal, {construct(target, args) {
            control.instances++; return Reflect.construct(target, args);
        }});
        const report = console.error;
        console.error = (...args) => { control.diagnostics.push(args); report.apply(console, args); };
        const original = window.fetch;
        window.fetch = (url, init) => {
            if (!String(url).endsWith('/runtime.wasm') || ++control.wasmRequests !== 1)
                return original(url, init);
            if (mode === 'fail') return Promise.reject(new Error('test acquisition failure'));
            return new Promise((resolve, reject) => {
                let settled = false;
                const abort = () => { settled = true; control.aborted++; reject(init.signal.reason); };
                init.signal.addEventListener('abort', abort, {once: true});
                control.release = () => {
                    // A settled gate must not start an orphaned, already-aborted
                    // real fetch after the acquisition owner has released it.
                    if (settled) return;
                    settled = true;
                    init.signal.removeEventListener('abort', abort);
                    resolve(original(url, init));
                };
            });
        };
    })()""".replace("MODE", repr(mode)))
    return errors


def open_pending(page, server, mode="hold"):
    errors = observe(page, mode)
    page.goto(f"{server}/nested/deck/index.html")
    page.wait_for_function("window.Reveal?.isReady() === true && window.lifecycleProbe.wasmRequests === 1")
    return errors


def select_pending_goal(page):
    index = page.evaluate("""() => {
        const sections = [...document.querySelectorAll('.slides > section')];
        const index = sections.findIndex(s => s.querySelector('.code-with-panel .tactic'));
        Reveal.slide(index, 0, 0); return index;
    }""")
    assert index >= 0
    block = page.locator(".slides > section.present .code-with-panel", has=page.locator(".tactic")).first
    block.locator(".tactic:visible").first.click()
    panel = block.locator(".info-panel")
    expect(panel.locator(".vir-panel-status")).to_be_visible()
    assert block.evaluate("el => !!el._activeSource")
    return block, panel


def assert_current_goal(block, panel):
    expect(panel.locator(".reflowed").first).not_to_be_empty()
    assert panel.evaluate("el => el._richFormatSource === el.closest('.code-with-panel')._activeSource.querySelector(':scope > .tactic-state')")
    assert block.evaluate("el => el._activeSource.classList.contains('panel-focus')")
    expect(panel.locator(".vir-panel-status")).to_have_count(0)


def assert_no_unhandled(page, errors):
    # Drain a task after initialization settles, including its report observer.
    page.evaluate("() => new Promise(resolve => setTimeout(resolve, 0))")
    assert page.evaluate("window.lifecycleProbe?.unhandled || []") == []
    assert errors == []


@pytest.mark.parametrize("action", ["terminal", "persisted"])
def test_loading_notification_publishes_current_promise_before_reentrant_action(page, server, action):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script("""(() => {
        const action = ACTION;
        const probe = window.lifecycleProbe = {unhandled: [], notified: false};
        window.addEventListener('unhandledrejection', e => probe.unhandled.push(String(e.reason)));
        window.addEventListener('verso-vir-statechange', () => {
            if (window.versoVirState !== 'loading' || probe.notified) return;
            probe.notified = true;
            probe.initial = window.versoVirReady;
            window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: action === 'persisted'}));
        });
    })()""".replace("ACTION", repr(action)))
    page.goto(f"{server}/nested/deck/index.html")
    state = "disposed" if action == "terminal" else "ready"
    page.wait_for_function(f"window.Reveal?.isReady() === true && window.versoVirState === '{state}'", timeout=30000)
    assert page.evaluate("typeof window.lifecycleProbe.initial?.then === 'function'")
    assert page.evaluate("window.versoVirReady === window.lifecycleProbe.initial")
    result = page.evaluate("""async () => {
        const outcome = async promise => {
            try { await promise; return 'ready'; } catch (e) { return e.name; }
        };
        return [await outcome(window.versoVirReady), await outcome(window.lifecycleProbe.initial)];
    }""")
    assert result == (["AbortError", "AbortError"] if action == "terminal" else ["ready", "ready"])
    assert page.evaluate("window.versoVir?.status || 'absent'") == ("absent" if action == "terminal" else "active")
    expect(page.locator(".vir-formatter-status")).to_have_count(0)
    assert_no_unhandled(page, errors)


def test_slow_creation_keeps_navigation_and_latest_selection_usable(page, server):
    errors = open_pending(page, server)
    expect(page.locator(".vir-formatter-status")).to_have_text("Loading Lean formatting…")
    block, panel = select_pending_goal(page)
    original = block.evaluate("el => el._activeSource.getAttribute('data-tactic-range')")
    block.locator(".tactic:visible").nth(1).click()
    assert block.evaluate("el => el._activeSource.getAttribute('data-tactic-range')") != original
    assert page.evaluate("window.versoVir === undefined && window.versoVirFormatSegments === undefined")
    page.evaluate("window.lifecycleProbe.release()")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    assert_current_goal(block, panel)
    expect(page.locator(".vir-formatter-status")).to_have_count(0)
    assert_no_unhandled(page, errors)


def test_readiness_does_not_restore_a_cleared_selection(page, server):
    errors = open_pending(page, server)
    block, panel = select_pending_goal(page)
    page.evaluate("const h = Reveal.getIndices().h; Reveal.slide(h + 1, 0, -1); Reveal.slide(h, 0, -1)")
    assert block.evaluate("el => el._activeSource === null")
    expect(panel).to_be_empty()
    page.evaluate("window.lifecycleProbe.release()")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    expect(panel).to_be_empty()
    assert_no_unhandled(page, errors)


def test_creation_failure_is_final_and_static_navigation_remains_usable(page, server):
    errors = open_pending(page, server, "fail")
    page.wait_for_function("window.versoVirState === 'failed'")
    block, panel = select_pending_goal(page)
    expect(page.get_by_role("alert")).to_have_text("Lean formatting is unavailable.")
    expect(panel.locator(".vir-panel-status")).to_have_text("Lean formatting is unavailable.")
    expect(page.locator(".vir-formatter-status button")).to_have_count(0)
    assert page.evaluate("window.versoVirRetry === undefined && window.versoVir === undefined")
    assert page.evaluate("window.lifecycleProbe.diagnostics.some(args => args[0] === 'VIR initialization failed' && args[1].cause)")
    page.evaluate("Reveal.slide(Reveal.getIndices().h + 1, 0, -1)")
    page.set_viewport_size({"width": 900, "height": 600})
    assert_no_unhandled(page, errors)
    assert page.evaluate("window.lifecycleProbe.wasmRequests") == 1
    assert page.evaluate("window.lifecycleProbe.instances") == 0
    assert page.evaluate("window.versoVirState") == "failed"


def test_document_termination_cancels_pending_creation_without_late_install(page, server):
    errors = open_pending(page, server)
    page.evaluate("window.initialReady = window.versoVirReady; window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert page.evaluate("async () => { try { await window.initialReady; return false; } catch (e) { return e.name === 'AbortError'; } }")
    page.evaluate("window.lifecycleProbe.release()")
    assert page.evaluate("window.lifecycleProbe.aborted") == 1
    assert page.evaluate("window.lifecycleProbe.wasmRequests") == 1
    assert page.evaluate("window.lifecycleProbe.instances") == 0
    assert page.evaluate("window.versoVirReady === window.initialReady && window.versoVir === undefined && window.versoVirFormatSegments === undefined")
    assert page.evaluate("window.versoVirState") == "disposed"
    expect(page.locator(".vir-formatter-status")).to_have_count(0)
    assert_no_unhandled(page, errors)


def test_malformed_compact_input_keeps_the_single_real_program(page, server):
    errors = open_pending(page, server)
    page.evaluate("window.lifecycleProbe.release()")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    result = page.evaluate("""() => {
        const program = window.versoVir, ready = window.versoVirReady;
        let rejection;
        try { window.versoVirFormatSegments([3, 1.5, 'x'], 80, 0); }
        catch (error) { rejection = error.code; }
        return {rejection, valid: window.versoVirFormatSegments('same program', 4097, 0),
            same: window.versoVir === program && window.versoVirReady === ready,
            status: program.status, state: window.versoVirState};
    }""")
    assert result == {"rejection": "invalidInput", "valid": [{"text": "same program", "tags": []}],
                      "same": True, "status": "active", "state": "ready"}
    assert page.evaluate("window.lifecycleProbe.wasmRequests === 1 && window.lifecycleProbe.instances === 1 && window.versoVirRetry === undefined")
    assert_no_unhandled(page, errors)


def test_unexpected_dispatch_failure_closes_owned_program_without_recreation(page, server):
    errors = open_pending(page, server)
    page.evaluate("window.lifecycleProbe.release()")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    # Controlled application dispatch failure with a real loader-owned program.
    # This tests Slides policy, not production Wasm quarantine/trap semantics.
    result = page.evaluate("""() => {
        const probe = window.lifecycleProbe, owned = window.versoVir, facade = window.versoVirFormatSegments;
        const adapter = formatCompactSegments, ready = window.versoVirReady;
        const failure = new WebAssembly.RuntimeError('controlled dispatch failure');
        let calls = 0, sameError;
        formatCompactSegments = () => { calls++; throw failure; };
        try { facade('current', 80, 0); } catch (error) { sameError = error === failure; }
        finally { formatCompactSegments = adapter; }
        let unavailable = false;
        try { facade('next', 80, 0); } catch (error) { unavailable = error.message.includes('unavailable'); }
        return {sameError, calls, unavailable, status: owned.status,
            sameReady: window.versoVirReady === ready,
            noFacade: window.versoVir === undefined && window.versoVirFormatSegments === undefined,
            noRetry: window.versoVirRetry === undefined,
            diagnostic: probe.diagnostics.some(args => args[0] === 'VIR formatting failed' && args[1] === failure)};
    }""")
    assert result == {"sameError": True, "calls": 1, "unavailable": True, "status": "disposed",
                      "sameReady": True, "noFacade": True, "noRetry": True, "diagnostic": True}
    expect(page.locator(".vir-formatter-status [role=alert]")).to_have_text("Lean formatting is unavailable.")
    expect(page.locator(".vir-formatter-status button")).to_have_count(0)
    page.set_viewport_size({"width": 900, "height": 600})
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert page.evaluate("window.lifecycleProbe.wasmRequests === 1 && window.lifecycleProbe.instances === 1")
    assert_no_unhandled(page, errors)
