from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,shutil
root=Path('/home/egallego/lean/verso-slides');pr=root/'.worktrees/vir-prettym-435rc4-release';base=Path(__file__).resolve().parent
identity=json.loads((base/'pack-identity.json').read_text())
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.scripts=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='script' and 'data-runtime-module' in d:self.scripts.append(d)
rows=[]
for name,site in [('parent',pr/'_slides'),('fixture',pr/'_test/code'),('downstream',pr/'examples/default-deck/_slides')]:
 parser=Scripts();parser.feed((site/'index.html').read_text());assert len(parser.scripts)==1
 data=parser.scripts[0]
 for kind,key in [('runtime','data-runtime-manifest'),('program','data-program-manifest')]:
  path=data[key];assert not path.startswith('/') and '.lake' not in path
  manifest=site/path;doc=json.loads(manifest.read_text())
  assert doc['contentId']==identity[kind]['contentId']
  assert doc['descriptor']==identity[kind]['descriptor']
  assert manifest.parent.name==doc['contentId']
  for info in doc['descriptor']['files']:
   content=(manifest.parent/info['path']).read_bytes()
   assert len(content)==info['byteLength'] and hashlib.sha256(content).hexdigest()==info['sha256']
  out=base/'manifests'/name/kind;out.mkdir(parents=True,exist_ok=True);shutil.copy2(manifest,out/'bundle.json')
  rows.append({'site':name,'kind':kind,'path':str(manifest),'contentId':doc['contentId'],'payloads':len(doc['descriptor']['files'])})
print(json.dumps({'manifests':rows,'totalManifestChecks':len(rows),'totalPayloadChecks':sum(r['payloads'] for r in rows)},indent=2))
(base/'site-audit.json').write_text(json.dumps(rows,indent=2)+'\n')
