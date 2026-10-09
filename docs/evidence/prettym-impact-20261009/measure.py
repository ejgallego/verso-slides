from pathlib import Path
import subprocess, json, time, statistics, hashlib, gzip, platform, os

root = Path(__file__).resolve().parent
samples = []
retained = root / 'retained-builds'
retained.mkdir(exist_ok=True)

def record(phase, label, number):
    work = root / label
    log = root / f'{phase}-{number:02d}-{label}.log'
    metrics = log.with_suffix('.time.json')
    start = time.perf_counter()
    with log.open('wb') as out:
        result = subprocess.run([
            '/usr/bin/time', '-f',
            '{"wallSeconds":%e,"userSeconds":%U,"systemSeconds":%S,"peakRssKiB":%M,"exit":%x}',
            '-o', str(metrics), 'lake', '--no-cache', 'build'
        ], cwd=work, stdout=out, stderr=subprocess.STDOUT)
    data = json.loads(metrics.read_text())
    data.update(phase=phase, label=label, number=number,
                monotonicWallSeconds=time.perf_counter()-start,
                binarySha256=hashlib.sha256((work/'.lake/build/bin/demo-slides').read_bytes()).hexdigest()
                if result.returncode == 0 else None)
    samples.append(data)
    (root/'samples.json').write_text(json.dumps(samples, indent=2)+'\n')
    print(f'{phase} {number} {label}: {data["monotonicWallSeconds"]:.3f}s exit={result.returncode}', flush=True)
    if result.returncode:
        raise RuntimeError(f'{label} failed: {log}')

for label in ['old', 'new']:
    record('setup', label, 0)

for number, label in enumerate(['old', 'new', 'new', 'old'], 1):
    build = root/label/'.lake/build'
    build.rename(retained/f'{number:02d}-{label}')
    record('project-clean', label, number)

for number, label in enumerate(['old', 'new', 'new', 'old']*4, 1):
    record('warm', label, number)

sizes = {}
for label in ['old', 'new']:
    work = root/label
    with (root/f'{label}-render.log').open('wb') as out:
        result = subprocess.run(['lake', '--no-cache', 'exe', 'demo-slides'],
                                cwd=work, stdout=out, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(f'{label} render failed')
    output = work/'_slides'
    assert (output/'index.html').is_file()
    files = []
    for p in sorted(output.rglob('*')):
        if not p.is_file():
            continue
        b = p.read_bytes()
        files.append({'path':str(p.relative_to(output)), 'bytes':len(b),
                      'gzipBytes':len(gzip.compress(b, compresslevel=9, mtime=0)),
                      'sha256':hashlib.sha256(b).hexdigest()})
    (root/f'{label}-files.json').write_text(json.dumps(files,indent=2)+'\n')
    pretty = next(f for f in files if f['path']=='lib/pretty.js')
    resources = [f for f in files if f['path'].startswith('lib/vir/')]
    sizes[label] = {'siteBytes':sum(f['bytes'] for f in files),
                    'siteGzipBytes':sum(f['gzipBytes'] for f in files),
                    'fileCount':len(files), 'prettyBytes':pretty['bytes'],
                    'prettyGzipBytes':pretty['gzipBytes'],
                    'virBytes':sum(f['bytes'] for f in resources),
                    'virGzipBytes':sum(f['gzipBytes'] for f in resources),
                    'nativeBinaryBytes':(work/'.lake/build/bin/demo-slides').stat().st_size}
    if label=='new':
        pack = work/'.lake/build/lib/lean/vir-assets/VersoSlides/VirPrettyM.virres'
        assert hashlib.sha256(pack.read_bytes()).hexdigest() == 'ba9165b0d91edb0fb3e66276daf0cde8cefc255d67f4508bcd19e72fb0e5a46a'
        for manifest in output.glob('lib/vir/*/bundle.json'):
            m=json.loads(manifest.read_text())
            for f in m['descriptor']['files']:
                b=(manifest.parent/f['path']).read_bytes()
                assert len(b)==f['byteLength'] and hashlib.sha256(b).hexdigest()==f['sha256']

summary = {'host':platform.platform(), 'cpuCount':os.cpu_count(), 'sizes':sizes,
           'timing':{}, 'samples':samples}
for phase in ['project-clean','warm']:
    summary['timing'][phase]={}
    for label in ['old','new']:
        values=[s['monotonicWallSeconds'] for s in samples if s['phase']==phase and s['label']==label]
        summary['timing'][phase][label]={'medianSeconds':statistics.median(values),
                'minSeconds':min(values), 'maxSeconds':max(values), 'count':len(values)}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'sizes':sizes,'timing':summary['timing']},indent=2),flush=True)
