import os
from concurrent.futures import ThreadPoolExecutor
import pytest
from app.health.store import HealthStore
from app.health.schemas import ReferenceRange,Segment,ExerciseRoutine,WorkoutLogCreateRequest

def test_migration_repeat_history_atomic_and_concurrent(tmp_path):
    s=HealthStore(tmp_path/'health.sqlite');HealthStore(tmp_path/'health.sqlite')
    with s.connect() as db:assert db.execute('SELECT MAX(version) FROM schema_migrations').fetchone()[0]==__import__('app.health.migrations',fromlist=['VERSION']).VERSION
    first=ExerciseRoutine(id='r1',user_id='u',goal='First');s.add_routine(first)
    second=ExerciseRoutine(id='r2',user_id='u',goal='Second',progression='Reduced load');s.add_routine(second)
    with s.connect() as db:
        row=db.execute('SELECT old_routine_id,new_routine_id FROM adaptive_history WHERE id=?',('r2',)).fetchone()
        assert tuple(row)==('r1','r2')
    with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(lambda i:s.save_preference('u','test',{'i':i}),range(12)))
    assert s.preference('u','test')['i'] in range(12)

def test_production_references_fail_closed(tmp_path,monkeypatch):
    s=HealthStore(tmp_path/'health.sqlite')
    s.add_reference_range(ReferenceRange(id='demo',gender='any',age_min=18,age_max=90,segment=Segment.TRUNK))
    monkeypatch.setenv('APP_ENV','production')
    assert s.find_reference(gender='male',age=30,height=175,segment=Segment.TRUNK) is None
    s.add_reference_range(ReferenceRange(id='actual',gender='any',age_min=18,age_max=90,segment=Segment.TRUNK,source='institution registry',publication='Institution protocol',version='1',effective_date='2026-09-30'))
    assert s.find_reference(gender='male',age=30,height=175,segment=Segment.TRUNK).version=='1'

def test_feedback_bounds():
    base=dict(date='2026-09-30',exercise_name='test')
    with pytest.raises(ValueError):WorkoutLogCreateRequest(**base,rpe=11)
    with pytest.raises(ValueError):WorkoutLogCreateRequest(**base,pain=-1)
    assert WorkoutLogCreateRequest(**base,rpe=7,pain=2).pain==2

def test_evidence_registry_scope():
    from app.health.exercise_engine import SOURCES
    assert all(s['url'].startswith('https://') and s['scope'] and s['version'] for s in SOURCES)

from test_health import client

def test_numeric_pain_blocks_plan_and_history_is_private(client):
    from datetime import date
    r=client.post('/api/exercise-routines/generate').json();e=r['exercises'][0]
    h=client.get('/api/adaptive-history').json();assert h[0]['new_routine']['id']==r['id']
    body=dict(routine_id=r['id'],routine_exercise_id=e['exercise_id'],day_number=e['day_number'],date=date.today().isoformat(),exercise_name=e['exercise_name'],rpe=8,pain=2,difficulty='moderate')
    assert client.post('/api/workouts',json=body).status_code==200
    assert client.post('/api/exercise-routines/generate').status_code==409
    assert client.get('/api/adaptive-history',headers={'X-Synex-Demo-User':'other'}).json()==[]
    assert client.request('DELETE','/api/privacy/health-data',json={'confirmation':'DELETE'}).status_code==200
    assert client.get('/api/adaptive-history').json()==[]

def test_verified_grace_period_state(client,monkeypatch):
    from app.health import billing
    monkeypatch.setenv('AUTH_MODE','oidc');monkeypatch.setenv('BILLING_MODE','revenuecat');monkeypatch.setenv('REVENUECAT_SECRET_KEY','test')
    payload={'subscriber':{'entitlements':{'plus':{'product_identifier':'synex_plus_monthly','expires_date':'2020-01-01T00:00:00Z'}},'subscriptions':{'synex_plus_monthly':{'store':'app_store','is_sandbox':False,'billing_issues_detected_at':'2020-01-01T00:00:00Z','grace_period_expires_date':'2099-01-01T00:00:00Z'}}}}
    class Reply:
        def raise_for_status(self):pass
        def json(self):return payload
    monkeypatch.setattr(billing.httpx,'get',lambda *a,**kw:Reply())
    s=billing.status('student-jimin',verify=True);assert s['state']=='grace_period' and s['active']
    payload['subscriber']['subscriptions']['synex_plus_monthly']['grace_period_expires_date']='2020-01-01T00:00:00Z'
    s=billing.status('student-jimin',verify=True);assert s['state']=='billing_issue' and not s['active']
