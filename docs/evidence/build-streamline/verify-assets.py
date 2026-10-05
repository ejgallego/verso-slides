from pathlib import Path
import hashlib,json
q=Path(__file__).resolve().parent
result={"production":{},"packs":{}}
for label,folder in [("root","assets-render"),("downstream","assets-downstream-render")]:
 root=q/folder/"_slides"
 files={str(p.relative_to(root)):{"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(root.rglob("*")) if p.is_file()}
 baseline=json.loads((q/f"baseline-{label}-production.json").read_text());assert files==baseline
 result["production"][label]={"files":len(files),"byteIdentical":True,"inventory":files}
 manifests=list(root.glob("lib/vir/*/bundle.json"));assert len(manifests)==2
 for p in manifests:
  m=json.loads(p.read_text());assert p.parent.name==m["contentId"]
  for e in m["descriptor"]["files"]:
   b=(p.parent/e["path"]).read_bytes();assert len(b)==e["byteLength"] and hashlib.sha256(b).hexdigest()==e["sha256"]
 expected={"runtime":"d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1","program":"cde0b85f98fc98e9281efbe5b834317f3df63833be851b424b934e2ebc84dace"}
 for p in manifests:
  m=json.loads(p.read_text());assert m["contentId"] in {"832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d","6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995"}
paths={"programStage":q.parent/".vir-generated/VersoSlidesVendored.virres","programCache":q.parent/".lake/build/vir/resources/programs/VersoSlidesVendored.virres","runtimeStage":q.parent/".lake/packages/lean_vir/.vir-generated/VirResourceRuntime.virres"}
for name,p in paths.items():
 b=p.read_bytes();kind="program" if name.startswith("program") else "runtime";digest=hashlib.sha256(b).hexdigest();assert digest==expected[kind]
 result["packs"][name]={"bytes":len(b),"sha256":digest}
(q/"assets-inventory.json").write_text(json.dumps(result,indent=2)+"\n")
print("Root113 and downstream112 production files byte-identical to accepted simplification output. Four envelopes /28 payload hashes verified. Program/cache/runtime pack bytes unchanged.")
