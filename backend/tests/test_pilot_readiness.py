import json
import pytest
from test_average_overlay import fixture_data
from test_health import client
from app.health.reference_validation import validate
from app.health.reference import average_comparison
from app.health.pilot import readiness,device_evidence
from app.services.release_config import validate_production

@pytest.mark.parametrize('changes',[{'country':None},{'measurement_device':'unsupported'},{'age_min':-1},{'bmi_max':101},{'source':''},{'unit':'lb'},{'lean_mean':-1},{'reference_population':None}])
def test_import_rejects_unapproved_metadata(changes):
    r=fixture_data()[2].model_dump();r.update(changes)
    with pytest.raises(ValueError):validate({'references':[r]})

def test_overlapping_cohorts_abort_import():
    a=fixture_data()[2].model_dump();b={**a,'id':'second','age_min':22,'age_max':29}
    with pytest.raises(ValueError,match='Overlapping'):validate({'references':[a,b]})

def test_pilot_no_fallback_and_disabled_comparison(monkeypatch):
    u,m,r=fixture_data();monkeypatch.setenv('PILOT_MODE','true')
    assert not average_comparison(u,m.model_copy(update={'device_name':'Other'}),[r])['available']
    monkeypatch.setenv('REFERENCE_COMPARISON_ENABLED','false')
    assert not average_comparison(u,m,[r])['available']

def test_pilot_requires_production_config():
    with pytest.raises(RuntimeError):validate_production({'PILOT_MODE':'true'})

def test_empty_evidence_cannot_claim_ready():
    class Store:
        database=None
        def list_students(self):return []
        def list_reference_ranges(self):return []
        def preference(self,*args):return {}
    report=readiness(Store(),{'PILOT_MODE':'true'})
    assert not report['pilot_ready']
    assert report['checks']['Android Device QA']=='NOT TESTED'
    assert report['checks']['Reference Data']=='EXTERNAL DATA REQUIRED'

def test_simulator_and_wrong_commit_evidence_rejected(tmp_path,monkeypatch):
    monkeypatch.setenv('BUILD_COMMIT','current')
    f=tmp_path/'qa.json';f.write_text(json.dumps({'tests':[{'platform':'ios','physical_device':False,'result':'PASS','test':'camera'}]}))
    assert device_evidence(str(f),'ios')=='NOT TESTED'

def test_mapping_admin_only_and_school_matches(client):
    from app.health.router import store
    uid='student-jimin';school=store.get_user(uid).school_id
    payload={'school_id':school,'school_user_id':'test-student-token','subject':'test-provider-token'}
    url=f'/api/admin/users/{uid}/inbody-mapping'
    assert client.put(url,json=payload).status_code==403
    admin={'X-Synex-Demo-User':'admin-demo'}
    assert client.put(url,json={**payload,'school_id':'other-school'},headers=admin).status_code==422
    assert client.put(url,json=payload,headers=admin).status_code==200
    stored=store.preference(uid,'inbody_mapping',{})
    assert stored['verified_by']=='admin-demo'
    assert client.get('/api/integrations/inbody').json()['operational_state']=='DISCONNECTED'

def test_reference_method_mismatch_blocks(monkeypatch):
    monkeypatch.setenv('PILOT_MODE','true')
    u,m,r=fixture_data();m=m.model_copy(update={'measurement_method':'DXA'})
    result=average_comparison(u,m,[r]);assert not result['available'];assert '측정 방식' in result['message']

def test_provider_long_retry_after_never_retries_early(monkeypatch):
    import httpx
    from app.health.providers.inbody import InBodyProvider,ProviderFailure
    monkeypatch.setenv('INBODY_API_BASE_URL','https://contract.example.test')
    monkeypatch.setenv('INBODY_API_KEY','test-key')
    class Contract:
        def request(self,subject):return '/test',{}
    requests=[]
    def handler(req):
        requests.append(req);return httpx.Response(429,headers={'Retry-After':'3600'})
    with httpx.Client(transport=httpx.MockTransport(handler)) as http:
        with pytest.raises(ProviderFailure) as error:InBodyProvider(object(),Contract(),http).sync('test-user','test-subject')
    assert len(requests)==1 and error.value.retry_after==3600

def test_center_connection_does_not_claim_school_sso(client,monkeypatch):
    monkeypatch.setenv('SCHOOL_OIDC_CONFIG','[]')
    response=client.get('/api/admin/dashboard',headers={'X-Synex-Demo-User':'admin-demo'})
    assert response.status_code==200
    assert response.json()['school_overview']
    assert all(s['sso']=='NOT CONFIGURED' and s['provider']=='DISCONNECTED' for s in response.json()['school_overview'])


def test_mapping_is_unique_across_schools_and_normalized(client):
    from app.health.router import store
    first=store.get_user('student-jimin')
    second=first.model_copy(update={'id':'other-school-student','school_id':'other-school'})
    store.upsert_user(second)
    admin={'X-Synex-Demo-User':'admin-demo'}
    payload={'school_id':first.school_id,'school_user_id':' school-1 ','subject':' external-1 '}
    assert client.put(f'/api/admin/users/{first.id}/inbody-mapping',json=payload,headers=admin).status_code==200
    assert store.preference(first.id,'inbody_mapping')['subject']=='external-1'
    response=client.put(f'/api/admin/users/{second.id}/inbody-mapping',json={**payload,'school_id':second.school_id,'subject':'external-1'},headers=admin)
    assert response.status_code==409
    assert store.preference(second.id,'inbody_mapping') is None
    assert client.put(f'/api/admin/users/{first.id}/inbody-mapping',json={**payload,'subject':'   '},headers=admin).status_code==422


def test_simultaneous_mapping_cannot_claim_same_subject(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    from app.health.store import HealthStore
    store=HealthStore(tmp_path/'mapping.sqlite')
    def assign(uid):
        try:
            store.assign_inbody_mapping(uid,{'subject':'shared','school_id':uid,'school_user_id':uid})
            return True
        except ValueError:return False
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(assign,['one','two']))==[False,True]


def qa_rows():
    from datetime import date
    tests=('camera','pose','offline','notifications','billing','health','my_body','average_overlay','previous_compare','interpolation','wireframe','section_view')
    return [dict(test=t,platform='android',physical_device=True,date=date.today().isoformat(),tester='qa-reviewer',device='physical-test-device',OS='Android',app_version='test',commit_sha='current',evidence_url='https://qa.institution.edu/redacted',result='PASS') for t in tests]


def test_evidence_rejects_conflicting_failure_and_wrong_build(tmp_path):
    path=tmp_path/'evidence.json';rows=qa_rows()
    path.write_text(json.dumps({'tests':rows}))
    assert device_evidence(path,'android','current')=='VERIFIED'
    assert device_evidence(path,'android','other')=='NOT TESTED'
    path.write_text(json.dumps({'tests':rows+[{**rows[0],'result':'FAIL'}]}))
    assert device_evidence(path,'android','current')=='PARTIAL'
    path.write_text(json.dumps({'tests':[{**r,'evidence_url':'not-a-link'} for r in rows]}))
    assert device_evidence(path,'android','current')=='NOT TESTED'


def test_stale_sync_and_unrelated_manual_school_cannot_pass_gate(client,monkeypatch):
    from app.health.router import store
    from types import SimpleNamespace
    from app.health.providers import configured
    monkeypatch.setattr(configured,'inbody',lambda _:SimpleNamespace(configured=lambda:True))
    store.save_preference('student-jimin','membership',{'verified':False})
    store.save_preference('student-jimin','inbody_sync',{'status':'connected','last_sync_time':'2026-01-01'})
    store.save_preference('__system__','verified_manual_workflow',{'school_id':'unrelated','reviewed_by':'reviewer','reviewed_at':'2026-01-01','evidence_url':'https://qa.institution.edu/manual'})
    report=readiness(store,{})
    assert report['checks']['InBody']=='CONFIGURED'
    assert report['checks']['Provider workflow']=='EXTERNAL SETUP REQUIRED'
    assert not report['pilot_ready']


def test_configured_auth_requires_current_acceptance_evidence(client,tmp_path):
    from app.health.router import store
    from datetime import date
    env={'AUTH_MODE':'oidc','BUILD_COMMIT':'current'}
    assert readiness(store,env)['checks']['Authentication']=='EXTERNAL SETUP REQUIRED'
    path=tmp_path/'acceptance.json'
    row=dict(test='Authentication',date=date.today().isoformat(),tester='operator',evidence_url='https://qa.institution.edu/login',commit_sha='current',result='PASS')
    path.write_text(json.dumps({'tests':[row]}));env['PILOT_ACCEPTANCE_EVIDENCE']=str(path)
    assert readiness(store,env)['checks']['Authentication']=='VERIFIED'
    path.write_text(json.dumps({'tests':[row,{**row,'result':'FAIL'}]}))
    assert readiness(store,env)['checks']['Authentication']=='EXTERNAL SETUP REQUIRED'
