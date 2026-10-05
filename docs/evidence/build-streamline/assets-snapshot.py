from pathlib import Path
import hashlib, json, sys
root=Path(__file__).resolve().parent.parent
paths={
"programStage":root/".vir-generated/VersoSlidesVendored.virres",
"programCache":root/".lake/build/vir/resources/programs/VersoSlidesVendored.virres",
"runtimeStage":root/".lake/packages/lean_vir/.vir-generated/VirResourceRuntime.virres",
"runtimeCache":root/".lake/packages/lean_vir/.lake/build/vir/resources/runtime/832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d.virres"}
result={k:{"path":str(p.relative_to(root)),"bytes":p.stat().st_size,"inode":p.stat().st_ino,"mtimeNs":p.stat().st_mtime_ns,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for k,p in paths.items()}
Path(sys.argv[1]).write_text(json.dumps(result,indent=2)+"\n")
