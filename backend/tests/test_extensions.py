import json
from datetime import date,timedelta
import pytest
from test_health import client,student_headers,counselor_headers


def test_advanced_gating_is_server_enforced(client,monkeypatch):
    for path in ('/api/advanced/body','/api/advanced/pose'):
        assert client.get(path).status_code==403
    monkeypatch.setenv('BILLING_MODE','demo')
    client.post('/api/billing/demo',json={'action':'activate'})
    data=client.get('/api/advanced/body').json()
    assert len(data['measurements'])==2
    assert all(m['user_id']=='student-jimin' for m in data['measurements'])
    assert client.get('/api/advanced/pose').status_code==200
    client.post('/api/billing/demo',json={'action':'expire'})
    assert client.get('/api/advanced/body').status_code==403


def test_consent_history_revoke_and_export_isolation(client):
    client.put('/api/health/school',json={'school_id':'yonsei-mirae','share_with_center':True})
    client.put('/api/health/school',json={'school_id':'yonsei-mirae','share_with_center':False})
    data=client.get('/api/privacy/export').json()
    assert [h['shared'] for h in data['sharing_history']]==[True,False]
    assert data['profile']['id']=='student-jimin'
    assert client.get('/api/counselor/students',headers=counselor_headers()).json()==[]
    assert not client.get('/api/health/school-connection').json()['verified']


def test_goal_persists_and_changes_strategy(client):
    body={'strategy':'muscle_gain','metric':'skeletal_muscle_mass','target':25,'target_date':str(date.today()+timedelta(days=90))}
    r=client.put('/api/goals',json=body)
    assert r.status_code==200
    assert r.json()['baseline']==22.3
    assert client.get('/api/exercise-profile').json()['goal']=='MUSCLE_GAIN'
    assert client.get('/api/goals').json()['current']==22.3
    body.update(metric='weekly_sessions',target=8)
    assert client.put('/api/goals',json=body).status_code==422


def test_account_deletion_blocks_existing_identity_and_preserves_others(client):
    assert client.request('DELETE','/api/privacy/account',json={'confirmation':'WRONG'}).status_code==422
    assert client.request('DELETE','/api/privacy/account',json={'confirmation':'DELETE'}).status_code==200
    assert client.get('/api/health/profile').status_code==401
    assert client.get('/api/health/profile',headers=counselor_headers()).status_code==200
    from app.health.router import store
    assert store.list_measurements('student-jimin')==[]
    assert store.get_user('student-jimin') is None


def test_health_data_delete_removes_snapshots(client):
    client.post('/api/exercise-routines/generate')
    assert client.request('DELETE','/api/privacy/health-data',json={'confirmation':'DELETE'}).status_code==200
    assert client.get('/api/body-composition').json()==[]
    assert client.get('/api/exercise-routines').json()==[]
    assert client.get('/api/health/profile').status_code==200


def test_measurement_delete_is_own_only_and_removes_derived_plan(client):
    plan=client.post('/api/exercise-routines/generate').json()
    mid=client.get('/api/body-composition/latest').json()['id']
    assert client.delete('/api/body-composition/'+mid,headers=student_headers('other')).status_code==404
    assert client.delete('/api/body-composition/'+mid).status_code==200
    assert client.get('/api/exercise-routines/'+plan['id']).status_code==404
    assert len(client.get('/api/body-composition').json())==1


def test_admin_has_metadata_but_not_student_health(client):
    admin=student_headers('admin-demo')
    assert client.get('/api/admin/dashboard').status_code==403
    data=client.get('/api/admin/dashboard',headers=admin).json()
    assert 'measurements' not in data
    mid=client.get('/api/body-composition/latest').json()['id']
    assert client.get('/api/body-composition/'+mid,headers=admin).status_code==404
    assert client.get('/api/counselor/students/student-jimin',headers=admin).status_code==404
    assert client.put('/api/admin/schools/yonsei-mirae/status',json={'integration_status':'connected','integration_message':'ready'},headers=admin).status_code==409


def test_catalog_is_complete(client):
    entries=client.get('/api/exercise-catalog').json()
    assert len(entries)>=40 and len({m['id'] for m in entries})==len(entries)
    assert len({m['category'] for m in entries})==10
    required={'id','english_name','korean_name','target_muscle','secondary_muscle','equipment','difficulty','contraindications','instructions','cautions','motion_id','estimated_duration','sets','reps','rest'}
    assert all(required<=m.keys() for m in entries)


def test_provider_not_connected_never_calls_network(client,monkeypatch):
    import httpx
    monkeypatch.setattr(httpx.HTTPTransport,'handle_request',lambda *a,**kw:pytest.fail('unexpected network request'))
    assert client.get('/api/integrations/inbody').json()['status']=='not_connected'
    assert client.post('/api/integrations/inbody/sync').status_code==501


def test_provider_retries_normalizes_deduplicates_and_rolls_back(client,monkeypatch):
    import httpx
    from app.health.providers.inbody import InBodyProvider,ProviderFailure
    from app.health.router import store
    monkeypatch.setenv('INBODY_API_BASE_URL','https://contract.example.test')
    monkeypatch.setenv('INBODY_API_KEY','test-only-key')
    class Contract:
        def request(self,subject):return '/contract-test',{'subject':subject}
        def readings(self,response):return response['items']
        def normalize(self,raw):return raw['external_id'],{'measurement_date':str(date.today()),'weight':raw['weight']}
    count=0
    def handler(request):
        nonlocal count
        count+=1
        if count==1:return httpx.Response(429,headers={'Retry-After':'0'})
        return httpx.Response(200,json={'items':[{'external_id':'A','weight':60}]})
    with httpx.Client(transport=httpx.MockTransport(handler)) as http:
        adapter=InBodyProvider(store,Contract(),http,sleep=lambda _:None)
        adapter.sync('student-jimin','opaque-id');adapter.sync('student-jimin','opaque-id')
    assert count==3
    assert len([m for m in store.list_measurements('student-jimin') if m.source=='inbody'])==1
    with httpx.Client(transport=httpx.MockTransport(lambda r:httpx.Response(200,json={'items':[{'external_id':'B','weight':61},{'external_id':'C','weight':-1}]}))) as http:
        with pytest.raises(ProviderFailure):InBodyProvider(store,Contract(),http).sync('student-jimin','opaque-id')
    assert len([m for m in store.list_measurements('student-jimin') if m.source=='inbody'])==1


def test_coach_uses_saved_comparison_and_safety_response(client):
    reply=client.post('/api/health-agent/chat',json={'message':'오른쪽 다리가 약한가요?'}).json()['reply']
    assert '6.1kg' in reply and '6.3kg' in reply
    assert '의료진' in client.post('/api/health-agent/chat',json={'message':'흉통이 있어요'}).json()['reply']


def test_workout_minutes_rejects_invalid_and_progress_has_weeks(client):
    assert 'workout_weeks' in client.get('/api/progress').json()
    from app.health.schemas import WorkoutLogCreateRequest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):WorkoutLogCreateRequest(date=str(date.today()),exercise_name='test',actual_minutes=-1)


def test_manual_duplicate_and_csv_atomic_import(client):
    payload={'measurement_date':str(date.today()),'weight':60,'skeletal_muscle_mass':24}
    first=client.post('/api/body-composition',json=payload).json()
    second=client.post('/api/body-composition',json=payload).json()
    assert first['id']==second['id']
    before=len(client.get('/api/body-composition').json())
    csv='measurement_date,weight\n'+str(date.today())+',59\n'+str(date.today())+',-1'
    assert client.post('/api/body-composition/import-csv',files={'file':('readings.csv',csv,'text/csv')}).status_code==422
    assert len(client.get('/api/body-composition').json())==before


def test_multischool_issuer_namespace_and_allowlist(monkeypatch,client):
    import jwt
    import app.services.auth as auth
    from app.services.school_oidc import verify_school_token
    config=[{'school_id':'snu','issuer':'https://sso.example.test','client_id':'app','audience':'health','redirect_url':'https://app.example.test/auth/callback','status':'connected'}]
    monkeypatch.setenv('SCHOOL_OIDC_CONFIG',json.dumps(config))
    monkeypatch.setattr(auth,'verify_oidc_token',lambda token,issuer,audience,role_claim:auth.User('same-sub','admin'))
    a,school=verify_school_token(jwt.encode({'iss':config[0]['issuer'],'sub':'same-sub'},'test-key',algorithm='HS256'))
    assert school=='snu' and a.role=='student'  # campus claims cannot grant application admin
    config[0]['issuer']='https://other.example.test';monkeypatch.setenv('SCHOOL_OIDC_CONFIG',json.dumps(config))
    b,_=verify_school_token(jwt.encode({'iss':config[0]['issuer'],'sub':'same-sub'},'test-key',algorithm='HS256'))
    assert a.id!=b.id
    from fastapi import HTTPException
    with pytest.raises(HTTPException):verify_school_token(jwt.encode({'iss':'https://evil.example.test'},'test-key',algorithm='HS256'))


def test_deleting_old_reading_invalidates_comparison_snapshots_but_keeps_workouts(client):
    plan=client.post('/api/exercise-routines/generate').json()
    readings=client.get('/api/body-composition').json()
    old=next(m for m in readings if m['id']!=plan['based_on_measurement_id'])
    from app.health.router import store
    from app.health.schemas import WorkoutLog
    store.add_workout(WorkoutLog(id='retained-log',user_id='student-jimin',routine_id=plan['id'],date=str(date.today()),exercise_name='걷기'))
    assert client.delete('/api/body-composition/'+old['id']).status_code==200
    assert store.list_routines('student-jimin')==[]
    log=next(w for w in store.list_workouts('student-jimin') if w.id=='retained-log')
    assert log.routine_id is None and log.exercise_name=='걷기'
