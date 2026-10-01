import pytest
from test_health import client, student_headers


def fixture_data():
    from app.health.schemas import HealthUser, BodyCompositionMeasurement, ReferenceRange
    user=HealthUser(id='u',name='Test',gender='female',birth_date='2003-04-02',height=165)
    measurement=BodyCompositionMeasurement(id='m',user_id='u',measurement_date='2026-09-01',height=165,weight=60,skeletal_muscle_mass=24,
        segments=[{'segment':'RIGHT_LEG','lean_mass_kg':7.1,'fat_mass_kg':2.4}])
    reference=ReferenceRange(id='r',gender='female',age_min=20,age_max=24,height_min=155,height_max=170,
        segment='RIGHT_LEG',lean_mean=7.8,fat_mean=2.0,source='study',dataset_id='study-1',
        reference_population='Female adults',sample_size=1200,publication='Registered study',version='1',effective_date='2025-01-01')
    return user,measurement,reference


def test_direction_and_percent():
    from app.health.reference import delta
    assert delta(7.1,7.8)=={'user_value':7.1,'reference_value':7.8,'difference_kg':-.7,'difference_percent':-9.0}
    assert delta(8.2,7.4)['difference_percent']==10.8
    assert delta(0,7.8)['difference_percent']==-100
    assert delta(None,7.8)['difference_kg'] is None
    assert delta(2,0)['difference_percent'] is None


def test_cohort_mean_is_not_inferred_from_percent_or_segment_sum():
    from app.health.reference import average_comparison,selected_group
    u,m,r=fixture_data();g=selected_group(average_comparison(u,m,[r]))
    assert g['segments']['RIGHT_LEG']['lean']['difference_kg']==-.7
    assert g['totals']['skeletal_muscle_mass']['reference_value'] is None
    assert average_comparison(u,m,[])['available'] is False


@pytest.mark.parametrize('change',[{'gender':'male'},{'age_min':30,'age_max':35},{'height_min':180}, {'bmi_min':30},{'weight_min':80},{'unit':'g'},{'effective_date':'2099-01-01'}])
def test_mismatched_cohorts_never_selected(change):
    from app.health.reference import average_comparison
    u,m,r=fixture_data()
    assert not average_comparison(u,m,[r.model_copy(update=change)])['available']


def test_missing_demographics_not_guessed():
    from app.health.reference import average_comparison
    u,m,r=fixture_data()
    assert not average_comparison(u.model_copy(update={'birth_date':None}),m,[r])['available']
    assert not average_comparison(u.model_copy(update={'gender':'unspecified'}),m,[r])['available']


def test_production_rejects_demo_and_missing_provenance(monkeypatch):
    from app.health.reference import average_comparison
    u,m,r=fixture_data();monkeypatch.setenv('APP_ENV','production')
    assert average_comparison(u,m,[r])['available']
    for change in [{'source':'demo'},{'source':'mock'},{'source':'placeholder'},{'sample_size':None},{'dataset_id':None},{'publication':None}]:
        assert not average_comparison(u,m,[r.model_copy(update=change)])['available']


def test_grouping_never_mixes_sources_or_duplicate_regions():
    from app.health.reference import average_comparison
    u,m,r=fixture_data();other=r.model_copy(update={'id':'other','dataset_id':'other','lean_mean':9})
    groups=average_comparison(u,m,[r,other])['groups']
    assert len(groups)==2
    assert not average_comparison(u,m,[r,r.model_copy(update={'id':'duplicate'})])['available']


def test_explicit_total_supported_and_zero_mean_safe():
    from app.health.reference import selected_group,average_comparison
    u,m,r=fixture_data();r=r.model_copy(update={'skeletal_muscle_mean':25,'fat_mean':0})
    g=selected_group(average_comparison(u,m,[r]))
    assert g['totals']['skeletal_muscle_mass']['difference_kg']==-1
    assert g['segments']['RIGHT_LEG']['fat']['difference_percent'] is None


def test_body_map_and_progress_share_selected_reference(client):
    body=client.get('/api/body-map/latest',headers=student_headers()).json()
    assert body['average_comparison']['available']
    assert body['average_comparison']['groups'][0]['metadata']['demo']
    assert body['previous_measurement']['id']==body['previous_measurement_id']
    progress=client.get('/api/progress',headers=student_headers()).json()
    assert progress['average_comparison']['selected_group_id']==body['average_comparison']['selected_group_id']


def test_reference_reason_does_not_inflate_sets():
    from app.health.reference import average_comparison
    from app.health.exercise_engine import build_deterministic_routine
    from app.health.schemas import ExerciseProfile
    u,m,r=fixture_data();p=ExerciseProfile(user_id='u',available_equipment=['dumbbell'])
    plain=build_deterministic_routine('u',m,p,user=u)
    with_reference=build_deterministic_routine('u',m,p,user=u,average=average_comparison(u,m,[r]))
    assert max(ex.sets or 0 for ex in with_reference.exercises)<=max(ex.sets or 0 for ex in plain.exercises)
    assert any('비교군 평균보다' in ex.reason for ex in with_reference.exercises)


def test_invalid_metadata_ranges_rejected():
    from app.health.schemas import ReferenceRange
    from pydantic import ValidationError
    _,_,r=fixture_data()
    for change in [{'lean_mean':-1},{'sample_size':0},{'bmi_min':30,'bmi_max':20},{'effective_date':'no-date'}]:
        with pytest.raises(ValidationError):ReferenceRange(**(r.model_dump()|change))


def test_reference_selection_is_owned_validated_and_persisted(client):
    body=client.get('/api/body-map/latest',headers=student_headers()).json()
    group=body['average_comparison']['selected_group_id']
    assert client.put('/api/body-map/reference-group',headers=student_headers(),json={'group_id':'invented'}).status_code==422
    assert client.put('/api/body-map/reference-group',headers={'X-Synex-Demo-User':'counselor-demo'},json={'group_id':group}).status_code==403
    assert client.put('/api/body-map/reference-group',headers=student_headers(),json={'group_id':group}).status_code==200
    selected=client.get('/api/body-map/latest',headers=student_headers()).json()['average_comparison']
    assert selected['selected_group_id']==group and selected['selection_mode']=='manual'
    assert client.put('/api/body-map/reference-group',headers=student_headers(),json={'group_id':None}).status_code==200


def test_reference_change_marks_old_routine_for_review(client):
    headers=student_headers()
    created=client.post('/api/exercise-routines/generate',headers=headers,json={})
    assert created.status_code==200
    body=client.get('/api/body-map/latest',headers=headers).json()
    from app.health.router import store
    refs=store.list_reference_ranges()
    for r in refs:
        store.add_reference_range(r.model_copy(update={'id':r.id+'-other','dataset_id':'alternative-demo','lean_mean':r.lean_mean*1.1}))
    changed=client.get('/api/body-map/latest',headers=headers).json()
    group=next(g for g in changed['average_comparison']['groups'] if g['id']!=body['average_comparison']['selected_group_id'])
    assert client.put('/api/body-map/reference-group',headers=headers,json={'group_id':group['id']}).status_code==200
    routines=client.get('/api/exercise-routines',headers=headers).json()
    assert routines[0]['needs_review'] and '비교군' in routines[0]['review_reason']
