from pathlib import Path
from html.parser import HTMLParser
import hashlib,json
q=Path(__file__).resolve().parent
class URLs(HTMLParser):
 def __init__(self): super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=="script" and "data-runtime-module" in d:
   self.urls.append({k:d[a] for k,a in [("runtimeModule","data-runtime-module"),("runtimeManifest","data-runtime-manifest"),("programManifest","data-program-manifest")]})
result={"routes":{}}
for route in ["", "nested/deck", "downstream/custom"]:
 root=q/"site"/route;p=URLs();p.feed((root/"index.html").read_text());assert len(p.urls)==1
 urls=p.urls[0];assert all(not u.startswith("/") and ".lake" not in u and (root/u).is_file() for u in urls.values())
 files={};manifests=[]
 for f in sorted(root.glob("lib/vir/*/bundle.json")):
  d=json.loads(f.read_text());assert f.parent.name==d["contentId"]
  assert d["descriptor"]["compatibility"]=={"leanRevision":"293d5d0c0c3f3dded4688b3ccd6a33939ac5102b","virVersion":1}
  for e in d["descriptor"]["files"]:
   b=(f.parent/e["path"]).read_bytes();assert len(b)==e["byteLength"] and hashlib.sha256(b).hexdigest()==e["sha256"]
  manifests.append({"contentId":d["contentId"],"sha256":hashlib.sha256(f.read_bytes()).hexdigest(),"payloads":len(d["descriptor"]["files"])})
 for f in sorted((root/"lib/vir").rglob("*")):
  if f.is_file():files[str(f.relative_to(root/"lib/vir"))]={"bytes":f.stat().st_size,"sha256":hashlib.sha256(f.read_bytes()).hexdigest()}
 assert len(manifests)==2 and len(files)==16
 if route:assert files==result["routes"][""]["files"] and urls==result["routes"][""]["urls"]
 result["routes"][route]={"urls":urls,"manifests":manifests,"files":files}
e=json.loads((q/"generated-interface.json").read_text())["manifest"]["exports"]
assert len(e)==1 and e[0]["effect"]=="pure" and e[0]["entry"]=="VersoSlides.VirPrettyM.formatSegments"
assert e[0]["result"]["interfaceTag"]==16
assert [f["name"] for f in e[0]["result"]["element"]["fields"]]==["text","tags"]
(q/"inventory.json").write_text(json.dumps(result,indent=2)+"\n")
print("Three routes: six envelopes / 42 payload hashes verified; all 16 resource files and relative loader URLs identical. Actual generated ABI: pure Array Segment, fields text/tags.")
