from pathlib import Path
import os,subprocess,time,json,sys
base=Path(__file__).parent; kind=sys.argv[1]
cwd=base/kind
if kind=='downstream':cwd=cwd/'examples/default-deck'
env=dict(os.environ);env['PATH']=str(base/'observe-bin')+os.pathsep+env['PATH'];env['SLIDES_QUAL_TRANSPORT_LOG']=str(base/(kind+'-transport.jsonl'));env['SLIDES_QUAL_NETWORK']='online';env['TMPDIR']=str(base/'tmp')
commands=[['lake','--no-cache','update'],['lake','--no-cache','build']]
if kind=='root':commands.append(['lake','--no-cache','exe','demo-slides'])
else:commands.append(['lake','--no-cache','exe','my-talk'])
results=[]
for i,cmd in enumerate(commands):
 print(kind+' '+repr(cmd),flush=True);start=time.monotonic()
 with open(base/(kind+'-cold-'+str(i)+'.log'),'w') as log:
  p=subprocess.run(cmd,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 results.append({'command':cmd,'cwd':str(cwd),'exit':p.returncode,'seconds':time.monotonic()-start})
 (base/(kind+'-results.json')).write_text(json.dumps(results,indent=2)+'\n')
 if i==0:
  pkg=cwd/'.lake/packages/lean_vir'; rid=json.loads((pkg/'vir-resources/runtime.json').read_text())['contentId']
  cache=pkg/'.lake/build/vir/resources/runtime'/f'{rid}.virres'; stage=pkg/'.vir-generated/VirResourceRuntime.virres'
  assert not cache.exists() and not stage.exists()
  (base/(kind+'-prebuild.json')).write_text(json.dumps({'runtimeCacheAbsent':True,'runtimeStageAbsent':True,'vir':subprocess.check_output(['git','-C',str(pkg),'rev-parse','HEAD'],text=True).strip()},indent=2)+'\n')
 print(kind+' exit '+str(p.returncode)+' in '+str(round(results[-1]['seconds'],2))+'s',flush=True)
 if p.returncode:sys.exit(p.returncode)
