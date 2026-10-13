#!/usr/bin/env python3
import argparse,json,os,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cwd',required=True);p.add_argument('--name',required=True);p.add_argument('command',nargs=argparse.REMAINDER);a=p.parse_args()
cmd=a.command[1:] if a.command[:1]==['--'] else a.command
base=Path(__file__).resolve().parent
if (base/(a.name+'.log')).exists():raise SystemExit('refusing to overwrite '+a.name)
env=os.environ.copy()
removed=[k for k in env if k.startswith(('VIR_','LEAN_VIR_','LEAN_WASM_','WASI_'))]
for k in removed:env.pop(k)
start=time.time()
with (base/(a.name+'.log')).open('w') as f:
 result=subprocess.run(cmd,cwd=a.cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
record={'command':cmd,'cwd':a.cwd,'startedUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(start)),'elapsedSeconds':time.time()-start,'exitCode':result.returncode,'clearedOverrideNames':removed}
(base/(a.name+'.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record),flush=True)
raise SystemExit(result.returncode)
