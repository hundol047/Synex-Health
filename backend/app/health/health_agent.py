"""The Synex Health Agent (sections 16-18 of the product brief).

Same "deterministic, evidence-grounded, clearly-labeled" shape as SynexAgent's ClinicalAgent
(backend/app/services/clinical_agent.py in the SynexAgent repo) -- by default this produces a
structured Korean explanation from the measurement/comparison data with template logic, no external
API call, so the feature works with zero configuration. When HEALTH_AGENT_MODE=llm and
ANTHROPIC_API_KEY is set, analyze()/chat() instead call the Anthropic Messages API using the prompt
files in backend/prompts/, and fall back to the deterministic path on any error or malformed JSON --
see exercise_engine.parse_llm_routine_json for the analogous fallback on the routine-generation side.
Never state a diagnosis; see prompts/health_analysis.md's hard rules, mirrored in the deterministic
templates below.
"""
from __future__ import annotations
import json, os
from pathlib import Path

from .schemas import BodyCompositionMeasurement, HealthAnalysis, Segment, SEGMENT_LABEL_KO, HealthUser
from .comparison import full_comparison
from .store import new_id, now

PROMPTS_DIR = Path(__file__).resolve().parents[2] / 'prompts'


def _load_prompt(name: str) -> str:
    p = PROMPTS_DIR / name
    return p.read_text(encoding='utf-8') if p.exists() else ''


def agent_mode() -> str:
    mode = os.getenv('HEALTH_AGENT_MODE', 'deterministic').lower()
    if mode == 'llm' and not os.getenv('ANTHROPIC_API_KEY'):
        return 'deterministic'  # fail closed to the always-working path rather than pretending to be connected
    return mode


def _call_anthropic(system_prompt: str, user_content: str) -> str | None:
    import httpx
    api_key = os.environ['ANTHROPIC_API_KEY']
    try:
        resp = httpx.post('https://api.anthropic.com/v1/messages', timeout=30,
                           headers={'x-api-key': api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
                           json={'model': os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-5'), 'max_tokens': 2000,
                                 'system': system_prompt, 'messages': [{'role': 'user', 'content': user_content}]})
        resp.raise_for_status()
        blocks = resp.json().get('content', [])
        return ''.join(b.get('text', '') for b in blocks if b.get('type') == 'text') or None
    except Exception:
        return None


def _fmt(v, unit=''):
    return f'{v}{unit}' if v is not None else '측정되지 않음'


def _deterministic_analysis(user: HealthUser, measurement: BodyCompositionMeasurement,
                              previous: BodyCompositionMeasurement | None, comparison: dict) -> HealthAnalysis:
    bal = comparison['left_right_balance']
    ref = comparison['reference_comparison']
    deltas = comparison['top_level_deltas']

    summary = (f'{user.name}님의 이번 측정(체중 {_fmt(measurement.weight, "kg")}, '
               f'골격근량 {_fmt(measurement.skeletal_muscle_mass, "kg")}, '
               f'체지방률 {_fmt(measurement.body_fat_percentage, "%")})을 확인했습니다.')

    balance_parts = []
    for key, label in [('arm', '팔'), ('leg', '다리')]:
        d = bal[key]['diff_percent']
        if d is None:
            continue
        if abs(d) < 3:
            balance_parts.append(f'좌우 {label} 측정값은 비교적 균형 잡혀 있습니다.')
        else:
            weaker_side = '오른쪽' if d > 0 else '왼쪽'
            balance_parts.append(f'{weaker_side} {label}의 측정값이 반대쪽보다 상대적으로 낮게 나타났습니다.')
    balance_analysis = ' '.join(balance_parts) or '좌우 비교에 필요한 데이터가 부족합니다.'

    if deltas.get('body_fat_percentage_delta') is not None:
        d = deltas['body_fat_percentage_delta']
        direction = '감소' if d < 0 else ('증가' if d > 0 else '변화 없음')
        body_fat_analysis = f'이전 측정 대비 체지방률이 {abs(d)}%p {direction}했습니다.'
    else:
        body_fat_analysis = '비교할 이전 측정 데이터가 없어 체지방 변화를 계산할 수 없습니다.'

    if previous is not None:
        sm_delta = deltas.get('skeletal_muscle_mass_delta')
        progress_bits = []
        if sm_delta is not None:
            progress_bits.append(f'골격근량이 {"증가" if sm_delta > 0 else "감소" if sm_delta < 0 else "동일"}했습니다 ({sm_delta:+}kg).')
        bd = comparison.get('balance_delta')
        if bd is not None:
            progress_bits.append('좌우 불균형이 감소했습니다.' if bd < 0 else ('좌우 불균형이 다소 증가했습니다.' if bd > 0 else '좌우 균형은 이전과 비슷합니다.'))
        progress_analysis = ' '.join(progress_bits) or '이전 측정과 비교할 세부 데이터가 부족합니다.'
    else:
        progress_analysis = '첫 측정입니다. 다음 재측정 시 변화를 비교해 드릴 수 있습니다.'

    priority_area = [SEGMENT_LABEL_KO[Segment(k)] for k, v in ref.items()
                      if v.get('status') in ('below', 'far_below')]
    out_of_range = [SEGMENT_LABEL_KO[Segment(k)] for k, v in ref.items() if v.get('status') == 'far_below']

    recommendations = []
    if priority_area:
        recommendations.append(f'{", ".join(priority_area)} 부위를 우선적으로 강화하는 운동을 추천합니다.')
    if deltas.get('body_fat_percentage_delta') and deltas['body_fat_percentage_delta'] > 0:
        recommendations.append('체지방 관리를 위한 유산소 활동을 주간 루틴에 포함하는 것을 고려해 보세요.')
    if not recommendations:
        recommendations.append('현재 균형 잡힌 상태입니다. 꾸준한 운동 습관 유지를 권장합니다.')

    counselor_questions = ['최근 측정값이 기준 범위를 벗어난 부위가 있는지 확인하고 싶습니다.' if out_of_range else '현재 운동 루틴이 적절한지 확인받고 싶습니다.',
                            '재측정 주기를 어떻게 잡는 것이 좋을지 상담하고 싶습니다.']
    if out_of_range:
        counselor_questions.insert(0, f'{", ".join(out_of_range)} 측정값이 기준 범위를 크게 벗어났는데 반복 측정이 필요한지 확인하고 싶습니다.')

    return HealthAnalysis(id=new_id('ANALYSIS'), user_id=user.id, measurement_id=measurement.id,
                           summary=summary, priority_area=priority_area, balance_analysis=balance_analysis,
                           body_fat_analysis=body_fat_analysis, progress_analysis=progress_analysis,
                           recommendations=recommendations, counselor_questions=counselor_questions,
                           generated_by='deterministic', created_at=now())


def analyze(user: HealthUser, measurement: BodyCompositionMeasurement, previous: BodyCompositionMeasurement | None,
            ranges: dict) -> HealthAnalysis:
    comparison = full_comparison(previous, measurement, ranges)
    if agent_mode() == 'llm':
        system_prompt = _load_prompt('health_analysis.md')
        context = json.dumps({'user': user.model_dump(mode='json'), 'measurement': measurement.model_dump(mode='json'),
                               'previous': previous.model_dump(mode='json') if previous else None,
                               'comparison': comparison}, ensure_ascii=False, default=str)
        raw = _call_anthropic(system_prompt, context)
        if raw:
            try:
                data = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])
                return HealthAnalysis(id=new_id('ANALYSIS'), user_id=user.id, measurement_id=measurement.id,
                                       summary=data.get('summary', ''), priority_area=data.get('priority_area', []),
                                       balance_analysis=data.get('balance_analysis', ''),
                                       body_fat_analysis=data.get('body_fat_analysis', ''),
                                       progress_analysis=data.get('progress_analysis', ''),
                                       recommendations=data.get('recommendations', []),
                                       counselor_questions=data.get('counselor_questions', []),
                                       generated_by='llm', created_at=now())
            except Exception:
                pass  # fall through to deterministic
    return _deterministic_analysis(user, measurement, previous, comparison)


def chat(user: HealthUser, message: str, context: dict) -> str:
    """Free-form chat, grounded in the same context an analyze() call would use. Deterministic mode
    gives a templated, honest "실시간 대화형 AI 없이 실행 중" style short reply that still surfaces
    real data; llm mode uses the same hard rules as health_analysis.md."""
    if agent_mode() == 'llm':
        system_prompt = _load_prompt('health_analysis.md') + '\n\nRespond conversationally in Korean, 2-4 sentences, plain text (not JSON).'
        ctx = json.dumps(context, ensure_ascii=False, default=str)
        raw = _call_anthropic(system_prompt, f'Context: {ctx}\n\nUser message: {message}')
        if raw:
            return raw.strip()
    latest = context.get('latest_measurement')
    if not latest:
        return '아직 등록된 체성분 측정 데이터가 없습니다. 먼저 체성분 측정 결과를 입력해 주세요.'
    return (f'현재 등록된 최근 측정 기준으로 체지방률은 {_fmt(latest.get("body_fat_percentage"), "%")}, '
            f'골격근량은 {_fmt(latest.get("skeletal_muscle_mass"), "kg")}입니다. '
            f'더 자세한 분석은 "AI 분석 생성"을 눌러 확인하실 수 있습니다. 궁금하신 부위를 3D Body Map에서 눌러보세요.')
