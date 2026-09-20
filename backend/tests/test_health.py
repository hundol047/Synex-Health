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
