"""API routes for Synex Health (section 35 of the product brief). Mounted under /api in main.py.

Every write path uses the demo-mode X-Synex-Demo-User identity switch from services/auth.py --
students only ever touch their own data (require_self_or_counselor), counselors get read-only roster
access plus their own notes, admin gets reference-range management.
"""
from __future__ import annotations
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import ValidationError
from datetime import date
import hashlib
from .schools import BY_ID as SCHOOL_DIRECTORY, SchoolSelection, SchoolRequest, SchoolCreate, CounselorAssignment, body_model_profile

from ..services.auth import User, get_current_user, require
from ..services.audit import AuditStore
from .schemas import (
    HealthUser, BodyCompositionCreateRequest, BodyCompositionMeasurement, ExerciseProfile,
    ExerciseRoutine, WorkoutLog, WorkoutLogCreateRequest, HealthAgentChatRequest, CounselorNoteCreateRequest,
    ReferenceRange, Segment,
)
from .store import HealthStore, new_id, now
from .providers.manual import ManualProvider
from .providers.csv_provider import CSVProvider
from . import comparison as cmp
from . import health_agent
from .exercise_engine import safety_screen_failed, build_deterministic_routine, PlanBlocked

router = APIRouter(prefix='/api')
store = HealthStore()
audit = AuditStore()  # append-only write-event log (section 34) -- reused from SynexAgent's shape


def _ranges_for(user: HealthUser) -> dict[Segment, ReferenceRange]:
    age = None
    if user.birth_date:
        try:
            from datetime import date
            b = date.fromisoformat(user.birth_date)
            today = date.today()
            age = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
        except Exception:
            age = None
    out = {}
    for seg in Segment:
        r = store.find_reference(gender=user.gender, age=age, height=user.height, segment=seg)
        if r:
            out[seg] = r
    return out


def _require_user_record(user_id: str) -> HealthUser:
    u = store.get_user(user_id)
    if u is None:
        raise HTTPException(404, 'User not found')
    return u


def _can_access_student(actor, student):
    if actor.role == 'admin':
        return actor.id == student.id
    if actor.role == 'student':
        return actor.id == student.id
    counselor = store.get_user(actor.id)
    return bool(counselor and counselor.school_id and student.school_id == counselor.school_id
                and student.share_with_center and student.role == 'student'
                and (os.getenv('AUTH_MODE','demo')=='demo' or (store.preference(student.id,'membership',{}).get('verified') and store.preference(student.id,'membership',{}).get('school_id')==student.school_id)))


def _require_student_access(actor, student_id):
    student = store.get_user(student_id)
    if student is None or not _can_access_student(actor, student):
        raise HTTPException(404, '공유 권한이 있는 학생 데이터가 없습니다.')
    return student


def _school_directory():
    return {**SCHOOL_DIRECTORY, **{s['id']: s for s in store.list_schools()}}


@router.post('/admin/schools')
def register_school(req: SchoolCreate, user: User = Depends(require('user:admin'))):
    if req.id in _school_directory():
        raise HTTPException(409, '이미 등록된 학교 ID입니다.')
    school = {**req.model_dump(), 'integration_status': 'not_connected', 'membership_status': 'self_reported',
              'integration_message': '학교 건강센터·SSO·측정장비 시스템은 아직 연결되지 않았습니다.'}
    store.register_school(school)
    audit.record(user.id, 'school_registered', {'school_id': req.id}, user_id=user.id, role=user.role)
    return school


@router.put('/admin/counselors/{counselor_id}/school')
def assign_counselor(counselor_id: str, req: CounselorAssignment, user: User = Depends(require('user:admin'))):
    if req.school_id not in _school_directory():
        raise HTTPException(422, '등록된 학교를 선택하세요.')
    counselor = _require_user_record(counselor_id)
    if counselor.role != 'counselor':
        raise HTTPException(422, '상담사 계정에만 학교를 배정할 수 있습니다.')
    counselor.school_id = req.school_id
    store.upsert_user(counselor)
    audit.record(counselor_id, 'counselor_school_assigned', {'school_id': req.school_id}, user_id=user.id, role=user.role)
    return counselor


@router.get('/schools')
def schools(user: User = Depends(require('health:read'))):
    return list(_school_directory().values())


@router.put('/health/school')
def select_school(req: SchoolSelection, user: User = Depends(require('health:write'))):
    u = _require_user_record(user.id)
    if user.role != 'student':
        raise HTTPException(403, '상담사 소속 학교는 관리자가 지정합니다.')
    if req.school_id is not None and req.school_id not in _school_directory():
        raise HTTPException(422, '목록에서 학교를 선택하세요.')
    if req.share_with_center and not req.school_id:
        raise HTTPException(422, '학교를 먼저 선택하세요.')
    changed = u.school_id != req.school_id
    if changed:
        store.save_preference(user.id,'membership',{})
    u.school_id = req.school_id
    u.share_with_center = req.share_with_center
    store.upsert_user(u)
    with store.connect() as db:
        db.execute('INSERT INTO consent_history VALUES (?,?,?,?,?)',(new_id('CONSENT'),user.id,req.school_id,int(req.share_with_center),now()))
    audit.record(user.id, 'school_sharing_updated', {'school_id': req.school_id, 'shared': req.share_with_center}, user_id=user.id, role=user.role)
    return u


@router.post('/schools/request')
def request_school(req: SchoolRequest, user: User = Depends(require('health:write'))):
    if len(req.name.strip()) < 2:
        raise HTTPException(422, '학교명을 입력하세요.')
    store.request_school(user.id, req.name.strip())
    return {'status': 'requested', 'message': '학교 추가 요청을 저장했습니다. 관리자가 확인 후 등록합니다.'}


@router.get('/admin/school-requests')
def school_requests(user: User = Depends(require('user:admin'))):
    return store.list_school_requests()


# --- Profile ---------------------------------------------------------------------------------
@router.get('/health/profile')
def get_profile(user: User = Depends(require('health:read'))):
    u = store.get_user(user.id)
    if u is None:
        u = store.upsert_user(HealthUser(id=user.id, name='사용자', role=user.role))
    return u


@router.put('/health/profile')
def update_profile(patch: dict, user: User = Depends(require('health:write'))):
    u = _require_user_record(user.id)
    protected = {'id', 'role', 'created_at', 'school_id', 'share_with_center'}  # a student may edit their own display info, never their role
    merged = {**u.model_dump(), **{k: v for k, v in patch.items() if k in HealthUser.model_fields and k not in protected and v is not None}}
    try:
        updated = HealthUser(**merged)
    except ValidationError:
        raise HTTPException(422, '프로필 입력값을 확인하세요.')
    return store.upsert_user(updated)


# --- Body composition --------------------------------------------------------------------------
@router.get('/body-composition')
def list_body_composition(user: User = Depends(require('measurement:read'))):
    return store.list_measurements(user.id)


@router.post('/body-composition')
def create_body_composition(req: BodyCompositionCreateRequest, user: User = Depends(require('measurement:write'))):
    provider = ManualProvider(store)
    m = provider.import_measurement(user.id, req.model_dump())
    # Audit records WHAT happened (ids/metadata) never the health values themselves -- see
    # docs/DATA_ACCURACY.md / section 34's "로그에 건강정보 직접 출력 금지".
    audit.record(user.id, 'measurement_created', {'measurement_id': m.id, 'source': m.source}, user_id=user.id, role=user.role)
    _regenerate_after_measurement(user, m.id)
    return m


@router.post('/body-composition/import-csv')
def import_body_composition_csv(file: UploadFile = File(...), user: User = Depends(require('measurement:write'))):
    raw = file.file.read(2_000_001)
    if len(raw) > 2_000_000:
        raise HTTPException(413, 'CSV 파일은 2MB 이하로 업로드하세요.')
    try:
        result = CSVProvider(store).import_csv(user.id, raw.decode('utf-8-sig'))
    except (ValueError, UnicodeError, KeyError):
        raise HTTPException(422, 'CSV 날짜, 열 이름, 숫자 범위를 확인하세요. 저장하지 않았습니다.')
    if result:
        _regenerate_after_measurement(user, store.latest_measurement(user.id).id)
    audit.record(user.id, 'measurements_imported', {'count': len(result)}, user_id=user.id, role=user.role)
    return result


@router.get('/body-composition/latest')
def latest_body_composition(user: User = Depends(require('measurement:read'))):
    m = store.latest_measurement(user.id)
    if m is None:
        raise HTTPException(404, '등록된 측정 데이터가 없습니다.')
    return m


@router.get('/body-composition/{measurement_id}')
def get_body_composition(measurement_id: str, user: User = Depends(require('measurement:read'))):
    m = store.get_measurement(measurement_id)
    if m is None:
        raise HTTPException(404, 'Measurement not found')
    _require_student_access(user, m.user_id)
    return m


# --- Body map ------------------------------------------------------------------------------------
@router.get('/body-map/latest')
def body_map_latest(user: User = Depends(require('measurement:read'))):
    u = _require_user_record(user.id)
    current = store.latest_measurement(user.id)
    if current is None:
        raise HTTPException(404, '등록된 측정 데이터가 없습니다.')
    previous = store.previous_measurement(user.id, current.id)
    ranges = _ranges_for(u)
    return {**cmp.full_comparison(previous, current, ranges), 'body_profile': body_model_profile(u), 'measurement': current}


@router.get('/body-map/comparison')
def body_map_comparison(user: User = Depends(require('measurement:read'))):
    return body_map_latest(user)  # same payload; kept as a distinct route per the spec's API list


# --- Progress -------------------------------------------------------------------------------------
@router.get('/progress')
def progress(user: User = Depends(require('measurement:read'))):
    items = store.list_measurements(user.id)
    workouts = store.list_workouts(user.id)
    weeks={}
    for w in workouts:
        d=date.fromisoformat(w.date);key=(d-__import__('datetime').timedelta(days=d.weekday())).isoformat()
        row=weeks.setdefault(key,{'date':key,'total':0,'completed':0});row['total']+=1;row['completed']+=int(w.completed)
    for row in weeks.values():row['completion']=round(row['completed']/row['total']*100,1)
    return {'workout_weeks':sorted(weeks.values(),key=lambda w:w['date']),'measurements': items, 'workout_count': len(workouts),
            'completed_workout_count': sum(1 for w in workouts if w.completed)}


# --- Health Agent --------------------------------------------------------------------------------
@router.post('/health-agent/analyze')
def health_agent_analyze(user: User = Depends(require('agent:chat'))):
    u = _require_user_record(user.id)
    current = store.latest_measurement(user.id)
    if current is None:
        raise HTTPException(404, '분석할 측정 데이터가 없습니다. 먼저 체성분 데이터를 등록해 주세요.')
    previous = store.previous_measurement(user.id, current.id)
    ranges = _ranges_for(u)
    analysis = health_agent.analyze(u, current, previous, ranges)
    store.add_analysis(analysis)
    return analysis


@router.post('/health-agent/chat')
def health_agent_chat(req: HealthAgentChatRequest, user: User = Depends(require('agent:chat'))):
    u = _require_user_record(user.id)
    latest = store.latest_measurement(user.id)
    profile = store.get_profile(user.id)
    context = {'latest_measurement': latest.model_dump(mode='json') if latest else None,
               'profile': profile.model_dump(mode='json') if profile else None,
               'comparison':cmp.full_comparison(store.previous_measurement(user.id,latest.id),latest,{}) if latest else None,
               'routine':store.latest_routine(user.id).model_dump(mode='json') if store.latest_routine(user.id) else None}
    reply = health_agent.chat(u, req.message, context)
    return {'reply': reply}


# --- Exercise profile + routines ----------------------------------------------------------------
@router.get('/exercise-profile')
def get_exercise_profile(user: User = Depends(require('routine:read'))):
    p = store.get_profile(user.id)
    return p or ExerciseProfile(user_id=user.id)


@router.put('/exercise-profile')
def update_exercise_profile(patch: dict, user: User = Depends(require('routine:write'))):
    existing = store.get_profile(user.id) or ExerciseProfile(user_id=user.id)
    merged = {**existing.model_dump(), **{k: v for k, v in patch.items() if k in ExerciseProfile.model_fields and k != 'user_id'}}
    merged['user_id'] = user.id
    try:
        updated = ExerciseProfile(**merged)
    except ValidationError:
        raise HTTPException(422, '운동 일수는 1–7일, 시간은 10–180분으로 입력하고 운동환경을 확인하세요.')
    return store.upsert_profile(updated)


@router.get('/exercise-routines')
def list_exercise_routines(user: User = Depends(require('routine:read'))):
    routines = store.list_routines(user.id)
    measurement = store.latest_measurement(user.id)
    profile = store.get_profile(user.id)
    result = []
    for routine in routines:
        reason = None
        if measurement and routine.based_on_measurement_id != measurement.id:
            reason = '새 측정값이 등록되었습니다. 운동 계획을 다시 생성하세요.'
        elif profile and routine.input_snapshot.get('profile') and routine.input_snapshot['profile'] != profile.model_dump(mode='json'):
            reason = '운동 프로필이 변경되었습니다. 변경된 조건으로 계획을 다시 생성하세요.'
        result.append({**routine.model_dump(mode='json'), 'needs_review': bool(reason), 'review_reason': reason})
    return result


@router.post('/exercise-routines/generate')
def generate_exercise_routine(user: User = Depends(require('routine:write'))):
    profile = store.get_profile(user.id)
    if profile is None:
        raise HTTPException(422, '운동 프로필을 먼저 입력해 주세요 (/health/profile).')
    if safety_screen_failed(profile):
        raise HTTPException(409, '건강센터 또는 의료전문가와 상담 후 운동계획을 설정하세요.')
    measurement = store.latest_measurement(user.id)
    if measurement is None:
        raise HTTPException(404, '체성분 측정 데이터가 없어 루틴을 생성할 수 없습니다.')
    # Adaptive regeneration (section 22): when there's both a prior measurement AND a prior routine,
    # this is a re-measurement-triggered regen, not a first-time generation -- feed the measured
    # change back in as change_note so the new routine's summary explains *why* it differs.
    previous_measurement = store.previous_measurement(user.id, measurement.id)
    previous_routine = store.latest_routine(user.id)
    change_note = cmp.describe_change(previous_measurement, measurement) if (previous_measurement and previous_routine) else ''

    try:
        routine = build_deterministic_routine(user.id, measurement, profile, change_note=change_note,
            previous_measurement=previous_measurement, previous_routine=previous_routine,
            workouts=store.list_workouts(user.id), user=store.get_user(user.id))
    except PlanBlocked as exc:
        raise HTTPException(409, str(exc))

    store.add_routine(routine)
    audit.record(user.id, 'routine_generated', {'routine_id': routine.id, 'generated_by': routine.generated_by,
                 'adaptive': bool(change_note)}, user_id=user.id, role=user.role)
    return routine


def _regenerate_after_measurement(user, measurement_id):
    prior = store.latest_routine(user.id)
    latest = store.latest_measurement(user.id)
    if not prior or not latest or latest.id != measurement_id or prior.based_on_measurement_id == latest.id:
        return
    try:
        generate_exercise_routine(user)
    except HTTPException as exc:
        if exc.status_code not in (404, 409, 422):
            raise
        # Keep the imported measurement even when a new plan is blocked by screening.
        audit.record(user.id, 'routine_regeneration_blocked', {'status': exc.status_code}, user_id=user.id, role=user.role)


@router.get('/exercise-routines/{routine_id}')
def get_exercise_routine(routine_id: str, user: User = Depends(require('routine:read'))):
    r = store.get_routine(routine_id)
    if r is None:
        raise HTTPException(404, 'Routine not found')
    _require_student_access(user, r.user_id)
    return r


# --- Workouts --------------------------------------------------------------------------------------
@router.post('/workouts')
def create_workout(req: WorkoutLogCreateRequest, user: User = Depends(require('workout:write'))):
    try:
        logged_date = date.fromisoformat(req.date)
    except ValueError:
        raise HTTPException(422, '운동 날짜를 확인하세요.')
    if logged_date > date.today():
        raise HTTPException(422, '미래 운동 기록은 저장할 수 없습니다.')
    routine = store.get_routine(req.routine_id) if req.routine_id else None
    if routine is None or routine.user_id != user.id:
        raise HTTPException(404, '본인의 운동 루틴을 선택하세요.')
    if logged_date < date.fromisoformat(routine.created_at[:10]):
        raise HTTPException(422, '루틴 생성 전 날짜로 기록할 수 없습니다.')
    matching = [e for e in routine.exercises if
                (e.exercise_id == req.routine_exercise_id if req.routine_exercise_id else e.exercise_name == req.exercise_name)
                and (req.day_number is None or e.day_number == req.day_number)]
    if len(matching) != 1:
        raise HTTPException(422, '루틴의 운동과 Day를 정확히 선택하세요.')
    exercise = matching[0]
    payload = req.model_dump()
    payload.update(exercise_name=exercise.exercise_name, day_number=exercise.day_number,
                   routine_exercise_id=exercise.exercise_id)
    # Stable key + INSERT OR REPLACE: retries and feedback edits do not inflate completion rate.
    key = f'{user.id}|{routine.id}|{logged_date}|{exercise.day_number}|{exercise.exercise_id or exercise.exercise_name}'
    w = WorkoutLog(id='WORKOUT-' + hashlib.sha256(key.encode()).hexdigest()[:24], user_id=user.id, created_at=now(), **payload)
    store.add_workout(w)
    audit.record(user.id, 'workout_logged', {'workout_id': w.id, 'routine_id': w.routine_id, 'completed': w.completed},
                 user_id=user.id, role=user.role)
    return w


@router.get('/workouts')
def list_workouts(user: User = Depends(require('workout:read'))):
    return store.list_workouts(user.id)


# --- Counselor -------------------------------------------------------------------------------------
@router.get('/counselor/students')
def counselor_students(user: User = Depends(require('roster:read'))):
    students = [s for s in store.list_students() if _can_access_student(user, s)]
    out = []
    for s in students:
        current = store.latest_measurement(s.id)
        previous = store.previous_measurement(s.id, current.id) if current else None
        workouts = store.list_workouts(s.id)
        routine = store.latest_routine(s.id)
        completion = None
        if routine:
            # Current ISO week only, one completion per scheduled slot.
            today = date.today()
            week_start = today - __import__('datetime').timedelta(days=today.weekday())
            planned = len(routine.exercises)
            valid = {(e.day_number, e.exercise_id or e.exercise_name) for e in routine.exercises}
            done_slots = {(w.day_number, w.routine_exercise_id or w.exercise_name) for w in workouts
                          if w.routine_id == routine.id and w.completed
                          and week_start.isoformat() <= w.date <= today.isoformat()}
            completion = round(len(done_slots & valid) / planned * 100, 1) if planned else None
        needs_remeasurement = current is None or _days_since(current.measurement_date) > 56
        out.append({'id': s.id, 'name': s.name, 'latest_measurement_date': current.measurement_date if current else None,
                     'skeletal_muscle_mass': current.skeletal_muscle_mass if current else None,
                     'body_fat_percentage': current.body_fat_percentage if current else None,
                     'body_fat_percentage_delta': cmp.top_level_deltas(previous, current).get('body_fat_percentage_delta') if current else None,
                     'routine_completion_percent': completion, 'needs_remeasurement': needs_remeasurement})
    return out


def _days_since(iso_date: str) -> int:
    from datetime import date
    try:
        return (date.today() - date.fromisoformat(iso_date)).days
    except Exception:
        return 0


@router.get('/counselor/students/{student_id}')
def counselor_student_detail(student_id: str, user: User = Depends(require('roster:read'))):
    u = _require_student_access(user, student_id)
    current = store.latest_measurement(student_id)
    previous = store.previous_measurement(student_id, current.id) if current else None
    ranges = _ranges_for(u)
    comparison = cmp.full_comparison(previous, current, ranges) if current else None
    analysis = store.latest_analysis(student_id)
    routines = store.list_routines(student_id)
    workouts = store.list_workouts(student_id)
    if comparison is not None:
        comparison['body_profile'] = body_model_profile(u)
    notes = [n for n in store.list_counselor_notes(student_id) if n.school_id == u.school_id]
    profile = store.get_profile(student_id)
    return {'user': u, 'current_measurement': current, 'previous_measurement': previous,
            'comparison': comparison, 'latest_analysis': analysis, 'routines': routines,
            'workouts': workouts, 'counselor_notes': notes, 'exercise_profile': profile}


@router.post('/counselor/students/{student_id}/notes')
def add_counselor_note(student_id: str, req: CounselorNoteCreateRequest,
                         user: User = Depends(require('counselor_note:write'))):
    from .schemas import CounselorNote
    student = _require_student_access(user, student_id)
    note = CounselorNote(id=new_id('NOTE'), student_id=student_id, counselor_id=user.id, note=req.note, school_id=student.school_id, created_at=now())
    store.add_counselor_note(note)
    audit.record(student_id, 'counselor_note_added', {'note_id': note.id, 'counselor_id': user.id},
                 user_id=user.id, role=user.role)
    return note


# --- Admin: reference ranges -------------------------------------------------------------------------
@router.get('/admin/reference-ranges')
def list_reference_ranges(user: User = Depends(require('reference_range:write'))):
    return store.list_reference_ranges()


@router.post('/admin/reference-ranges')
def create_reference_range(r: ReferenceRange, user: User = Depends(require('reference_range:write'))):
    return store.add_reference_range(r)
