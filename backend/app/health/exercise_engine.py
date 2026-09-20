"""Personalized exercise routine engine (sections 19-22 of the product brief).

Two entry points:
  - generate_routine(): builds a routine from body composition + segment balance + ExerciseProfile.
    Tries the LLM path (health_agent.generate_routine_llm) when HEALTH_AGENT_MODE=llm and an API key
    is configured; always has a deterministic fallback (build_deterministic_routine) so the feature
    works with zero external configuration, and so a JSON-parsing failure from the LLM never breaks
    the flow (section 20: "JSON parsing에 실패하면 fallback validation을 적용한다").
  - regenerate_after_remeasurement(): adaptive routine regen (section 22) -- feeds the previous
    routine + the measured delta back in, rather than starting from a blank profile.

Safety screening (section 21) is enforced in routers/exercise.py before this module is even called:
any true safety_* flag on the ExerciseProfile short-circuits routine generation entirely.
"""
from __future__ import annotations
import json
from typing import Optional

from .schemas import (BodyCompositionMeasurement, ExerciseProfile, ExerciseRoutine, RoutineExercise,
                       Segment, SEGMENT_LABEL_KO, Goal, ExperienceLevel)
from .comparison import left_right_balance
from .store import new_id, now

SAFETY_FLAGS = ['safety_chest_pain', 'safety_fainting', 'safety_breathlessness',
                'safety_acute_injury', 'safety_medical_restriction']


def safety_screen_failed(profile: ExerciseProfile) -> bool:
    return any(getattr(profile, f) for f in SAFETY_FLAGS)


# --- Exercise catalog, grouped by target segment + equipment need. Real, commonly-prescribed
# exercises only -- no fabricated per-muscle targeting beyond the five measured segments.
_CATALOG = {
    Segment.LEFT_LEG: [
        {'name': '스쿼트', 'equipment': [], 'reason': '하체 전반 근력 강화'},
        {'name': '런지 (왼쪽 우선)', 'equipment': [], 'reason': '좌우 하체 불균형 개선을 위한 편측 강화'},
        {'name': '레그 프레스', 'equipment': ['machine'], 'reason': '하체 근력 강화'},
    ],
    Segment.RIGHT_LEG: [
        {'name': '스쿼트', 'equipment': [], 'reason': '하체 전반 근력 강화'},
        {'name': '런지 (오른쪽 우선)', 'equipment': [], 'reason': '좌우 하체 불균형 개선을 위한 편측 강화'},
        {'name': '레그 프레스', 'equipment': ['machine'], 'reason': '하체 근력 강화'},
    ],
    Segment.TRUNK: [
        {'name': '플랭크', 'equipment': [], 'reason': '코어 및 몸통 안정성 강화'},
        {'name': '데드리프트', 'equipment': ['barbell'], 'reason': '몸통·후면 사슬 근력 강화'},
        {'name': '버드독', 'equipment': [], 'reason': '코어 안정성 및 좌우 균형 개선'},
    ],
    Segment.LEFT_ARM: [
        {'name': '덤벨 컬 (왼팔 우선)', 'equipment': ['dumbbell'], 'reason': '좌우 상체 불균형 개선을 위한 편측 강화'},
        {'name': '푸시업', 'equipment': [], 'reason': '상체 전반 근력 강화'},
    ],
    Segment.RIGHT_ARM: [
        {'name': '덤벨 컬 (오른팔 우선)', 'equipment': ['dumbbell'], 'reason': '좌우 상체 불균형 개선을 위한 편측 강화'},
        {'name': '푸시업', 'equipment': [], 'reason': '상체 전반 근력 강화'},
    ],
}
_CARDIO = [{'name': '빠르게 걷기 또는 조깅', 'equipment': [], 'reason': '체지방 관리를 위한 유산소 활동', 'duration': '20-30분'}]
_MOBILITY = [{'name': '전신 스트레칭', 'equipment': [], 'reason': '가동성 확보 및 부상 예방', 'duration': '10분'}]

_SETS_REPS = {
    ExperienceLevel.BEGINNER: (2, '10-12'),
    ExperienceLevel.INTERMEDIATE: (3, '10-12'),
    ExperienceLevel.ADVANCED: (4, '8-12'),
}


def _weak_segments(current: BodyCompositionMeasurement) -> list[Segment]:
    """Segments whose lean_reference_percent is below 90 (below the typical reference band), or --
    when reference data isn't available -- the lower side of each left/right pair. Never invents a
    'weak' segment beyond what the measurement actually shows."""
    seg_map = {s.segment: s for s in current.segments}
    weak = [s for s, m in seg_map.items() if m.lean_reference_percent is not None and m.lean_reference_percent < 90]
    if weak:
        return weak
    bal = left_right_balance(current)
    out = []
    if bal['leg']['diff_percent'] is not None:
        out.append(Segment.LEFT_LEG if bal['leg']['diff_percent'] < 0 else Segment.RIGHT_LEG)
    if bal['arm']['diff_percent'] is not None:
        out.append(Segment.LEFT_ARM if bal['arm']['diff_percent'] < 0 else Segment.RIGHT_ARM)
    return out


def build_deterministic_routine(user_id: str, measurement: BodyCompositionMeasurement, profile: ExerciseProfile,
                                  based_on_measurement_id: Optional[str] = None,
                                  change_note: str = '') -> ExerciseRoutine:
    weak = _weak_segments(measurement)
    sets, reps = _SETS_REPS[profile.experience_level]
    days = max(1, min(profile.days_per_week, 6))
    exercises: list[RoutineExercise] = []

    # Day plan: alternate lower-body-focus / upper+core-focus / full-body+cardio across days,
    # always prioritizing whichever segments measured weak so the routine is genuinely tailored,
    # not identical for every student (section: "AI가 모든 사람에게 같은 운동 제공" is forbidden).
    priority_pool = weak or [Segment.LEFT_LEG, Segment.RIGHT_LEG, Segment.TRUNK]
    for day in range(1, days + 1):
        focus_segment = priority_pool[(day - 1) % len(priority_pool)]
        candidates = [e for e in _CATALOG[focus_segment] if not profile.available_equipment or not e['equipment']
                      or any(eq in profile.available_equipment for eq in e['equipment'])]
        candidates = candidates or _CATALOG[focus_segment]
        for ex in candidates[:2]:
            exercises.append(RoutineExercise(day_number=day, exercise_name=ex['name'], sets=sets, reps=reps,
                                              rest_seconds=60, reason=ex['reason']))
        if profile.goal in (Goal.FAT_MANAGEMENT, Goal.GENERAL_HEALTH, Goal.GENERAL_FITNESS):
            c = _CARDIO[0]
            exercises.append(RoutineExercise(day_number=day, exercise_name=c['name'], duration=c['duration'],
                                              reason=c['reason']))
        m = _MOBILITY[0]
        exercises.append(RoutineExercise(day_number=day, exercise_name=m['name'], duration=m['duration'], reason=m['reason']))

    weak_labels = ', '.join(SEGMENT_LABEL_KO[s] for s in weak) if weak else '전신'
    goal_label = {Goal.MUSCLE_GAIN: '근육 증가', Goal.FAT_MANAGEMENT: '체지방 관리', Goal.GENERAL_FITNESS: '전신 체력',
                  Goal.BALANCE: '좌우 균형 개선', Goal.GENERAL_HEALTH: '일반 건강관리'}[profile.goal]
    summary = f'{goal_label}을 목표로, 측정값 대비 상대적으로 낮게 나타난 {weak_labels} 부위를 우선 강화하는 루틴입니다.'
    if change_note:
        summary = f'{change_note} {summary}'

    return ExerciseRoutine(id=new_id('ROUTINE'), user_id=user_id, created_at=now(),
                            based_on_measurement_id=based_on_measurement_id or measurement.id,
                            goal=goal_label, summary=summary, duration_weeks=6, days_per_week=days,
                            exercises=exercises, generated_by='deterministic')


def parse_llm_routine_json(raw_text: str, user_id: str, measurement_id: str) -> ExerciseRoutine | None:
    """Attempts to parse an LLM's JSON routine output into ExerciseRoutine (section 20's schema).
    Returns None on any parsing/validation failure -- callers must fall back to
    build_deterministic_routine() rather than surfacing a broken routine."""
    try:
        data = json.loads(raw_text)
        exercises = []
        for day in data['days']:
            for ex in day['exercises']:
                exercises.append(RoutineExercise(day_number=day['day'], exercise_name=ex['name'],
                                                  sets=ex.get('sets'), reps=ex.get('reps'), duration=ex.get('duration'),
                                                  rest_seconds=ex.get('rest_seconds'), reason=ex.get('reason', '')))
        if not exercises:
            return None
        return ExerciseRoutine(id=new_id('ROUTINE'), user_id=user_id, created_at=now(),
                                based_on_measurement_id=measurement_id, goal=data.get('goal', ''),
                                summary=data.get('reason', ''), duration_weeks=int(data.get('duration_weeks', 6)),
                                days_per_week=int(data.get('days_per_week', 3)), exercises=exercises, generated_by='llm')
    except Exception:
        return None
