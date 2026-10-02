from datetime import date
from test_health import client, student_headers


def generate(client):
    response=client.post('/api/exercise-routines/generate',json={},headers=student_headers())
    assert response.status_code==200,response.text
    return response.json()


def payload(r,e):
    return dict(routine_id=r['id'],routine_exercise_id=e['exercise_id'],day_number=e['day_number'],
                exercise_name=e['exercise_name'],date=date.today().isoformat(),mutation_id='sets-1')


def test_sets_persist_replay_and_validate(client):
    r=generate(client);e=next(e for e in r['exercises'] if e['dose_type']=='reps')
    data={**payload(r,e),'sets_completed':99,'set_records':[{'weight_kg':12.5,'reps':10},{'weight_kg':None,'reps':8,'kind':'warmup'}]}
    first=client.post('/api/workouts',json=data,headers=student_headers());assert first.status_code==200,first.text
    w=first.json();assert w['sets_completed']==2 and w['exercise_catalog_id']==e['motion_id']
    assert w['set_records'][0]['weight_kg']==12.5 and w['set_records'][1]['weight_kg'] is None
    again=client.post('/api/workouts',json=data,headers=student_headers());assert again.json()['revision']==1
    assert any(x['id']==w['id'] and x['set_records']==w['set_records'] for x in client.get('/api/workouts',headers=student_headers()).json())
    for invalid in [{'weight_kg':-1,'reps':10},{'weight_kg':10,'reps':1.5},{'weight_kg':10,'reps':1001}]:
        assert client.post('/api/workouts',json={**data,'set_records':[invalid]},headers=student_headers()).status_code==422
    timed=next(e for e in r['exercises'] if e['dose_type']=='duration')
    assert client.post('/api/workouts',json={**payload(r,timed),'set_records':[{'reps':10}]},headers=student_headers()).status_code==422


def test_replacement_preserves_old_plan_and_queued_logs(client):
    r=generate(client);chosen=None
    for e in r['exercises']:
        response=client.get(f"/api/exercise-routines/{r['id']}/alternatives/{e['exercise_id']}",headers=student_headers())
        assert response.status_code==200,response.text
        if response.json():chosen=(e,response.json()[0]);break
    assert chosen,'fixture must have an eligible replacement'
    e,alternative=chosen
    url=f"/api/exercise-routines/{r['id']}/replace/{e['exercise_id']}/{alternative['id']}"
    assert client.post(url,json={},headers=student_headers('student-minsu')).status_code in (403,404)
    response=client.post(url,json={},headers=student_headers());assert response.status_code==200,response.text
    new=response.json();assert new['id']!=r['id']
    assert new['input_snapshot']['replaces_routine_id']==r['id']
    old=client.get(f"/api/exercise-routines/{r['id']}",headers=student_headers()).json()
    assert old['exercises']==r['exercises']
    assert sum(a!=b for a,b in zip(new['exercises'],old['exercises']))==1
    assert client.post('/api/workouts',json=payload(r,e),headers=student_headers()).status_code==200
    assert client.post(url,json={},headers=student_headers()).status_code==409


def test_replacement_cannot_bypass_pain_or_forge_advanced_option(client):
    r=generate(client);e=r['exercises'][0]
    url=f"/api/exercise-routines/{r['id']}/replace/{e['exercise_id']}/barbell_squat"
    assert client.post(url,json={},headers=student_headers()).status_code==422
    assert client.post('/api/workouts',json={**payload(r,e),'pain':3,'completed':False},headers=student_headers()).status_code==200
    assert client.get(f"/api/exercise-routines/{r['id']}/alternatives/{e['exercise_id']}",headers=student_headers()).status_code==409
