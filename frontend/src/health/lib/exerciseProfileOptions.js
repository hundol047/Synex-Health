import {EQUIPMENT_LABELS} from './exerciseLabels.js';

// Shared by the profile screen and the routine-creation condition check.
export const GOAL_OPTIONS = [
  { value: 'MUSCLE_GAIN', label: '근력/근육량 향상' },
  { value: 'FAT_MANAGEMENT', label: '체지방 관리' },
  { value: 'GENERAL_FITNESS', label: '전반적인 체력 향상' },
  { value: 'BALANCE', label: '좌우 균형 개선' },
  { value: 'GENERAL_HEALTH', label: '일반 건강 관리' },
];

export const LOCATION_OPTIONS = [
  { value: 'gym', label: '헬스장' },
  { value: 'home', label: '홈트레이닝' },
  { value: 'outdoor', label: '실외' },
];

export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS).filter(([value])=>value!=='none').map(([value,label])=>({value,label}));

export const REGION_FOCUS_OPTIONS = [
  { value: 'squat', label: '하체 앞쪽', hint: '허벅지·무릎 주변' },
  { value: 'hinge', label: '엉덩이·허벅지 뒤', hint: '둔근·햄스트링' },
  { value: 'push', label: '가슴·어깨', hint: '밀기 동작' },
  { value: 'pull', label: '등', hint: '당기기 동작' },
  { value: 'core', label: '복부·코어', hint: '몸통 안정' },
];

export const PLAN_UNITS = [
  { value: 'day', label: '하루' },
  { value: 'week', label: '주' },
  { value: 'month', label: '개월' },
];
export const MAX_PLAN_LENGTH = 12;

export function periodLabel(routine) {
  if (routine.period_unit === 'day') return '하루 루틴';
  if (routine.period_unit === 'month') return `${routine.period_length}개월 프로그램`;
  return `${routine.period_length ?? routine.duration_weeks}주 프로그램`;
}

// Self-reported indicators, scored 0-3 in option order. Mirrors backend schemas.EXPERIENCE_SCORES.
export const EXPERIENCE_INDICATORS = [
  { key: 'training_history', label: '규칙적으로 운동한 기간', options: [['none', '처음 시작'], ['lt6m', '6개월 미만'], ['6m_2y', '6개월–2년'], ['gt2y', '2년 이상']] },
  { key: 'weekly_sessions', label: '최근 3개월 주당 운동 횟수', options: [['0', '거의 안 함'], ['1_2', '1–2회'], ['3_4', '3–4회'], ['5plus', '5회 이상']] },
];

export const EXPERIENCE_LABELS = { BEGINNER: '초급', INTERMEDIATE: '중급', ADVANCED: '고급' };

export function validExperienceDetail(detail) {
  if (detail == null) return true;
  if (typeof detail !== 'object' || Array.isArray(detail)) return false;
  return Object.entries(detail).every(([key, value]) => {
    const indicator = EXPERIENCE_INDICATORS.find((x) => x.key === key);
    return indicator && (value == null || indicator.options.some(([v]) => v === value));
  });
}

// Returns null until every indicator is answered; frequent sessions without history stay capped.
export function deriveExperienceLevel(detail) {
  if (!detail || EXPERIENCE_INDICATORS.some((x) => detail[x.key] == null)) return null;
  const total = EXPERIENCE_INDICATORS.reduce((sum, x) => sum + x.options.findIndex(([v]) => v === detail[x.key]), 0);
  let level = total <= 1 ? 0 : total <= 4 ? 1 : 2;
  level = Math.min(level, { none: 0, lt6m: 1 }[detail.training_history] ?? 2);
  return ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'][level];
}

export function toCsv(list) {
  return (list || []).join(', ');
}
export function fromCsv(text) {
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}
