const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../web-lib/vir-prettym/bootstrap.js'), 'utf8');
const reference = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-lib/vir-prettym/format-segments-v2.contract.json'), 'utf8'));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};

function fixture() {
  const loading = deferred(), creation = deferred(), started = deferred();
  const alerts = [], diagnostics = [];
  let hide, options, disposed = 0;
  const program = {dispose() { disposed++; }};
  const window = {
    __versoVirResourceUrls: {runtimeModule: 'lib/runtime.js', runtimeManifest: 'lib/runtime.json', programManifest: 'lib/program.json'},
    __versoVirExpectedExports: reference,
    addEventListener(name, callback) { assert.equal(name, 'pagehide'); hide = callback; },
  };
  const context = vm.createContext({window, URL, AbortController,
    document: {baseURI: 'http://slides.test/nested/deck/',
      createElement() { return {setAttribute() {}}; }, body: {appendChild(el) { alerts.push(el); }}},
    console: {error(...args) { diagnostics.push(args); }},
    __loadRuntime: () => loading.promise,
  });
  // Substitute only module acquisition to control completion ordering; execute
  // the actual bootstrap and its createProgram inputs/lifetime unchanged.
  const marker = 'import(runtimeModuleUrl.href)';
  assert.equal(source.split(marker).length, 2);
  vm.runInContext(source.replace(marker, '__loadRuntime(runtimeModuleUrl.href)'), context);
  const loader = {createProgram(value) { options = value; started.resolve(); return creation.promise; }};
  return {window, loading, creation, started, program, alerts, diagnostics, loader,
    hide: persisted => hide({persisted}), options: () => options, disposals: () => disposed};
}

test('pending creation receives independent expectedExports/signal; pagehide aborts without a facade', async () => {
  const f = fixture(); f.loading.resolve(f.loader); await f.started.promise;
  assert.equal(f.options().expectedExports, reference);
  assert.equal(f.options().programManifestUrl.href, 'http://slides.test/nested/deck/lib/program.json');
  f.hide(true); assert.equal(f.options().signal.aborted, false);
  f.hide(false); assert.equal(f.options().signal.aborted, true);
  const error = new Error('cancelled'); error.name = 'AbortError';
  f.creation.reject(error);
  await assert.rejects(f.window.versoVirReady, e => e === error);
  assert.equal(f.window.versoVir, undefined);
  assert.equal(f.window.versoVirFormatSegments, undefined);
  assert.equal(f.alerts.length, 0);
});

for (const when of ['before import', 'during creation']) {
  test(`late success after ${when} is disposed once and never handed off`, async () => {
    const f = fixture();
    if (when === 'before import') f.hide(false);
    f.loading.resolve(f.loader); await f.started.promise;
    if (when === 'during creation') f.hide(false);
    assert.equal(f.options().signal.aborted, true);
    f.creation.resolve(f.program);
    await assert.rejects(f.window.versoVirReady, /Page closed/);
    assert.equal(f.disposals(), 1);
    assert.equal(f.window.versoVir, undefined);
    assert.equal(f.window.versoVirFormatSegments, undefined);
  });
}

for (const cleanup of [undefined, null, {raw: 'cleanup'}]) {
  test(`obsolete cancellation reports own raw cleanup evidence (${typeof cleanup})`, async () => {
    const f = fixture(); f.loading.resolve(f.loader); await f.started.promise;
    f.hide(false);
    const error = new Error('cancelled'); error.name = 'AbortError';
    Object.defineProperty(error, 'cleanupError', {value: cleanup});
    f.creation.reject(error);
    await assert.rejects(f.window.versoVirReady, e => e === error);
    assert.equal(f.diagnostics.length, 1);
    assert.equal(f.diagnostics[0][1], cleanup);
    assert.equal(f.alerts.length, 0);
  });
}

test('resolved lifetime preserves bfcache and disposes on terminal pagehide', async () => {
  const f = fixture(); f.loading.resolve(f.loader); await f.started.promise;
  f.creation.resolve(f.program); await f.window.versoVirReady;
  assert.equal(f.window.versoVir, f.program);
  f.hide(true); assert.equal(f.disposals(), 0);
  f.hide(false); assert.equal(f.disposals(), 1);
});
