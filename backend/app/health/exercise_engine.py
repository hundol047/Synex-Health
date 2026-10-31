"""Explainable adult wellness planner. Public activity guidance != validated clinical prescription.
Product heuristics are versioned and documented in docs/EXERCISE_ALGORITHM.md.
The LLM never selects movements or overrides screening, time budgets, or equipment constraints.
"""
from __future__ import annotations
from datetime import date, timedelta
import json
from .schemas import ExerciseRoutine, RoutineExercise, Segment, SEGMENT_LABEL_KO, Goal, ExperienceLevel, derive_experience_level
from .comparison import left_right_balance
from .exercise_catalog import CATALOG
from .store import new_id, now

VERSION = '3.2.0'
from pathlib import Path
SOURCES = json.loads(Path(__file__).with_name('evidence.json').read_text())
SAFETY_FLAGS = ['safety_chest_pain', 'safety_fainting', 'safety_breathlessness', 'safety_acute_injury', 'safety_medical_restriction']
LIMITATION_WORDS = {
    'knee': ['무릎', 'knee'], 'back': ['허리', '디스크', '척추', 'back'],
    'shoulder': ['어깨', 'shoulder'], 'wrist': ['손목', 'wrist'], 'hip': ['고관절', 'hip'],
    'ankle': ['발목', 'ankle'], 'elbow': ['팔꿈치', 'elbow'],
}

REGION_FOCUS_LABELS = {'squat': '하체 앞쪽(허벅지)', 'hinge': '엉덩이·허벅지 뒤', 'push': '가슴·어깨',
                       'pull': '등', 'core': '복부·코어'}


EXPERIENCE_LABEL_KO = {ExperienceLevel.BEGINNER: '초급', ExperienceLevel.INTERMEDIATE: '중급', ExperienceLevel.ADVANCED: '고급'}


class PlanBlocked(ValueError):
    pass


def safety_screen_failed(profile):
    return any(getattr(profile, f) for f in SAFETY_FLAGS)


def _weak_segments(current):
    # A product display deadband, NOT a diagnosis or strength estimate.
    weak = [s.segment for s in current.segments if s.lean_reference_percent is not None and s.lean_reference_percent < 90]
    for pair, left, right in [('leg', Segment.LEFT_LEG, Segment.RIGHT_LEG), ('arm', Segment.LEFT_ARM, Segment.RIGHT_ARM)]:
        diff = left_right_balance(current)[pair]['diff_percent']
        if diff is not None and abs(diff) >= 5:
            weak.append(left if diff < 0 else right)
    return list(dict.fromkeys(weak))


def _limitations(profile):
    found = set()
    for item in profile.limitations:
        text = item.strip().lower()
        if not text or text in ('없음', 'none'):
            continue
        matches = {key for key, terms in LIMITATION_WORDS.items() if any(t in text for t in terms)}
        # Don't silently ignore conditions the catalogue cannot handle.
        if not matches or any(w in text for w in ('수술', '임신', '심장', '골절', 'surgery', 'pregnan', 'fracture')):
            raise PlanBlocked('입력한 제약사항은 자동 운동 추천 범위 밖입니다. 건강센터 상담 후 운동계획을 설정하세요.')
        found |= matches
    return found


def _recent_feedback(workouts, previous_routine):
    if not previous_routine:
        return [], []
    # Use at most the most recent 14 days of this routine, ignore future entries.
    start = max(date.today() - timedelta(days=14), date.fromisoformat(previous_routine.created_at[:10]))
    logs = []
    seen = set()
    for w in sorted(workouts or [], key=lambda w: w.date, reverse=True):
        try:
            d = date.fromisoformat(w.date)
        except ValueError:
            continue
        key = (w.date, w.day_number, w.routine_exercise_id or w.exercise_name)
        if w.routine_id == previous_routine.id and start <= d <= date.today() and key not in seen:
            seen.add(key); logs.append(w)
    return logs, [w for w in logs if w.completed]


def build_deterministic_routine(user_id, measurement, profile, based_on_measurement_id=None,
                                change_note='', previous_measurement=None, previous_routine=None,
                                workouts=None, user=None, average=None):
    if safety_screen_failed(profile):
        raise PlanBlocked('건강센터 또는 의료전문가와 상담 후 운동계획을 설정하세요.')
    age = None
    if user and user.birth_date:
        try:
            birth = date.fromisoformat(user.birth_date)
            age = date.today().year - birth.year - ((date.today().month, date.today().day) < (birth.month, birth.day))
        except ValueError:
            raise PlanBlocked('생년월일을 확인한 뒤 운동계획을 생성하세요.')
        if age < 18:
            raise PlanBlocked('현재 자동 운동 추천은 성인용입니다. 건강센터에 상담하세요.')
    constraints = _limitations(profile)
    weak = _weak_segments(measurement)
    from .reference import selected_group
    reference = selected_group(average)
    reference_rows = (reference or {}).get('segments', {})
    below = [Segment(key) for key, row in reference_rows.items()
             if row['lean']['difference_kg'] is not None and row['lean']['difference_kg'] < 0]
    weak = list(dict.fromkeys(weak + below))
    weight, muscle = measurement.weight, measurement.skeletal_muscle_mass
    height = measurement.height or (user.height if user else None)
    bmi = weight / (height / 100) ** 2 if weight and height else None
    # Load-support ratio is a conservative product heuristic; does not diagnose low muscle or set kg.
    support_ratio = muscle / weight if muscle and weight else None
    conservative = ((age is not None and age>=65) or profile.experience_level == ExperienceLevel.BEGINNER or
                    (bmi is not None and (bmi >= 30 or bmi < 18.5)) or
                    (support_ratio is not None and support_ratio < 1/3))
    notices = ['성인 일반 건강관리용 제안입니다. 체성분은 근력·관절 상태를 직접 측정하지 않습니다.',
               '체중·근육량 비율과 변화 기준은 보수적인 제품 규칙이며 임상적으로 검증된 처방 기준이 아닙니다.']
    rationale = ['성별만으로 운동 종류나 중량을 결정하지 않습니다. 실제 측정값과 운동 가능 조건을 우선합니다.']
    if profile.experience_detail and derive_experience_level(profile.experience_detail):
        rationale.append(f'운동 경험 단계 {EXPERIENCE_LABEL_KO[profile.experience_level]}: 프로필의 운동 기간·주당 횟수 응답으로 정했습니다. 체력 측정 결과가 아닌 자기 보고입니다.')
    if age is not None and age>=65:rationale.append('연령을 고려해 낮은 시작량과 쉬운 동작을 우선했습니다.')
    if weight is not None and muscle is not None:
        rationale.append(f'체중 {weight:g}kg·골격근량 {muscle:g}kg를 함께 고려하여 시작 동작 난이도를 조정했습니다. 중량(kg)은 추정하지 않습니다.')
    else:
        conservative = True
        notices.append('체중 또는 골격근량이 없어 체성분에 따른 난이도 조정을 보류하고 쉬운 동작부터 시작합니다.')
    if bmi is None:
        notices.append('키·체중이 부족하여 체격에 따른 부하 조정을 생략했습니다.')
    underweight = bmi is not None and bmi < 18.5
    if underweight:
        notices.append('현재 키·체중에서는 감량 중심 구성을 적용하지 않습니다. 체중 변화와 영양 상태를 건강센터에서 확인하세요.')
    if weak:
        rationale.append('측정상 상대적으로 낮은 부위: ' + ', '.join(SEGMENT_LABEL_KO[s] for s in weak) + '. 관련 전신 동작의 순서에 반영하며 좌우 운동량은 동일하게 유지합니다.')
    else:
        rationale.append('부위별 차이가 없거나 비교자료가 부족해 특정 한쪽을 약한 부위로 지정하지 않았습니다.')
    if constraints:
        notices.append('제약 부위에 부담을 줄 수 있는 동작을 제외했습니다. 제외되지 않은 동작도 통증이 있으면 중단하세요.')
    equipment = set(profile.available_equipment) - {'none'}
    candidates = [m for m in CATALOG if set(m['equipment']) <= equipment and not set(m['avoid']) & constraints
                  and profile.exercise_location in m['locations'] and m['auto_recommend']
                  and (profile.training_mode != 'bodyweight' or not m['equipment'])]
    if conservative:
        candidates=[m for m in candidates if m['easy']]
    if profile.exercise_location == 'outdoor':
        candidates = [m for m in candidates if m['id'] not in ('sit_stand', 'wall_push', 'march')]
    if not candidates or not any(m['pattern'] != 'cardio' for m in candidates):
        raise PlanBlocked('현재 운동환경과 제약사항으로 구성할 수 있는 운동이 부족합니다. 건강센터 상담이 필요합니다.')
    logs, completed = _recent_feedback(workouts, previous_routine)
    if any(w.difficulty == 'pain' or (w.pain or 0)>0 for w in logs):
        raise PlanBlocked('최근 운동에서 통증이 기록되었습니다. 건강센터 상담 후 운동계획을 조정하세요.')
    sets = 1 if conservative else (3 if profile.experience_level == ExperienceLevel.ADVANCED else 2)
    if profile.goal == Goal.MUSCLE_GAIN and not conservative:
        sets = min(3, sets + 1)
    previous_sets = [e.sets for e in previous_routine.exercises if e.sets] if previous_routine else []
    progression = '기본 시작량을 유지합니다. 자세가 안정적이고 2–3회 더 할 여유가 남는 강도를 선택하세요.'
    feedback_key = sorted(w.id for w in logs)
    consumed = previous_routine.input_snapshot.get('feedback_ids', []) if previous_routine else []
    if feedback_key and feedback_key == consumed and previous_sets:
        sets = min(previous_sets)
    if logs and sum(w.completed for w in logs)/len(logs)<.5:
        sets=max(1,sets-1);progression='최근 기록의 완료율이 낮아 시작량을 줄였습니다. 미기록 운동은 완료율에 포함하지 않습니다.'
    hold_volume = False
    if logs and any(w.difficulty == 'hard' or (w.rpe or 0)>=8 for w in logs):
        hold_volume = True
        sets = max(1, min(sets, min(previous_sets or [sets]) - 1))
        conservative = True
        progression = '최근 어려움 피드백을 반영해 세트 수를 줄이거나 쉬운 동작으로 전환했습니다.'
    elif feedback_key != consumed and len(completed) >= 4 and len({w.date for w in completed}) >= 2 and all(w.difficulty == 'easy' and (w.rpe is None or w.rpe<=5) and not w.pain for w in logs) and len(completed) == len(logs):
        sets = min(3, min(previous_sets or [sets]) + 1)
        progression = '서로 다른 2일 이상, 4건 이상의 쉬움·완료 기록을 반영해 시간 범위 내에서 최대 1세트를 추가했습니다.'
    muscle_loss = False
    fat_rise = False
    if previous_measurement and measurement.measurement_date > previous_measurement.measurement_date:
        old = previous_measurement
        if muscle is not None and old.skeletal_muscle_mass:
            delta = muscle - old.skeletal_muscle_mass
            rationale.append(f'이전 대비 골격근량 {delta:+.2f}kg. 단일 체성분 변화만으로 근력 향상이나 운동 효과를 단정하지 않습니다.')
            if delta / old.skeletal_muscle_mass <= -0.02:
                muscle_loss = True; conservative = True; sets = 1; hold_volume = True
                progression = '골격근량 감소가 관찰되어 증량을 보류하고 쉬운 동작·낮은 시작량으로 재구성했습니다. 같은 조건에서 재측정하세요.'
        if measurement.body_fat_percentage is not None and old.body_fat_percentage is not None:
            fat_rise = measurement.body_fat_percentage - old.body_fat_percentage >= 1
    fat_focus = profile.goal == Goal.FAT_MANAGEMENT and not underweight and not muscle_loss
    if fat_rise and fat_focus:
        rationale.append('감량 목표와 체지방률 상승을 함께 반영해 가능한 시간 안에서 걷기 비중을 늘렸습니다.')
    one_day = profile.plan_unit == 'day'
    days_per_week = 1 if one_day else profile.days_per_week
    period_text = '하루' if one_day else f'{profile.plan_length}주' if profile.plan_unit == 'week' else f'{profile.plan_length}개월'
    rationale.append(('하루 1회' if one_day else f'{period_text} 동안 주 {days_per_week}회') + f'·회당 {profile.minutes_per_session}분, {profile.exercise_location} 환경과 실제 선택한 장비만 사용합니다.')
    rationale.append('체성분 차이는 근력 차이의 확정 근거가 아니므로 한쪽만 더 무겁게 훈련하지 않습니다.')
    # Alternate strength/recovery days: same muscle groups are not loaded hard every day.
    schedule_days = {1:[0], 2:[0,3], 3:[0,2,4], 4:[0,2,4,6], 5:[0,1,2,4,6], 6:[0,1,2,3,4,6], 7:list(range(7))}[days_per_week]
    strength_indices = {1:[0], 2:[0,1], 3:[0,1,2], 4:[0,1,2], 5:[0,2,3], 6:[0,2,4], 7:[0,2,4]}[days_per_week]
    weekdays = ['월','화','수','목','금','토','일']
    patterns = ['squat','push','pull','hinge','core']
    if any('ARM' in s.value for s in weak): patterns = ['push','pull','squat','hinge','core']
    elif Segment.TRUNK in weak: patterns = ['core','hinge','squat','push','pull']
    focus = set(profile.focus_regions)
    focus_tier = lambda p: 0 if p in focus else 1
    if focus:
        rationale.append('집중 부위: ' + ', '.join(REGION_FOCUS_LABELS[p] for p in patterns if p in focus)
                         + '. 먼저 배치하고 시간 안에서 1세트를 더합니다. 다른 부위도 시간이 허락하는 만큼 함께 구성합니다.'
                         + (' 최근 부담·근육량 변화로 이번에는 세트를 더하지 않았습니다.' if hold_volume else ''))
    exercises = []; day_minutes = {}; schedule = []
    for day_idx, calendar_day in enumerate(schedule_days):
        day = day_idx + 1
        strength = day_idx in strength_indices
        schedule.append('오늘 · 전신 근력' if one_day else f'Day {day} · {weekdays[calendar_day]} · ' + ('전신 근력' if strength else '가벼운 활동·회복'))
        budget = min(profile.minutes_per_session, 60)
        warm_cool = 4
        remaining = budget - warm_cool
        cardio_budget = min(remaining, max(2, round(remaining * (0.4 if fat_focus else 0.2)))) if strength else remaining
        if fat_focus and fat_rise: cardio_budget = min(remaining, cardio_budget + 3)
        available_patterns = []
        if strength:
            # Rotate which patterns lead short sessions; don't omit the same muscle groups every day.
            rotation = (day_idx * 2) % len(patterns)
            # Stable sort keeps the day rotation within each purpose tier.
            for pattern in sorted(patterns[rotation:] + patterns[:rotation], key=focus_tier):
                pool = [m for m in candidates if m['pattern'] == pattern]
                if pool:
                    preference = ' '.join(profile.preferences).lower()
                    easy = conservative
                    pool.sort(key=lambda m: (not (m['name'].lower() in preference or m['id'] in preference) if preference else False,
                                             m['easy'] != easy, not bool(m['equipment']), m['id']))
                    # Rotate within equally suitable candidates across training days.
                    rank=lambda m:(m['easy'] != easy, not bool(m['equipment']))
                    preferred=[m for m in pool if preference and (m['name'].lower() in preference or m['id'] in preference)]
                    best=preferred or [m for m in pool if rank(m)==rank(pool[0])]
                    pool=[best[day_idx % len(best)]]
                    available_patterns.append(pool[0])
        day_sets = sets
        while day_sets > 1 and day_sets * .7 + (day_sets - 1) + .5 > remaining - cardio_budget:
            day_sets -= 1
        minutes_for = lambda n: n * 0.7 + max(0, n - 1) * 1 + 0.5
        for m in available_patterns:
            focused_move = m['pattern'] in focus
            ex_sets = min(2 if conservative else 3, day_sets + 1) if focused_move and not hold_volume else day_sets
            if remaining - cardio_budget < minutes_for(ex_sets): ex_sets = min(ex_sets, day_sets)
            per_exercise = minutes_for(ex_sets)
            if remaining - cardio_budget < per_exercise: continue
            reason = '전신 주요 움직임을 균형 있게 구성하고, 사용 가능한 장비와 제약사항을 반영했습니다.'
            if focused_move: reason += f' {REGION_FOCUS_LABELS[m["pattern"]]}을(를) 집중 부위로 선택해 먼저 배치했습니다.'
            for segment in below:
                if SEGMENT_LABEL_KO[segment] in m['regions'] or any(t in ' '.join(m['regions']) for t in (['하체','다리','둔근'] if 'LEG' in segment.value else ['상체','팔'] if 'ARM' in segment.value else ['코어','몸통'])):
                    row = reference_rows[segment.value]['lean']
                    reason += f' {SEGMENT_LABEL_KO[segment]} 제지방량이 선택된 비교군 평균보다 {abs(row["difference_kg"]):g}kg ({abs(row["difference_percent"]):g}%) 낮아 관련 움직임을 포함했습니다. 평균 차이만으로 세트 수를 늘리지는 않습니다.'
                    break
            if conservative: reason += ' 체격·경험·측정자료에 맞춰 낮은 시작 부하를 선택했습니다.'
            exercises.append(RoutineExercise(exercise_id=f'd{day}-{m["id"]}', motion_id=m['id'],
                day_number=day, exercise_name=m['name'], sets=ex_sets, reps=m['reps'] if m['dose_type']=='hold' else '8–12회 (좌우 동일)', rest_seconds=60,
                equipment=m['equipment'],training_type=m['training_type'],dose_type=m['dose_type'],hold_seconds=m.get('hold_seconds'),
                instructions=m['instructions'], cautions=m['cautions'], target_regions=m['regions'],
                intensity='2–3회 더 할 여유를 남기고 중단', estimated_minutes=round(per_exercise,1), reason=reason))
            remaining -= per_exercise
        cardio = [m for m in candidates if m['pattern']=='cardio']
        if cardio and remaining >= 1:
            m = next((m for m in cardio if m['equipment']),None) if profile.training_mode=='equipment' else None
            m = m or next((m for m in cardio if m['id']=='walk'),cardio[0]); minutes = int(remaining)
            exercises.append(RoutineExercise(exercise_id=f'd{day}-{m["id"]}', motion_id=m['id'], day_number=day,
                exercise_name=m['name'], equipment=m['equipment'],training_type=m['training_type'],dose_type='duration',duration=f'{minutes}분', estimated_minutes=minutes, instructions=m['instructions'],
                cautions=m['cautions'], target_regions=m['regions'], intensity='편안하게 대화 가능한 속도',
                reason='선택한 시간 안에서 활동량을 확보합니다. 처음에는 편안한 속도부터 시작하세요.'))
        day_exercises = [e for e in exercises if e.day_number==day]
        if not day_exercises: raise PlanBlocked('시간과 제약사항에 맞는 동작을 구성할 수 없습니다. 건강센터에서 상담하세요.')
        day_minutes[str(day)] = round(warm_cool + sum(e.estimated_minutes for e in day_exercises),1)
    covered = {p for p in patterns if any(m['pattern']==p for m in candidates)}
    if len(covered)<5: notices.append('제약 또는 장비 부족으로 일부 움직임이 제외되었습니다. 전체 근력훈련을 대체하는 완전한 계획은 아닙니다.')
    if profile.training_mode=='equipment': notices.append('선택한 장비를 우선 사용하며, 적합한 장비 운동이 없는 부위는 맨몸 동작으로 보완합니다.')
    if not equipment or profile.training_mode=='bodyweight': notices.append('맨몸 구성에서는 당기기 저항운동이 제한됩니다. 밴드 등 장비 확보 후 다시 생성할 수 있습니다.')
    weeks = 0 if one_day else profile.plan_length * (4 if profile.plan_unit == 'month' else 1)
    if weeks > 4:
        notices.append(f'{period_text} 계획이라도 같은 구성을 계속 고정하지 않습니다. 4주마다 재측정하거나 수행 기록을 남긴 뒤 다시 생성하세요.')
    if one_day:
        notices.append('하루 루틴은 한 번 수행하는 구성입니다. 꾸준히 하려면 주 또는 개월 단위로 계획을 만드세요.')
    notices.append('매회 표시된 시간에 준비·정리운동 각 2분이 포함됩니다. 주간 권장 활동량을 충족하지 못할 수 있으므로 여건에 맞춰 점진적으로 활동을 늘리세요.')
    goal_label = {Goal.MUSCLE_GAIN:'근육 증가',Goal.FAT_MANAGEMENT:'체지방 관리',Goal.GENERAL_FITNESS:'전신 체력',Goal.BALANCE:'균형 있는 운동',Goal.GENERAL_HEALTH:'일반 건강관리'}[profile.goal]
    if underweight and profile.goal==Goal.FAT_MANAGEMENT: goal_label='체력 유지·건강 상담 우선'
    focused = [REGION_FOCUS_LABELS[p] for p in patterns if p in focus]
    if focused: goal_label += ' · ' + ', '.join(focused) + ' 집중'
    return ExerciseRoutine(id=new_id('ROUTINE'),user_id=user_id,created_at=now(),based_on_measurement_id=based_on_measurement_id or measurement.id,
        goal=goal_label,summary=(change_note+' ' if change_note else '')+f'{goal_label}을 위한 {period_text} 개인별 계획입니다. {progression}',
        duration_weeks=weeks,days_per_week=days_per_week,period_unit=profile.plan_unit,period_length=profile.plan_length,exercises=exercises,generated_by='deterministic',algorithm_version=VERSION,
        rationale=rationale,notices=notices,input_snapshot={'reference_group_id':(reference or {}).get('id'),'reference_metadata':(reference or {}).get('metadata'),'weight_kg':weight,'height_cm':height,'muscle_kg':muscle,
            'adherence':round(len(completed)/len(logs),3) if logs else None,'feedback_ids':feedback_key, 'body_fat_percent':measurement.body_fat_percentage,'bmi':round(bmi,1) if bmi else None,'profile':profile.model_dump(mode='json')},
        day_minutes=day_minutes,progression=progression,sources=SOURCES,schedule=schedule)


def parse_llm_routine_json(raw_text, user_id, measurement_id):
    """Legacy parser retained for compatibility; never used by the prescribing route."""
    try:
        data=json.loads(raw_text)
        exercises=[RoutineExercise(day_number=d['day'],exercise_name=e['name'],sets=e.get('sets'),reps=e.get('reps'),
                    duration=e.get('duration'),rest_seconds=e.get('rest_seconds'),reason=e.get('reason','')) for d in data['days'] for e in d['exercises']]
        if not exercises:return None
        return ExerciseRoutine(id=new_id('ROUTINE'),user_id=user_id,based_on_measurement_id=measurement_id,exercises=exercises,
             goal=data.get('goal',''),summary=data.get('reason',''),duration_weeks=int(data.get('duration_weeks',4)),
             days_per_week=int(data.get('days_per_week',3)),generated_by='llm')
    except (ValueError,TypeError,KeyError):return None
