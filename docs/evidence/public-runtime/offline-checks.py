"""Qualification only: expects cold-build.py and retry-build.py to have rendered both decks."""
from pathlib import Path
import hashlib, json, os, subprocess, time
base = Path(__file__).resolve().parent
rid = '832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d'
pack_sha = 'd06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1'
results = []
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def stats(paths):
    return [{'size': p.stat().st_size, 'inode': p.stat().st_ino,
             'mtimeNs': p.stat().st_mtime_ns, 'sha256': digest(p)} for p in paths]
def run(name, cmd, cwd, expected=0):
    env = dict(os.environ, SLIDES_QUAL_NETWORK='offline',
               SLIDES_QUAL_TRANSPORT_LOG=str(base / (name + '-transport.jsonl')),
               TMPDIR=str(base / 'tmp'))
    env['PATH'] = str(base / 'observe-bin') + os.pathsep + env['PATH']
    start = time.monotonic()
    proc = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, text=True)
    (base / (name + '.log')).write_text(proc.stdout)
    entry = {'name': name, 'command': cmd, 'cwd': str(cwd),
             'exit': proc.returncode, 'seconds': time.monotonic() - start}
    results.append(entry)
    (base / 'offline-results.json').write_text(json.dumps(results, indent=2) + '\n')
    assert (proc.returncode == 0) if expected == 0 else (proc.returncode != 0), proc.stdout
    print(name, proc.returncode, flush=True)
    return proc.stdout

def transport(name):
    p = base / (name + '-transport.jsonl')
    return [json.loads(line) for line in p.read_text().splitlines()] if p.exists() else []

identities = {}
for kind in ['root', 'downstream']:
    cwd = base / kind
    if kind == 'downstream':
        cwd = cwd / 'examples/default-deck'
    pkg = cwd / '.lake/packages/lean_vir'
    lock = json.loads((pkg / 'vir-resources/runtime.json').read_text())
    assert lock['contentId'] == rid
    cache = pkg / ('.lake/build/vir/resources/runtime/' + rid + '.virres')
    stage = pkg / '.vir-generated/VirResourceRuntime.virres'
    paths = [cache, stage]
    before = stats(paths)
    assert all(s['sha256'] == pack_sha and s['size'] == 1120731 for s in before)
    name = kind + '-warm-offline'
    exe = 'demo-slides' if kind == 'root' else 'my-talk'
    run(name, ['lake', '--no-cache', 'exe', exe], cwd)
    assert not transport(name) and stats(paths) == before
    tool = str(pkg / '.lake/build/bin/vir_resource_pack')
    compat = str(pkg / 'vir-resources/compatibility.json')
    name = kind + '-native-warm-offline'
    run(name, [tool, 'acquire', compat, rid, lock['source'], str(cache), str(stage), '--offline'], cwd)
    assert not transport(name) and stats(paths) == before
    empty = base / (kind + '-empty-offline')
    empty.mkdir()
    name = kind + '-native-cold-offline'
    out = run(name, [tool, 'acquire', compat, rid, lock['source'], str(empty / 'cache.virres'),
                     str(empty / 'stage.virres'), '--offline'], cwd, expected=1)
    assert 'RESOURCE_OFFLINE_MISS:' in out and rid in out
    assert not list(empty.iterdir()) and not transport(name)
    held = base / (kind + '-held-runtime')
    held.mkdir()
    try:
        for p, label in zip(paths, ['cache', 'stage']):
            p.rename(held / label)
        name = kind + '-ordinary-cold-offline'
        out = run(name, ['lake', '--no-cache', 'build'], cwd, expected=1)
        assert 'RESOURCE_DOWNLOAD_FAILED:' in out and 'OFFLINE_TRANSPORT_DENIED:' in out and rid in out
        calls = transport(name)
        assert len(calls) == 1 and calls[0]['tool'] == 'curl' and calls[0]['mode'] == 'offline'
        assert not cache.exists() and not stage.exists()
        results[-1]['runtimePacksAbsentAfterFailure'] = True
    finally:
        for p, label in zip(paths, ['cache', 'stage']):
            if (held / label).exists():
                (held / label).rename(p)
    assert stats(paths) == before
    name = kind + '-restored-warm-offline'
    run(name, ['lake', '--no-cache', 'exe', exe], cwd)
    assert not transport(name) and stats(paths) == before
    identities[kind] = {'runtimePack': before, 'vir': subprocess.check_output(
        ['git', '-C', str(pkg), 'rev-parse', 'HEAD'], text=True).strip()}
(base / 'offline-results.json').write_text(json.dumps(results, indent=2) + '\n')
(base / 'runtime-identities.json').write_text(json.dumps(identities, indent=2) + '\n')
