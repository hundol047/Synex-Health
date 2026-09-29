"""Run from repository root. Deliberately fails until real release configuration exists."""
import os,subprocess,sys,json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
failures=[]
def check(command,cwd):
 r=subprocess.run(command,cwd=cwd)
 if r.returncode:failures.append(' '.join(command))
check([sys.executable,'scripts/scan-secrets.py'],root)
check([sys.executable,'-m','pytest','-q'],root/'backend')
npm='npm.cmd' if os.name=='nt' else 'npm'
check([npm,'test'],root/'frontend')
check([npm,'run','build:release'],root/'frontend')
for name in ['APP_STORE_PRIVACY','APP_REVIEW_NOTES','APP_STORE_METADATA','APP_STORE_AGE_RATING','EXPORT_COMPLIANCE','APP_STORE_SUBSCRIPTION','IOS_RELEASE','APP_STORE_RELEASE_READINESS']:
 if not (root/'docs'/f'{name}.md').is_file():failures.append(name+' missing')
for name in ['privacypolicy.html','terms.html']:
 p=root/'frontend/dist'/name
 if not p.exists() or '운영자 설정 필요' in p.read_text():failures.append(name+' incomplete')
icon=root/'frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
if not icon.is_file():failures.append('App icon missing')
sys.path.insert(0,str(root/'backend'))
from app.services.release_config import validate_production
try:validate_production(dict(os.environ,APP_ENV='production'))
except RuntimeError as e:failures.append(str(e))
print('\n'.join(['RELEASE BLOCKED']+failures) if failures else 'Repository checks passed; native archive/device/store gates remain separate.')
sys.exit(bool(failures))
