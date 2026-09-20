"""Backend tests for Synex Health (section 37 of the product brief): body-composition CRUD,
measurement comparison/balance math, routine JSON validation + fallback, health agent fallback, RBAC.
"""
import os, sys, tempfile
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('SYNEX_HEALTH_DEMO_SEED', 'true')


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('SYNEX_HEALTH_DB_PATH', str(tmp_path / 'health.sqlite3'))
    monkeypatch.setenv('SYNEX_HEALTH_AUTH_SESSION_PATH', str(tmp_path / 'auth.sqlite3'))
    # Reimport fresh so the store picks up the tmp-path DB.
    for mod in list(sys.modules):
        if mod.startswith('app'):
            del sys.modules[mod]
    from starlette.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        yield c


def student_headers(uid='student-jimin'):
    return {'X-Synex-Demo-User': uid}


def counselor_headers():
    return {'X-Synex-Demo-User': 'counselor-demo'}


# --- Body composition CRUD -----------------------------------------------------------------
def test_latest_measurement_is_seeded_demo_data(client):
    r = client.get('/api/body-composition/latest', headers=student_headers())
    assert r.status_code == 200
    data = r.json()
    assert data['source'] == 'mock'
    assert data['measurement_date'] == '2026-06-14'


def test_create_measurement_manual(client):
    payload = {'measurement_date': '2026-09-01', 'weight': 58.0, 'body_fat_percentage': 25.0,
               'segments': [{'segment': 'LEFT_LEG', 'lean_mass_kg': 6.3}]}
    r = client.post('/api/body-composition', headers=student_headers(), json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body['source'] == 'manual'
    assert body['weight'] == 58.0

    r2 = client.get('/api/body-composition/latest', headers=student_headers())
    assert r2.json()['measurement_date'] == '2026-09-01'


def test_csv_import(client):
    csv_text = ('measurement_date,weight,body_fat_percentage,LEFT_LEG_lean_kg,RIGHT_LEG_lean_kg\n'
                '2026-08-01,58.5,25.0,6.0,6.2\n')
    files = {'file': ('measurements.csv', csv_text, 'text/csv')}
    r = client.post('/api/body-composition/import-csv', headers=student_headers(), files=files)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]['source'] == 'csv'
    assert body[0]['weight'] == 58.5
    seg = {s['segment']: s for s in body[0]['segments']}
    assert seg['LEFT_LEG']['lean_mass_kg'] == 6.0


def test_no_fabricated_muscle_fields(client):
    """The schema must not expose any per-muscle field beyond the five measured segments --
    section 6's data-accuracy rule enforced structurally."""
    from app.health.schemas import SegmentMeasurement
    fields = set(SegmentMeasurement.model_fields.keys())
    assert fields == {'segment', 'lean_mass_kg', 'lean_reference_percent', 'fat_mass_kg', 'fat_reference_percent'}


# --- Comparison / balance math ----------------------------------------------------------------
def test_segment_delta_and_balance():
    from app.health.schemas import BodyCompositionMeasurement, SegmentMeasurement, Segment
    from app.health.comparison import segment_delta, left_right_balance, balance_delta_vs

    prev = BodyCompositionMeasurement(id='m1', user_id='u1', measurement_date='2026-01-01',
        segments=[SegmentMeasurement(segment=Segment.LEFT_LEG, lean_mass_kg=5.8),
                  SegmentMeasurement(segment=Segment.RIGHT_LEG, lean_mass_kg=6.2)])
    cur = BodyCompositionMeasurement(id='m2', user_id='u1', measurement_date='2026-04-01',
        segments=[SegmentMeasurement(segment=Segment.LEFT_LEG, lean_mass_kg=6.1),
                  SegmentMeasurement(segment=Segment.RIGHT_LEG, lean_mass_kg=6.3)])

    d = segment_delta(prev, cur, Segment.LEFT_LEG)
    assert d['lean_mass_delta_kg'] == pytest.approx(0.3, abs=1e-6)

    bal_prev = left_right_balance(prev)
    bal_cur = left_right_balance(cur)
    assert bal_prev['leg']['diff_percent'] < 0  # left was lower
    assert abs(bal_cur['leg']['diff_percent']) < abs(bal_prev['leg']['diff_percent'])  # balance improved

    delta = balance_delta_vs(prev, cur)
    assert delta < 0  # improvement = negative change in total asymmetry


def test_comparison_handles_missing_previous_gracefully():
    from app.health.schemas import BodyCompositionMeasurement
    from app.health.comparison import full_comparison
    cur = BodyCompositionMeasurement(id='m1', user_id='u1', measurement_date='2026-01-01', weight=60)
    result = full_comparison(None, cur, {})
    assert result['previous_measurement_id'] is None
    assert result['top_level_deltas']['weight_delta'] is None
    assert result['balance_delta'] is None


def test_body_map_endpoint_end_to_end(client):
    r = client.get('/api/body-map/latest', headers=student_headers())
    assert r.status_code == 200
    data = r.json()
    assert len(data['segment_deltas']) == 5
    assert data['previous_measurement_id'] is not None  # demo has two seeded measurements


def test_body_map_404_without_measurement(client):
    r = client.get('/api/body-composition/latest', headers=student_headers('nobody'))
    assert r.status_code == 404


# --- Routine generation / JSON validation / safety --------------------------------------------
def test_routine_generation_requires_profile(client):
    # student-jimin (the seeded demo account) already has a demo ExerciseProfile -- use a fresh,
    # unseeded demo-mode identity to exercise the "no profile yet" path.
    r = client.post('/api/exercise-routines/generate', headers=student_headers('new-student-1'))
    assert r.status_code == 422


def test_routine_generation_end_to_end(client):
    client.put('/api/exercise-profile', headers=student_headers(),
               json={'goal': 'BALANCE', 'experience_level': 'BEGINNER', 'days_per_week': 3,
                     'minutes_per_session': 40, 'exercise_location': 'gym', 'available_equipment': ['dumbbell']})
    r = client.post('/api/exercise-routines/generate', headers=student_headers())
    assert r.status_code == 200
    routine = r.json()
    assert routine['days_per_week'] == 3
    assert len(routine['exercises']) > 0
    assert routine['generated_by'] == 'deterministic'


def test_safety_screening_blocks_generation(client):
    client.put('/api/exercise-profile', headers=student_headers(), json={'goal': 'BALANCE'})
    client.put('/api/exercise-profile', headers=student_headers(), json={'safety_chest_pain': True})
    r = client.post('/api/exercise-routines/generate', headers=student_headers())
    assert r.status_code == 409
    assert '상담' in r.json()['detail']


def test_llm_json_parse_fallback():
    from app.health.exercise_engine import parse_llm_routine_json
    assert parse_llm_routine_json('not json', 'u1', 'm1') is None
    assert parse_llm_routine_json('{"days": []}', 'u1', 'm1') is None  # no exercises -> treated as invalid
    valid = '{"goal":"g","duration_weeks":4,"days_per_week":2,"reason":"r","days":[{"day":1,"title":"t","exercises":[{"name":"Squat","sets":3,"reps":"10","rest_seconds":60,"reason":"r"}]}]}'
    routine = parse_llm_routine_json(valid, 'u1', 'm1')
    assert routine is not None
    assert routine.generated_by == 'llm'
    assert routine.exercises[0].exercise_name == 'Squat'


# --- Health agent fallback --------------------------------------------------------------------
def test_health_agent_analyze_deterministic_fallback(client, monkeypatch):
    monkeypatch.delenv('ANTHROPIC_API_KEY', raising=False)
    monkeypatch.setenv('HEALTH_AGENT_MODE', 'llm')  # no API key -> must fail closed to deterministic
    r = client.post('/api/health-agent/analyze', headers=student_headers())
    assert r.status_code == 200
    data = r.json()
    assert data['generated_by'] == 'deterministic'
    assert '진단' not in data['summary']


def test_health_agent_never_names_individual_muscles(client):
    r = client.post('/api/health-agent/analyze', headers=student_headers())
    body = r.json()
    banned = ['이두근', '삼두근', '대퇴사두근', '햄스트링']
    text = ' '.join([body['summary'], body['balance_analysis'], body['body_fat_analysis']])
    assert not any(b in text for b in banned)


def test_update_profile_cannot_self_escalate_role(client):
    r = client.put('/api/health/profile', headers=student_headers(), json={'role': 'admin', 'height': 170})
    assert r.status_code == 200
    body = r.json()
    assert body['role'] == 'student'
    assert body['height'] == 170


# --- RBAC ----------------------------------------------------------------------------------------
def test_student_cannot_read_counselor_roster(client):
    r = client.get('/api/counselor/students', headers=student_headers())
    assert r.status_code == 403


def test_counselor_can_read_roster_but_not_write_measurement(client):
    r = client.get('/api/counselor/students', headers=counselor_headers())
    assert r.status_code == 200
    r2 = client.post('/api/body-composition', headers=counselor_headers(),
                      json={'measurement_date': '2026-09-01', 'weight': 60})
    assert r2.status_code == 403


def test_counselor_student_detail(client):
    r = client.get('/api/counselor/students/student-jimin', headers=counselor_headers())
    assert r.status_code == 200
    body = r.json()
    assert body['user']['id'] == 'student-jimin'
    assert body['current_measurement'] is not None


def test_missing_bearer_or_session_in_oidc_mode(client, monkeypatch):
    monkeypatch.setenv('AUTH_MODE', 'oidc')
    r = client.get('/api/health/profile')
    assert r.status_code == 401

# Regression coverage for personalized plans and school isolation.
def test_profile_cannot_overwrite_another_student(client):
    client.put('/api/exercise-profile', headers=student_headers('victim'), json={'goal':'MUSCLE_GAIN'})
    r=client.put('/api/exercise-profile', headers=student_headers(), json={'user_id':'victim','goal':'BALANCE'})
    assert r.status_code==200 and r.json()['user_id']=='student-jimin'
    assert client.get('/api/exercise-profile',headers=student_headers('victim')).json()['goal']=='MUSCLE_GAIN'


def test_missing_balance_is_not_improvement():
    from app.health.schemas import BodyCompositionMeasurement, SegmentMeasurement, Segment
    from app.health.comparison import balance_delta_vs
    old=BodyCompositionMeasurement(id='a',user_id='u',measurement_date='2026-01-01',segments=[
        SegmentMeasurement(segment=Segment.LEFT_ARM,lean_mass_kg=3),SegmentMeasurement(segment=Segment.RIGHT_ARM,lean_mass_kg=2)])
    empty=BodyCompositionMeasurement(id='b',user_id='u',measurement_date='2026-02-01')
    assert balance_delta_vs(old,empty) is None


def test_equal_sides_have_no_weak_side():
    from app.health.schemas import BodyCompositionMeasurement, SegmentMeasurement, Segment
    from app.health.exercise_engine import _weak_segments
    m=BodyCompositionMeasurement(id='a',user_id='u',measurement_date='2026-01-01',segments=[
        SegmentMeasurement(segment=s,lean_mass_kg=3) for s in Segment])
    assert _weak_segments(m)==[]


@pytest.mark.parametrize('patch',[{'days_per_week':0},{'days_per_week':8},{'minutes_per_session':1},{'minutes_per_session':float('inf')}])
def test_profile_validation(client,patch):
    if patch.get('minutes_per_session')==float('inf'):
        patch={'minutes_per_session':'Infinity'}
    assert client.put('/api/exercise-profile',headers=student_headers(),json=patch).status_code==422


@pytest.mark.parametrize('payload',[
    {'measurement_date':'2026-01-01','weight':-20},
    {'measurement_date':'2099-01-01','weight':60},
    {'measurement_date':'2026-01-01','weight':60,'skeletal_muscle_mass':80},
    {'measurement_date':'2026-01-01','body_fat_percentage':120},
    {'measurement_date':'not-a-date'},
])
def test_bad_measurements_rejected(client,payload):
    assert client.post('/api/body-composition',headers=student_headers(),json=payload).status_code==422


def test_csv_batch_rejects_without_partial_import(client):
    before=len(client.get('/api/body-composition').json())
    csv='measurement_date,weight\n2026-08-01,60\n2026-08-02,-2\n'
    r=client.post('/api/body-composition/import-csv',files={'file':('m.csv',csv,'text/csv')})
    assert r.status_code==422
    assert len(client.get('/api/body-composition').json())==before


def test_plan_constraints_time_and_motion_coverage(client):
    from app.health.exercise_catalog import BY_ID
    client.put('/api/exercise-profile',json={'available_equipment':[],'limitations':['무릎 통증'],
        'minutes_per_session':10,'days_per_week':7,'experience_level':'ADVANCED'})
    r=client.post('/api/exercise-routines/generate')
    assert r.status_code==200
    plan=r.json()
    assert all(minutes<=10 for minutes in plan['day_minutes'].values())
    assert len(plan['day_minutes'])==7
    assert all(not BY_ID[e['motion_id']]['equipment'] for e in plan['exercises'])
    assert all('knee' not in BY_ID[e['motion_id']]['avoid'] for e in plan['exercises'])
    assert all(e['instructions'] and e['exercise_id'] for e in plan['exercises'])


def test_weight_and_muscle_change_plan():
    from app.health.schemas import BodyCompositionMeasurement,ExerciseProfile
    from app.health.exercise_engine import build_deterministic_routine
    p=ExerciseProfile(user_id='u',experience_level='INTERMEDIATE',minutes_per_session=40)
    def plan(weight,muscle):
        m=BodyCompositionMeasurement(id='a',user_id='u',measurement_date='2026-01-01',height=175,weight=weight,skeletal_muscle_mass=muscle)
        return build_deterministic_routine('u',m,p)
    normal=plan(70,30);higher_load=plan(110,30);lower_support=plan(70,20)
    assert [(e.motion_id,e.sets) for e in normal.exercises] != [(e.motion_id,e.sets) for e in higher_load.exercises]
    assert [(e.motion_id,e.sets) for e in normal.exercises] != [(e.motion_id,e.sets) for e in lower_support.exercises]


def test_unknown_condition_blocks(client):
    client.put('/api/exercise-profile',json={'limitations':['심장질환']})
    assert client.post('/api/exercise-routines/generate').status_code==409


def test_workout_identity_idempotency_and_pain(client):
    routine=client.post('/api/exercise-routines/generate').json();exercise=routine['exercises'][0]
    from datetime import date
    payload={'routine_id':routine['id'],'routine_exercise_id':exercise['exercise_id'], 'day_number':exercise['day_number'],
             'date':date.today().isoformat(),'exercise_name':exercise['exercise_name'],'difficulty':'moderate'}
    assert client.post('/api/workouts',json=payload,headers=student_headers('other')).status_code==404
    a=client.post('/api/workouts',json=payload).json();b=client.post('/api/workouts',json=payload).json()
    assert a['id']==b['id']
    assert len(client.get('/api/workouts').json())==1
    payload.update(difficulty='pain',completed=False)
    assert client.post('/api/workouts',json=payload).status_code==200
    assert client.post('/api/exercise-routines/generate').status_code==409


def test_remeasurement_regenerates_routine(client):
    before=client.post('/api/exercise-routines/generate').json()
    response=client.post('/api/body-composition',json={'measurement_date':'2026-09-01','weight':58,'height':165,'skeletal_muscle_mass':18})
    assert response.status_code==200
    latest=client.get('/api/exercise-routines').json()[0]
    assert latest['id']!=before['id']
    assert latest['based_on_measurement_id']==response.json()['id']
    assert '증량을 보류' in latest['progression']


def test_school_change_and_consent_isolate_all_routes(client):
    from app.health.router import store
    from app.health.schemas import HealthUser
    from app.services.auth import DEMO_USERS
    store.upsert_user(HealthUser(id='other-counselor',name='Other',role='counselor',school_id='snu'))
    DEMO_USERS['other-counselor']={'role':'counselor'}
    routine=client.post('/api/exercise-routines/generate').json()
    measurement=client.get('/api/body-composition/latest').json()
    paths=['/api/counselor/students/student-jimin',f"/api/body-composition/{measurement['id']}",f"/api/exercise-routines/{routine['id']}"]
    for path in paths:
        assert client.get(path,headers=student_headers('other-counselor')).status_code==404
        assert client.get(path,headers=counselor_headers()).status_code==200
    assert client.post('/api/counselor/students/student-jimin/notes',json={'note':'x'},headers=student_headers('other-counselor')).status_code==404
    assert client.put('/api/health/school',json={'school_id':'yonsei-mirae','share_with_center':False}).status_code==200
    for path in paths:
        assert client.get(path,headers=counselor_headers()).status_code==404
    assert client.get('/api/counselor/students',headers=counselor_headers()).json()==[]
    assert client.put('/api/health/school',json={'school_id':'snu','share_with_center':True}).status_code==200
    for path in paths:
        assert client.get(path,headers=counselor_headers()).status_code==404
        assert client.get(path,headers=student_headers('other-counselor')).status_code==200


def test_gender_reaches_body_map_and_seed_does_not_reset(client):
    from app.health.demo_seed import seed_demo_data
    from app.health.router import store
    assert client.put('/api/health/profile',json={'gender':'male'}).status_code==200
    seed_demo_data(store)
    assert client.get('/api/body-map/latest').json()['body_profile']['gender']=='male'
    assert client.put('/api/health/profile',json={'gender':'female'}).status_code==200
    assert client.get('/api/body-map/latest').json()['body_profile']['gender']=='female'
    assert client.put('/api/health/profile',json={'gender':'invalid'}).status_code==422


def test_school_directory_and_request(client):
    schools=client.get('/api/schools').json()
    assert any(s['id']=='yonsei-mirae' for s in schools)
    assert all(s['integration_status']=='not_connected' for s in schools)
    assert client.post('/api/schools/request',json={'name':'새 학교'}).status_code==200
    assert client.get('/api/admin/school-requests').status_code==403
    assert client.get('/api/admin/school-requests',headers=student_headers('admin-demo')).json()[0]['name']=='새 학교'


def test_admin_registers_school_and_assigns_counselor(client):
    admin=student_headers('admin-demo')
    school={'id':'new-campus','name':'추가 대학','region':'서울'}
    assert client.post('/api/admin/schools',json=school).status_code==403
    assert client.post('/api/admin/schools',json=school,headers=admin).status_code==200
    assert any(s['id']=='new-campus' for s in client.get('/api/schools').json())
    assert client.put('/api/admin/counselors/counselor-demo/school',json={'school_id':'new-campus'},headers=admin).status_code==200
    assert client.get('/api/counselor/students',headers=counselor_headers()).json()==[]


def test_profile_change_marks_plan_stale(client):
    client.post('/api/exercise-routines/generate')
    assert not client.get('/api/exercise-routines').json()[0]['needs_review']
    client.put('/api/exercise-profile',json={'minutes_per_session':10})
    assert client.get('/api/exercise-routines').json()[0]['needs_review']
    client.post('/api/exercise-routines/generate')
    assert not client.get('/api/exercise-routines').json()[0]['needs_review']


def test_low_weight_does_not_get_fat_loss_plan():
    from app.health.schemas import BodyCompositionMeasurement,ExerciseProfile
    from app.health.exercise_engine import build_deterministic_routine
    m=BodyCompositionMeasurement(id='a',user_id='u',measurement_date='2026-01-01',height=170,weight=45,skeletal_muscle_mass=20)
    p=ExerciseProfile(user_id='u',goal='FAT_MANAGEMENT')
    result=build_deterministic_routine('u',m,p)
    assert '상담 우선' in result.goal
    assert any('감량 중심 구성을 적용하지 않습니다' in n for n in result.notices)
