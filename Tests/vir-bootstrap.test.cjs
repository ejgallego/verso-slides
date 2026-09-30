const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');

const source = fs.readFileSync(process.env.VIR_BOOTSTRAP_SOURCE ||
  path.join(__dirname, '../web-lib/vir-prettym/bootstrap.js'), 'utf8');
const reference = JSON.parse(fs.readFileSync(path.join(__dirname, '../web-lib/vir-prettym/format-segments-v2.contract.json'), 'utf8'));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};

function fixture(config = {}) {
  const loading = deferred(), creation = deferred(), started = deferred();
  const alerts = [], diagnostics = [];
  let hide, options, disposed = 0;
  const program = {dispose() {
    disposed++;
    if (Object.hasOwn(config, 'cleanup')) throw config.cleanup;
  }};
  const window = {
    __versoVirResourceUrls: {runtimeModule: 'lib/runtime.js', runtimeManifest: 'lib/runtime.json', programManifest: 'lib/program.json'},
    __versoVirExpectedExports: reference,
    addEventListener(name, callback) { assert.equal(name, 'pagehide'); hide = callback; },
  };
  const context = vm.createContext({window, URL, AbortController,
    document: {baseURI: 'http://slides.test/nested/deck/',
      createElement() { return {setAttribute() {}}; }, body: {appendChild(el) {
        if (config.presentationThrows) throw new Error('alert sink failed');
        alerts.push(el);
      }}},
    console: {error(...args) {
      diagnostics.push(args);
      if (config.reportingThrows) throw new Error('diagnostic sink failed');
    }},
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

// Isolate unhandled-rejection observation from node:test's own process handler.
// The probe still runs the actual bootstrap, with only module acquisition controlled.
async function lateDisposalProbe(kind, reportingThrows) {
  const cleanup = kind === 'Error' ? new Error('late disposal failed') : kind === 'null' ? null : undefined;
  const unhandled = [];
  process.on('unhandledRejection', error => unhandled.push(error));
  const f = fixture({cleanup, reportingThrows});
  f.loading.resolve(f.loader); await f.started.promise;
  f.hide(false); f.creation.resolve(f.program);
  let rejected = false, failure;
  try { await f.window.versoVirReady; }
  catch (error) { rejected = true; failure = error; }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const ownCleanup = failure !== null && (typeof failure === 'object' || typeof failure === 'function') &&
    Object.hasOwn(failure, 'cleanupError');
  return {
    rejected, disposals: f.disposals(),
    reported: f.diagnostics.some(args => args[0] === 'VIR creation cleanup failed' && args[1] === cleanup),
    retained: ownCleanup && failure.cleanupError === cleanup,
    staleFacade: f.window.versoVir !== undefined || f.window.versoVirFormatSegments !== undefined,
    alerts: f.alerts.length,
    unhandled: unhandled.map(error => error?.name ?? typeof error),
  };
}

async function rejectionReportingProbe(kind) {
  const inspection = new Error('diagnostic inspection failed');
  const raw = kind === 'null' ? null : kind === 'undefined' ? undefined : kind === 'primitive' ? 7 :
    new Proxy({}, {getOwnPropertyDescriptor() { throw inspection; }, get() { throw inspection; }});
  const unhandled = [];
  process.on('unhandledRejection', error => unhandled.push(error));
  const f = fixture({reportingThrows: kind === 'sink', presentationThrows: kind === 'sink'});
  f.loading.resolve(f.loader); await f.started.promise;
  let rejected = false, failure;
  f.creation.reject(raw);
  try { await f.window.versoVirReady; }
  catch (error) { rejected = true; failure = error; }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  return {
    retained: rejected && failure === raw,
    reported: f.diagnostics.some(args => args[0] === 'VIR initialization failed' && args[1] === raw),
    staleFacade: f.window.versoVir !== undefined || f.window.versoVirFormatSegments !== undefined,
    summary: kind === 'sink' || f.alerts[0]?.textContent === 'Lean formatting could not be initialized.',
    unhandled: unhandled.map(error => error?.name ?? typeof error),
  };
}

if (process.argv[2]?.endsWith('-probe')) {
  const probe = process.argv[2] === '--late-dispose-probe' ?
    lateDisposalProbe(process.argv[3], process.argv[4] === 'throw-reporting') : rejectionReportingProbe(process.argv[3]);
  probe.then(
    result => process.stdout.write(JSON.stringify(result) + '\n'),
    error => { console.error(error); process.exitCode = 1; },
  );
} else {

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
    assert.equal(f.diagnostics.find(args => args[0] === 'VIR initialization failed')[1], error);
    assert.equal(f.diagnostics.find(args => args[0] === 'VIR creation cleanup failed')[1], cleanup);
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

for (const kind of ['Error', 'null', 'undefined']) {
  test(`late disposal throwing ${kind} retains/reports evidence without an unhandled rejection`, () => {
    const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, [__filename, '--late-dispose-probe', kind], {encoding: 'utf8', env});
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {
      rejected: true, disposals: 1, reported: true, retained: true,
      staleFacade: false, alerts: 0, unhandled: [],
    });
  });
}


test('late disposal diagnostics tolerate a throwing reporting sink', () => {
  const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
  const child = spawnSync(process.execPath, [__filename, '--late-dispose-probe', 'Error', 'throw-reporting'], {encoding: 'utf8', env});
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), {
    rejected: true, disposals: 1, reported: true, retained: true,
    staleFacade: false, alerts: 0, unhandled: [],
  });
});

for (const kind of ['null', 'undefined', 'primitive', 'proxy', 'sink']) {
  test(`arbitrary creation rejection (${kind}) reports without coercion or a secondary unhandled rejection`, () => {
    const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, [__filename, '--reporting-probe', kind], {encoding: 'utf8', env});
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {
      retained: true, reported: true, staleFacade: false, summary: true, unhandled: [],
    });
  });
}

test('primary creation wrapper/context and untouched raw cause are logged', async () => {
  const f = fixture(); f.loading.resolve(f.loader); await f.started.promise;
  const cause = new Proxy({}, {get() { throw new Error('do not coerce cause'); }});
  const error = new Error('program creation failed');
  error.phase = 'program-validation'; error.context = {bundle: 'program'};
  Object.defineProperty(error, 'cause', {value: cause});
  f.creation.reject(error);
  await assert.rejects(f.window.versoVirReady, e => e === error);
  assert.equal(f.diagnostics.find(args => args[0] === 'VIR initialization failed')[1], error);
  assert.equal(f.diagnostics.find(args => args[0] === 'VIR initialization cause')[1], cause);
  assert.equal(f.diagnostics.some(args => args[0] === 'VIR creation cleanup failed'), false);
  assert.equal(f.alerts[0].textContent, 'Lean formatting could not be initialized.');
});

}
