"""API routes for Synex Health (section 35 of the product brief). Mounted under /api in main.py.

Every write path uses the demo-mode X-Synex-Demo-User identity switch from services/auth.py --
students only ever touch their own data (require_self_or_counselor), counselors get read-only roster
access plus their own notes, admin gets reference-range management.
"""
from __future__ import annotations
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

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
from .exercise_engine import safety_screen_failed, build_deterministic_routine, parse_llm_routine_json

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


# --- Profile ---------------------------------------------------------------------------------
@router.get('/health/profile')
def get_profile(user: User = Depends(require('health:read'))):
    u = _require_user_record(user.id)
    return u


@router.put('/health/profile')
def update_profile(patch: dict, user: User = Depends(require('health:write'))):
    u = _require_user_record(user.id)
    protected = {'id', 'role', 'created_at'}  # a student may edit their own display info, never their role
    merged = {**u.model_dump(), **{k: v for k, v in patch.items() if k in HealthUser.model_fields and k not in protected and v is not None}}
    updated = HealthUser(**merged)
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
    return m


@router.post('/body-composition/import-csv')
def import_body_composition_csv(file: UploadFile = File(...), user: User = Depends(require('measurement:write'))):
    text = file.file.read().decode('utf-8')
    return CSVProvider(store).import_csv(user.id, text)


@router.get('/body-composition/latest')
def latest_body_composition(user: User = Depends(require('measurement:read'))):
    m = store.latest_measurement(user.id)
    if m is None:
        raise HTTPException(404, '등록된 측정 데이터가 없습니다.')
    return m


@router.get('/body-composition/{measurement_id}')
def get_body_composition(measurement_id: str, user: User = Depends(require('measurement:read'))):
    m = store.get_measurement(measurement_id)
    if m is None or (user.role == 'student' and m.user_id != user.id):
        raise HTTPException(404, 'Measurement not found')
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
    return cmp.full_comparison(previous, current, ranges)


@router.get('/body-map/comparison')
def body_map_comparison(user: User = Depends(require('measurement:read'))):
    return body_map_latest(user)  # same payload; kept as a distinct route per the spec's API list


# --- Progress -------------------------------------------------------------------------------------
@router.get('/progress')
def progress(user: User = Depends(require('measurement:read'))):
    items = store.list_measurements(user.id)
    workouts = store.list_workouts(user.id)
    return {'measurements': items, 'workout_count': len(workouts),
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
               'profile': profile.model_dump(mode='json') if profile else None}
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
    merged = {**existing.model_dump(), **{k: v for k, v in patch.items() if k in ExerciseProfile.model_fields}}
    updated = ExerciseProfile(**merged)
    return store.upsert_profile(updated)


@router.get('/exercise-routines')
def list_exercise_routines(user: User = Depends(require('routine:read'))):
    return store.list_routines(user.id)


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

    routine = None
    if health_agent.agent_mode() == 'llm':
        prompt = health_agent._load_prompt('exercise_generation.md')
        import json as _json
        context = _json.dumps({'measurement': measurement.model_dump(mode='json'), 'profile': profile.model_dump(mode='json'),
                                'previous_routine': previous_routine.model_dump(mode='json') if previous_routine else None,
                                'change_note': change_note}, ensure_ascii=False, default=str)
        raw = health_agent._call_anthropic(prompt, context)
        if raw:
            routine = parse_llm_routine_json(raw[raw.index('{'):raw.rindex('}') + 1] if '{' in raw else raw,
                                              user.id, measurement.id)
    if routine is None:
        routine = build_deterministic_routine(user.id, measurement, profile, change_note=change_note)
    store.add_routine(routine)
    audit.record(user.id, 'routine_generated', {'routine_id': routine.id, 'generated_by': routine.generated_by,
                 'adaptive': bool(change_note)}, user_id=user.id, role=user.role)
    return routine


@router.get('/exercise-routines/{routine_id}')
def get_exercise_routine(routine_id: str, user: User = Depends(require('routine:read'))):
    r = store.get_routine(routine_id)
    if r is None or (user.role == 'student' and r.user_id != user.id):
        raise HTTPException(404, 'Routine not found')
    return r


# --- Workouts --------------------------------------------------------------------------------------
@router.post('/workouts')
def create_workout(req: WorkoutLogCreateRequest, user: User = Depends(require('workout:write'))):
    w = WorkoutLog(id=new_id('WORKOUT'), user_id=user.id, created_at=now(), **req.model_dump())
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
    students = store.list_students()
    out = []
    for s in students:
        current = store.latest_measurement(s.id)
        previous = store.previous_measurement(s.id, current.id) if current else None
        workouts = store.list_workouts(s.id)
        routine = store.latest_routine(s.id)
        completion = None
        if routine:
            planned = len(routine.exercises)
            done = sum(1 for w in workouts if w.routine_id == routine.id and w.completed)
            completion = round(done / planned * 100, 1) if planned else None
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
    u = _require_user_record(student_id)
    current = store.latest_measurement(student_id)
    previous = store.previous_measurement(student_id, current.id) if current else None
    ranges = _ranges_for(u)
    comparison = cmp.full_comparison(previous, current, ranges) if current else None
    analysis = store.latest_analysis(student_id)
    routines = store.list_routines(student_id)
    workouts = store.list_workouts(student_id)
    notes = store.list_counselor_notes(student_id)
    profile = store.get_profile(student_id)
    return {'user': u, 'current_measurement': current, 'previous_measurement': previous,
            'comparison': comparison, 'latest_analysis': analysis, 'routines': routines,
            'workouts': workouts, 'counselor_notes': notes, 'exercise_profile': profile}


@router.post('/counselor/students/{student_id}/notes')
def add_counselor_note(student_id: str, req: CounselorNoteCreateRequest,
                         user: User = Depends(require('counselor_note:write'))):
    from .schemas import CounselorNote
    note = CounselorNote(id=new_id('NOTE'), student_id=student_id, counselor_id=user.id, note=req.note, created_at=now())
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
