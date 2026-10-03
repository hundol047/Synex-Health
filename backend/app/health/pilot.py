"""Readiness is evidence, never a configuration flag claiming a completed pilot."""
import os,json
from pathlib import Path
from datetime import date

def device_evidence(path, platform, commit=None):
    try:
        rows=json.loads(Path(path).read_text())['tests']
        if not isinstance(rows,list):return 'NOT TESTED'
        required={'camera','pose','offline','notifications','billing','health','my_body','average_overlay','previous_compare','interpolation','wireframe','section_view'}
        passed=set()
        for r in rows:
            if not isinstance(r,dict):continue
            if r.get('platform')!=platform or r.get('physical_device') is not True:continue
            if not all(r.get(k) for k in ('date','tester','device','OS','app_version','commit_sha','evidence_url')):continue
            if date.fromisoformat(r['date'])>date.today():continue
            if r.get('commit_sha')!=(commit or os.getenv('BUILD_COMMIT')):continue
            if r.get('result')=='PASS':passed.add(r.get('test'))
        return 'VERIFIED' if required<=passed else 'PARTIAL' if passed else 'NOT TESTED'
    except (OSError,ValueError,KeyError,TypeError):return 'NOT TESTED'

def readiness(store,env=None):
    e=os.environ if env is None else env
    from .reference import production_eligible
    from .providers.configured import inbody
    from urllib.parse import urlparse
    def legal(k):
        u=urlparse(e.get(k,''));return u.scheme=='https' and bool(u.hostname) and not u.hostname.endswith(('.example','.test')) and u.hostname not in ('localhost','example.com','example.org','example.net','127.0.0.1')
    from ..services.release_config import validate_production
    try:validate_production({**dict(e),'PILOT_MODE':'true'});configuration_valid=True
    except RuntimeError:configuration_valid=False
    users=store.list_students()
    mapped=any(u.school_id and store.preference(u.id,'membership',{}).get('verified') and store.preference(u.id,'membership',{}).get('school_id')==u.school_id for u in users)
    manual=store.preference('__system__','verified_manual_workflow',{})
    manual_ready=bool(manual.get('reviewed_by') and manual.get('evidence_url') and manual.get('school_id'))
    provider_synced=any(store.preference(u.id,'inbody_sync',{}).get('status')=='connected' for u in users)
    checks={'Production configuration':'VERIFIED' if configuration_valid else 'EXTERNAL SETUP REQUIRED','Authentication':'VERIFIED' if e.get('AUTH_MODE')=='oidc' else 'EXTERNAL SETUP REQUIRED',
      'Database':'VERIFIED' if store.database else 'EXTERNAL SETUP REQUIRED',
      'Privacy':'VERIFIED' if legal('PRIVACY_POLICY_URL') else 'EXTERNAL SETUP REQUIRED',
      'Terms':'VERIFIED' if legal('TERMS_URL') else 'EXTERNAL SETUP REQUIRED',
      'Support':'VERIFIED' if legal('SUPPORT_URL') and e.get('SUPPORT_EMAIL') else 'EXTERNAL SETUP REQUIRED',
      'School mapping':'VERIFIED' if mapped else 'EXTERNAL SETUP REQUIRED',
      'InBody':'SYNCED' if provider_synced and inbody(store).configured() else 'CONFIGURED' if inbody(store).configured() else 'DISCONNECTED',
      'Provider workflow':'VERIFIED' if (provider_synced and inbody(store).configured()) or manual_ready else 'EXTERNAL SETUP REQUIRED',
      'Reference Data':'DISABLED' if e.get('REFERENCE_COMPARISON_ENABLED')=='false' else 'VERIFIED' if any(production_eligible(r) for r in store.list_reference_ranges()) else 'EXTERNAL DATA REQUIRED',
      'Android Device QA':device_evidence(e.get('DEVICE_QA_EVIDENCE',''),'android',e.get('BUILD_COMMIT')),
      'iOS Device QA':device_evidence(e.get('DEVICE_QA_EVIDENCE',''),'ios',e.get('BUILD_COMMIT')),
      'Billing':'DISABLED' if e.get('BILLING_MODE','disabled')=='disabled' else 'SANDBOX ONLY'}
    blockers=[k for k,v in checks.items() if k not in ('InBody','Billing') and v not in ('VERIFIED','DISABLED')]
    return {'pilot_mode':e.get('PILOT_MODE')=='true','pilot_ready':not blockers,'checks':checks,'blockers':blockers,'pose_validation':'EXTERNAL VALIDATION DATA REQUIRED','notice':'실험적 기능 · Pose 실제 사람 정확도 및 실기기 검증 상태를 확인하세요.'}
