import pytest
from datetime import date
from test_health import client,counselor_headers

# Full HTTP write surface plus local camera analysis access. Deletion stays available.
CASES=[('PUT','/api/health/profile',{'height':170}),('POST','/api/body-composition',{'measurement_date':'2026-01-01','weight':60}),
 ('POST','/api/body-composition/import-csv',None),('PUT','/api/body-map/reference-group',{'group_id':None}),
 ('POST','/api/health-agent/analyze',{}),('POST','/api/health-agent/chat',{'message':'운동 안내'}),
 ('PUT','/api/exercise-profile',{'goal':'BALANCE'}),('POST','/api/exercise-routines/generate',{}),
 ('POST','/api/workouts',{}),('POST','/api/exercise-routines/r/replace/e/new',{}),
 ('PUT','/api/goals',{'strategy':'habit','metric':'weekly_sessions','target':3,'target_date':'2027-01-01'}),
 ('POST','/api/integrations/inbody/sync',{}),('GET','/api/advanced/pose',None),
 ('PUT','/api/health/school',{'school_id':'yonsei-mirae','share_with_center':True}),
 ('POST','/api/schools/request',{'name':'테스트 학교'})]

def grant(client,version=None):
    body={'privacy_collection':True,'sensitive_health':True,'age_14_or_over':True}
    if version:body['version']=version
    return client.post('/api/consents',json=body)

@pytest.mark.parametrize('method,path,body',CASES)
def test_every_health_write_requires_current_consent(client,method,path,body,monkeypatch):
    # Keep real HTTP routing/RBAC/consent checks, isolate downstream business validations.
    # Existing integration tests exercise valid measurement/routine/CSV/provider payloads.
    if path=='/api/workouts':
        routine=client.post('/api/exercise-routines/generate').json();e=routine['exercises'][0]
        body={'routine_id':routine['id'],'routine_exercise_id':e['exercise_id'],'day_number':e['day_number'],'date':date.today().isoformat(),'exercise_name':e['exercise_name']}
    if '/replace/' in path:
        routine=client.post('/api/exercise-routines/generate').json()
        for e in routine['exercises']:
            alt=client.get(f"/api/exercise-routines/{routine['id']}/alternatives/{e['exercise_id']}").json()
            if alt:
                path=f"/api/exercise-routines/{routine['id']}/replace/{e['exercise_id']}/{alt[0]['id']}";break
    assert client.post('/api/consents/withdraw',json={}).status_code==200
    kwargs={'files':{'file':('m.csv','measurement_date,weight\n2026-01-01,60\n','text/csv')}} if body is None and method=='POST' else ({'json':body} if body is not None else {})
    response=client.request(method,path,**kwargs)
    assert response.status_code==403,response.text
    assert response.json()['detail']['code']=='SENSITIVE_CONSENT_REQUIRED'
    assert grant(client).status_code==200
    if path=='/api/advanced/pose':
        monkeypatch.setenv('BILLING_MODE','demo');client.post('/api/billing/demo',json={'action':'activate'})
    if path=='/api/integrations/inbody/sync':
        # No official provider configured: passing consent must reach the existing 501 guard.
        assert client.request(method,path,**kwargs).status_code==501
    else:
        response=client.request(method,path,**kwargs)
        assert response.status_code==200,response.text

@pytest.mark.parametrize('field',['privacy_collection','sensitive_health','age_14_or_over'])
def test_three_separate_opt_ins_are_required(client,field):
    payload={'privacy_collection':True,'sensitive_health':True,'age_14_or_over':True};payload[field]=False
    assert client.post('/api/consents',json=payload).status_code==422

def test_under14_and_version_change(client,monkeypatch):
    from app.health import consents
    from app.health.router import store
    monkeypatch.setattr(consents,'CONSENT_VERSION','future-test-version')
    assert client.put('/api/health/profile',json={'height':170}).json()['detail']['code']=='SENSITIVE_CONSENT_REQUIRED'
    assert grant(client,'future-test-version').status_code==200
    assert client.put('/api/health/profile',json={'height':170}).status_code==200
    u=store.get_user('student-jimin');u.birth_date=date.today().isoformat();store.upsert_user(u)
    assert grant(client,'future-test-version').status_code==403

def test_withdrawal_blocks_counselor_and_background_sync_but_preserves_data(client):
    from app.health.extensions import provider_sync
    from app.services.auth import User
    from fastapi import HTTPException
    counselor=counselor_headers(client)
    assert client.get('/api/counselor/students',headers=counselor).json()
    before=client.get('/api/body-composition').json()
    assert client.post('/api/consents/withdraw',json={}).status_code==200
    assert client.get('/api/counselor/students',headers=counselor).json()==[]
    assert client.get('/api/counselor/students/student-jimin',headers=counselor).status_code==404
    with pytest.raises(HTTPException) as err:provider_sync(User('student-jimin','student'),trigger='scheduled_server')
    assert err.value.detail['code']=='SENSITIVE_CONSENT_REQUIRED'
    assert client.get('/api/body-composition').json()==before
    assert client.get('/api/privacy/export').status_code==200
    assert client.request('DELETE','/api/privacy/health-data',json={'confirmation':'DELETE'}).status_code==200

def test_retention_policy_is_required_in_production():
    from app.services.release_config import validate_production
    for value in ['', '{{RETENTION_POLICY}}','운영자 설정 필요','TODO']:
        with pytest.raises(RuntimeError,match='RETENTION_POLICY'):validate_production({'APP_ENV':'production','RETENTION_POLICY':value})
