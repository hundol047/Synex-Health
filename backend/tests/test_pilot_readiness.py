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
