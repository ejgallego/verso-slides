from pathlib import Path
import subprocess, json, time, os, shutil, hashlib
root=Path('/home/egallego/lean/verso-slides/.worktrees/vir-prettym-435rc4-release')
out=Path(__file__).resolve().parent
results=[]
def run(name,args,cwd=root,env=None):
 start=time.perf_counter()
 with (out/(name+'.log')).open('wb') as log:
  r=subprocess.run(args,cwd=cwd,stdout=log,stderr=subprocess.STDOUT,env=env)
 results.append({'name':name,'command':args,'cwd':str(cwd),'seconds':time.perf_counter()-start,'exit':r.returncode})
 (out/'qualification-results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(name, r.returncode, flush=True)
 if r.returncode: raise SystemExit(r.returncode)
(out/'executed-source.txt').write_text(subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True))
run('native', ['lake','--no-cache','test','--','--no-playwright'])
run('root-render', ['lake','--no-cache','exe','demo-slides'])
run('native-corpus', [str(root/'.lake/build/bin/test-pretty'),'--host-abi-corpus'])
corpus=json.loads((out/'native-corpus.log').read_text()); assert len(corpus)==8
old=Path('/home/egallego/lean/verso-slides/.worktrees/vir-prettym-main435-evidence/docs/evidence/main435-adoption/native-corpus.json')
assert corpus==json.loads(old.read_text())
(out/'native-corpus.json').write_text(json.dumps(corpus,indent=2)+'\n')
run('typescript', ['/home/egallego/lean/verso-slides/node_modules/.bin/tsc','--noEmit','-p','web-lib/panel/jsconfig.json'])
leaf=root/'examples/default-deck'
run('downstream-cold', ['lake','--no-cache','build'],cwd=leaf)
run('downstream-warm', ['lake','--no-cache','build'],cwd=leaf)
run('downstream-render', ['lake','--no-cache','exe','my-talk'],cwd=leaf)
(out/'downstream-lake-manifest.json').write_bytes((leaf/'lake-manifest.json').read_bytes())
site=out/'site'
shutil.copytree(root/'_slides',site)
shutil.copytree(root/'_slides',site/'nested/deck')
shutil.copytree(leaf/'_slides',site/'downstream/custom')
shutil.copytree(root/'_test/code',site/'code')
shutil.copy2(out/'native-corpus.json',site/'native-corpus.json')
venv=Path('/home/egallego/lean/verso-slides/.worktrees/vir-prettym-434-minimal/browser-tests/.venv')
env=dict(os.environ); env['PATH']=str(venv/'bin')+os.pathsep+env['PATH']
run('browser', [str(venv/'bin/python'),'-m','pytest',
 'browser-tests/test_vir_prettym_site.py','browser-tests/test_vir_prettym_presentation.py',
 'browser-tests/test_vir_prettym_initialization.py','browser-tests/test_lightbox.py::TestLightboxReadiness',
 '--vir-site-acceptance','--site-dir',str(site),'--browser','all','-v','--junitxml',str(out/'browser.xml')],env=env)
