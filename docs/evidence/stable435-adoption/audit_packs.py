from pathlib import Path
import json,hashlib,shutil
root=Path('/home/egallego/lean/verso-slides');pr=root/'.worktrees/vir-prettym-435rc4-release';base=Path(__file__).resolve().parent
expected={
'runtime':('c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60',pr/'.lake/packages/lean_vir/.lake/build/vir/resources/runtime/c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60.virres'),
'program':('8b168629f82e2c893a59d1eab6f126ccf7e327ae23f651d9ba001a3cf913cca3',pr/'.lake/build/vir/resources/programs/VersoSlides/VirPrettyM.virres')}
identity={}
for kind,(cid,p) in expected.items():
 b=p.read_bytes();assert b[:8]==b'VIRRES\x00\x01';n=int.from_bytes(b[8:12],'little');raw=b[12:12+n];desc=json.loads(raw)
 # Independent evidence inspection of the published v2 identity algorithm,
 # Vir/Resources/Validate.lean:59; this is not an application loader.
 assert hashlib.sha256(b'vir-resource-bundle-v2\n'+raw).hexdigest()==cid
 pos=12+n;files=[]
 for f in desc['files']:
  payload=b[pos:pos+f['byteLength']];pos+=len(payload)
  assert hashlib.sha256(payload).hexdigest()==f['sha256']
  files.append({'path':f['path'],'size':len(payload),'sha256':f['sha256']})
 assert pos==len(b)
 assert desc['compatibility']=={'leanRevision':'eb6cafb7290e8bd5f2937522d8d804f58f02bafc','virVersion':6}
 digest=hashlib.sha256(b).hexdigest()
 if kind=='runtime':assert digest=='caa48b273d3a01d7582444b9611c5070b2bcdd39330569ffdf6778f930a33687'
 out=base/'packs'/f'{cid}.virres';out.parent.mkdir(exist_ok=True);shutil.copy2(p,out)
 identity[kind]={'path':str(p),'contentId':cid,'bytes':len(b),'sha256':digest,'descriptor':desc,'payloads':files}
 print(kind,cid,len(b),digest)
(base/'pack-identity.json').write_text(json.dumps(identity,indent=2)+'\n')
