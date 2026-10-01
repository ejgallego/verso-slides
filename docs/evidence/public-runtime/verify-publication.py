"""Static publication evidence; this does not execute the browser runtime."""
from pathlib import Path
import hashlib, json, shutil, subprocess
base = Path(__file__).resolve().parent
rid = '832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d'
pid = '97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58'
# Run a copied native renderer in an empty unrelated directory. No Lake invocation.
relocated = base / 'relocated/a/b'
relocated.mkdir(parents=True, exist_ok=True)
# Existing deck image inputs are external to VIR and must accompany this demo.
shutil.copytree(base / 'root/demo-images', relocated / 'demo-images', dirs_exist_ok=True)
exe = relocated / 'render'
shutil.copy2(base / 'root/.lake/build/bin/demo-slides', exe)
proc = subprocess.run([str(exe)], cwd=relocated, stdout=subprocess.PIPE,
                      stderr=subprocess.STDOUT, text=True)
(base / 'relocated-render.log').write_text(proc.stdout)
assert proc.returncode == 0, proc.stdout
assert not (relocated / '.lake').exists()
records = []
for kind, site in [('root', base / 'root/_slides'),
                   ('downstream', base / 'downstream/examples/default-deck/_slides'),
                   ('relocated', relocated / '_slides')]:
    bootstrap = (site / 'vir-bootstrap.js').read_text()
    assert 'lib/vir/' + rid + '/bundle.json' in bootstrap
    assert 'lib/vir/' + pid + '/bundle.json' in bootstrap
    assert '/home/' not in bootstrap and 'file://' not in bootstrap
    for cid in [rid, pid]:
        directory = site / 'lib/vir' / cid
        raw = (directory / 'bundle.json').read_bytes()
        bundle = json.loads(raw)
        assert bundle['contentId'] == cid
        descriptor = bundle['descriptor']
        assert descriptor['compatibility'] == {
            'leanRevision': '293d5d0c0c3f3dded4688b3ccd6a33939ac5102b', 'virVersion': 1}
        if cid == pid:
            assert descriptor['exports'] == [{'declaration': 'VersoSlides.VirPrettyM.formatSegments',
                'interfaceId': 'verso-slides-format-segments-hostabi-v2', 'role': 'formatSegments'}]
        checked = []
        for entry in descriptor['files']:
            data = (directory / entry['path']).read_bytes()
            sha = hashlib.sha256(data).hexdigest()
            assert len(data) == entry['byteLength'] and sha == entry['sha256']
            checked.append({'path': entry['path'], 'bytes': len(data), 'sha256': sha})
        records.append({'site': kind, 'contentId': cid,
                        'manifestSha256': hashlib.sha256(raw).hexdigest(), 'payloads': checked})
assert len(records) == 6 and sum(len(x['payloads']) for x in records) == 45
(base / 'publication-identities.json').write_text(json.dumps(records, indent=2) + '\n')
print('PASS: copied native renderer; six manifests, 45 payloads, three relative bootstrap pairs')
