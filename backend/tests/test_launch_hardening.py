from datetime import date
from test_health import client
from app.health.exercise_catalog import CATALOG,BY_ID
from app.health.schemas import WorkoutLog
from app.health.store import HealthStore,WorkoutConflict
import pytest


def test_expanded_catalog_and_bodyweight_plan(client):
    assert len(CATALOG)>=74
    assert len(BY_ID)==len(CATALOG)
    assert sum(m['training_type']=='equipment' for m in CATALOG)>=30
    for m in CATALOG:
        assert m['instructions'] and m['cautions'] and m['locations']
        assert (m['training_type']=='bodyweight') == (not m['equipment'])
    client.put('/api/exercise-profile',json={'training_mode':'bodyweight','available_equipment':['dumbbell','leg_press_machine']})
    r=client.post('/api/exercise-routines/generate');assert r.status_code==200
    assert all(not e['equipment'] for e in r.json()['exercises'])


def test_gym_plan_requires_specific_machine_and_location(client):
    client.put('/api/exercise-profile',json={'training_mode':'equipment','exercise_location':'gym','available_equipment':['chest_press_machine','row_machine','leg_press_machine','stationary_bike']})
    plan=client.post('/api/exercise-routines/generate').json()
    ids={e['motion_id'] for e in plan['exercises']}
    assert {'machine_chest_press','machine_row','leg_press','stationary_cycle'}<=ids
    assert not any(m.startswith('barbell') for m in ids)
    client.put('/api/exercise-profile',json={'exercise_location':'home'})
    home=client.post('/api/exercise-routines/generate').json()
    assert not any(BY_ID[e['motion_id']]['locations']==['gym'] for e in home['exercises'])


def test_revision_conflict_preserves_server_and_replay_is_idempotent(client):
    r=client.post('/api/exercise-routines/generate').json();e=r['exercises'][0]
    payload={'routine_id':r['id'],'routine_exercise_id':e['exercise_id'],'day_number':e['day_number'],
             'exercise_name':e['exercise_name'],'date':date.today().isoformat(),'mutation_id':'first','sets_completed':1}
    first=client.post('/api/workouts',json=payload);assert first.status_code==200
    assert client.post('/api/workouts',json=payload).json()['revision']==1
    edit={**payload,'mutation_id':'second','expected_revision':1,'sets_completed':2}
    assert client.post('/api/workouts',json=edit).json()['revision']==2
    conflict=client.post('/api/workouts',json={**payload,'mutation_id':'stale','expected_revision':1,'sets_completed':3})
    assert conflict.status_code==409 and conflict.json()['detail']['current']['sets_completed']==2
    assert client.get('/api/workouts').json()[0]['sets_completed']==2


def test_cas_workers_cannot_silently_overwrite(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    store=HealthStore(tmp_path/'cas.db')
    def write(i):
        try:return store.add_workout(WorkoutLog(id='w',user_id='u',date='2026-10-01',exercise_name='test',mutation_id=str(i)),0)
        except WorkoutConflict:return None
    with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(write,range(4)))
    assert sum(r is not None for r in results)==1
    assert store.list_workouts('u')[0].revision==1


def test_ready_probe_checks_database_without_leaking_errors(client,monkeypatch):
    assert client.get('/readyz').status_code==200
    from app.main import health_store
    def broken():raise RuntimeError('secret database password')
    monkeypatch.setattr(health_store,'connect',broken)
    r=client.get('/readyz');assert r.status_code==503 and 'secret' not in r.text


def test_reference_import_rejects_unlicensed_data():
    from scripts.import_references import validate
    from test_average_overlay import fixture_data
    row=fixture_data()[2].model_dump(mode='json')
    assert len(validate({'references':[row]}))==1
    with pytest.raises(ValueError):validate({'references':[{**row,'license_note':None}]})
    with pytest.raises(ValueError):validate({'references':[row,{**row,'id':'duplicate'}]})


def test_billing_stale_write_is_rejected(client):
    from app.health.billing import account,save
    uid='student-jimin'
    _,before=account(uid)
    assert save(uid,{'state':'refunded'},expected=before)
    assert not save(uid,{'state':'active'},expected=before)
    assert account(uid)[1]['state']=='refunded'


def test_release_evidence_missing_or_stale_is_blocked(tmp_path):
    import importlib.util
    from pathlib import Path
    path=Path(__file__).resolve().parents[2]/'scripts'/'verify-release-evidence.py'
    spec=importlib.util.spec_from_file_location('release_evidence',path);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    assert len(mod.validate({},tmp_path,'free'))==len(mod.BASE)
    assert len(mod.validate({},tmp_path,'plus'))==len(mod.BASE|mod.PAID)


def test_production_billing_checks_actual_webhook_variable():
    from app.services.release_config import validate_production
    config={'APP_ENV':'production','LAUNCH_MODE':'plus','REVENUECAT_SECRET_KEY':'test','REVENUECAT_WEBHOOK_SECRET':'wrong-name','REVENUECAT_PRODUCTS':'test'}
    with pytest.raises(RuntimeError,match='Plus billing credentials required'):validate_production(config)
