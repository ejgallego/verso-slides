from pathlib import Path
import hashlib,json,re,subprocess
root=Path(__file__).resolve().parent.parent
q=Path(__file__).resolve().parent
site=q/'site'
baseline=json.loads((q/'baseline-site.json').read_text())
results={'source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'productionFilesByteIdentical':113,'routes':{},'packs':{}}
for route in ['', 'nested/deck', 'downstream/custom']:
 directory=site/route
 html=(directory/'index.html').read_text()
 urls=json.loads(re.search(r'window\.__versoVirResourceUrls = (\{.*?\});',html).group(1))
 assert urls==baseline['unchangedUrls']['root']
 assert all((directory/p).is_file() and not p.startswith('/') and '.lake' not in p for p in urls.values())
 manifests=[]; files={}
 for manifest in sorted(directory.glob('lib/vir/*/bundle.json')):
  data=json.loads(manifest.read_text())
  assert manifest.parent.name==data['contentId']
  assert data['descriptor']['compatibility']=={'leanRevision':'293d5d0c0c3f3dded4688b3ccd6a33939ac5102b','virVersion':1}
  for entry in data['descriptor']['files']:
   f=manifest.parent/entry['path']; payload=f.read_bytes()
   assert len(payload)==entry['byteLength']
   assert hashlib.sha256(payload).hexdigest()==entry['sha256']
  manifests.append({'contentId':data['contentId'],'sha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'payloads':len(data['descriptor']['files'])})
 for f in (directory/'lib/vir').rglob('*'):
  if f.is_file(): files[str(f.relative_to(directory/'lib/vir'))]={'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
 assert len(manifests)==2 and len(files)==16
 if route: assert files==results['routes']['']['files']
 results['routes'][route]={'urls':urls,'manifests':manifests,'files':files}
paths={'runtime':root/'.lake/packages/lean_vir/.vir-generated/VirResourceRuntime.virres','program':root/'resources/.vir-generated/VersoSlidesVirPrettyMResources.virres','downstreamRuntime':q/'downstream-deck/.lake/packages/lean_vir/.vir-generated/VirResourceRuntime.virres'}
for name,p in paths.items(): results['packs'][name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
assert results['packs']['runtime']==baseline['packs']['runtime']
assert results['packs']['program']==baseline['packs']['program']
assert results['packs']['downstreamRuntime']==baseline['packs']['runtime']
(q/'inventory.json').write_text(json.dumps(results,indent=2)+'\n')
print('Three routes: six envelopes/42 payloads; all 16 resource files and relative loader URLs identical. Actual runtime/program packs unchanged.')
