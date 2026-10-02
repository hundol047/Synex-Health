from datetime import datetime, timezone
from test_health import client


def test_korean_midnight_boundary_and_timezone_validation(client, monkeypatch):
    from app.health import workout_rules
    from app.health.router import store
    r=client.post('/api/exercise-routines/generate').json()
    routine=store.get_routine(r['id']);routine.created_at='2026-10-01T15:30:00+00:00';store.add_routine(routine)
    class Frozen(datetime):
        @classmethod
        def now(cls, tz=None):return datetime(2026,10,1,16,0,tzinfo=timezone.utc)
    monkeypatch.setattr(workout_rules,'datetime',Frozen)
    e=r['exercises'][0]
    body=dict(routine_id=r['id'],routine_exercise_id=e['exercise_id'],exercise_name=e['exercise_name'],day_number=e['day_number'],date='2026-10-02',time_zone='Asia/Seoul',sets_completed=0)
    assert client.post('/api/workouts',json=body).status_code==200
    assert client.post('/api/workouts',json={**body,'date':'2026-10-03'}).status_code==422
    assert client.post('/api/workouts',json={**body,'date':'2026-10-01'}).status_code==422
    assert client.post('/api/workouts',json={**body,'time_zone':'invalid/zone'}).status_code==422


def test_performance_states_cannot_be_forged():
    from app.health.schemas import WorkoutLogCreateRequest, RoutineExercise
    from app.health.workout_rules import completion
    def req(**kw):return WorkoutLogCreateRequest(date='2026-10-02',exercise_name='test',**kw)
    ex=RoutineExercise(day_number=1,exercise_name='test',sets=3)
    assert completion(req(sets_completed=0,completed=True),ex)=='not_started'
    assert completion(req(sets_completed=1,completed=True),ex)=='partial'
    assert completion(req(sets_completed=3,completed=True),ex)=='completed'
    assert completion(req(sets_completed=3,pain=2),ex)=='stopped'
    assert completion(req(set_records=[{'reps':0},{'reps':12,'kind':'warmup'}]),ex)=='not_started'
    hold=ex.model_copy(update={'dose_type':'hold','hold_seconds':30,'sets':2})
    assert completion(req(timed_sets_seconds=[30,10]),hold)=='partial'
    assert completion(req(timed_sets_seconds=[30,30]),hold)=='completed'
    duration=ex.model_copy(update={'dose_type':'duration','duration':'5분'})
    assert completion(req(performed_seconds=60),duration)=='partial'
    assert completion(req(performed_seconds=300),duration)=='completed'
