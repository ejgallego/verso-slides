from pathlib import Path
import subprocess, json, time, statistics, hashlib, shutil
out=Path(__file__).resolve().parent
root=Path('/home/egallego/lean/verso-slides')
works={'old':root/'build/reviews/prettym-impact-20261009/old','new':root/'.worktrees/vir-prettym-435rc4-release'}
retained=out/'retained-builds'; retained.mkdir(exist_ok=True)
samples=[]
def record(phase,label,number):
 work=works[label]; log=out/f'perf-{phase}-{number:02d}-{label}.log'; metric=log.with_suffix('.time.json')
 start=time.perf_counter()
 with log.open('wb') as dst:
  r=subprocess.run(['/usr/bin/time','-f','{"wallSeconds":%e,"userSeconds":%U,"systemSeconds":%S,"peakRssKiB":%M,"exit":%x}','-o',str(metric),'lake','--no-cache','build'],cwd=work,stdout=dst,stderr=subprocess.STDOUT)
 data=json.loads(metric.read_text()); data.update(phase=phase,label=label,number=number,monotonicWallSeconds=time.perf_counter()-start,binarySha256=hashlib.sha256((work/'.lake/build/bin/demo-slides').read_bytes()).hexdigest() if r.returncode==0 else None)
 samples.append(data); (out/'perf-samples.json').write_text(json.dumps(samples,indent=2)+'\n')
 print(phase,label,round(data['monotonicWallSeconds'],3),r.returncode,flush=True)
 if r.returncode: raise SystemExit(r.returncode)
for label in ['old','new']: record('setup',label,0)
for number,label in enumerate(['old','new','new','old'],1):
 (works[label]/'.lake/build').rename(retained/f'{number:02d}-{label}')
 record('project-clean',label,number)
for number,label in enumerate(['old','new','new','old']*4,1): record('warm',label,number)
summary={}
for phase in ['project-clean','warm']:
 summary[phase]={}
 for label in ['old','new']:
  rows=[s for s in samples if s['phase']==phase and s['label']==label]; vals=[r['monotonicWallSeconds'] for r in rows]
  assert len({r['binarySha256'] for r in rows})==1
  summary[phase][label]={'medianSeconds':statistics.median(vals),'minSeconds':min(vals),'maxSeconds':max(vals),'count':len(vals)}
(out/'perf-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2),flush=True)
