import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState } from '../../shared/components/ui.jsx';
import { useApiData } from '../lib/useApiData.js';
import {
  GOAL_OPTIONS, LOCATION_OPTIONS, EQUIPMENT_OPTIONS, REGION_FOCUS_OPTIONS,
  PLAN_UNITS, MAX_PLAN_LENGTH, EXPERIENCE_LABELS, toCsv, fromCsv,
} from '../lib/exerciseProfileOptions.js';

// Re-checks the profile's "운동 목표 및 환경" right before a routine is generated and lets the
// user pick the plan period and regions to focus on. Experience is a profile-only setting. Confirmed values are saved to the exercise profile, so the next
// generation and the profile screen start from the same conditions.
export default function RoutineConditions({ onConfirm, onCancel, busy }) {
  const exercise = useApiData(() => HealthAPI.getExerciseProfile(), []);
  const [form, setForm] = useState(null);
  const [equipment, setEquipment] = useState(new Set());
  const [limitationsText, setLimitationsText] = useState('');
  const [preferencesText, setPreferencesText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!exercise.data) return;
    setForm({ ...exercise.data, focus_regions: [...(exercise.data.focus_regions || [])],
      plan_unit: exercise.data.plan_unit || 'week', plan_length: exercise.data.plan_length || 4 });
    setEquipment(new Set(exercise.data.available_equipment || []));
    setLimitationsText(toCsv(exercise.data.limitations));
    setPreferencesText(toCsv(exercise.data.preferences));
  }, [exercise.data]);

  if (exercise.loading && !exercise.data) return <Card><Skeleton height={260} /></Card>;
  if (exercise.error) return <ErrorState message={exercise.error.message} onRetry={exercise.reload} />;
  if (!form) return null;

  const set = (key, value) => setForm({ ...form, [key]: value });
  function toggleFocus(region) {
    const current = form.focus_regions;
    set('focus_regions', current.includes(region) ? current.filter((r) => r !== region) : [...current, region]);
  }
  function toggleEquipment(value) {
    const next = new Set(equipment);
    if (next.has(value)) next.delete(value); else next.add(value);
    setEquipment(next);
  }

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await HealthAPI.updateExerciseProfile({
        goal: form.goal,
        plan_unit: form.plan_unit,
        plan_length: form.plan_unit === 'day' ? 1 : Number(form.plan_length) || 1,
        days_per_week: Number(form.days_per_week) || 1,
        minutes_per_session: Number(form.minutes_per_session) || 10,
        training_mode: form.training_mode || 'mixed',
        exercise_location: form.exercise_location,
        available_equipment: [...equipment],
        limitations: fromCsv(limitationsText),
        preferences: fromCsv(preferencesText),
        focus_regions: form.focus_regions,
      });
    } catch (e) {
      setError(Error(`운동 조건을 저장하지 못해 루틴을 만들지 않았습니다. ${e.message}`));
      setSaving(false);
      return;
    }
    setSaving(false);
    await onConfirm();
  }

  const disabled = saving || busy;
  return (
    <Card title="루틴 생성 전 운동 조건 확인">
      <p className="muted" style={{ marginTop: 0 }}>프로필의 운동 목표와 환경입니다. 지금 상황과 다르면 여기서 고친 뒤 생성하세요. 고친 내용은 프로필에도 저장됩니다.</p>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">루틴 기간</label>
          <div className="plan-period">
            <div className="plan-period-units" role="radiogroup" aria-label="루틴 기간 단위">
              {PLAN_UNITS.map((u) => (
                <button key={u.value} type="button" role="radio" aria-checked={form.plan_unit === u.value}
                  className={form.plan_unit === u.value ? 'active' : ''} onClick={() => set('plan_unit', u.value)}>{u.label}</button>
              ))}
            </div>
            {form.plan_unit !== 'day' && <label className="plan-period-length">
              <input aria-label="루틴 기간 길이" type="number" min={1} max={MAX_PLAN_LENGTH} className="text-input" value={form.plan_length}
                onChange={(e) => set('plan_length', e.target.value)} />
              <span>{form.plan_unit === 'week' ? '주' : '개월'} 동안</span>
            </label>}
          </div>
          <p className="muted" style={{ margin: '4px 0 0' }}>{form.plan_unit === 'day' ? '오늘 한 번 할 루틴을 만듭니다.' : `1–${MAX_PLAN_LENGTH}${form.plan_unit === 'week' ? '주' : '개월'} 중에서 정합니다. 4주가 넘으면 중간에 재측정 후 다시 생성하기를 권장합니다.`}</p>
        </div>
        <div className="profile-grid">
          <div>
            <label className="field-label" htmlFor="rc-goal">운동 목적</label>
            <select id="rc-goal" className="text-input" value={form.goal} onChange={(e) => set('goal', e.target.value)}>
              {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.plan_unit !== 'day' && <div>
            <label className="field-label" htmlFor="rc-days">주당 운동 일수</label>
            <input id="rc-days" type="number" min={1} max={7} className="text-input" value={form.days_per_week} onChange={(e) => set('days_per_week', e.target.value)} />
          </div>}
          <div>
            <label className="field-label" htmlFor="rc-minutes">회당 운동 시간(분)</label>
            <input id="rc-minutes" type="number" min={10} max={180} className="text-input" value={form.minutes_per_session} onChange={(e) => set('minutes_per_session', e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="rc-mode">운동 방식</label>
            <select id="rc-mode" className="text-input" value={form.training_mode || 'mixed'} onChange={(e) => set('training_mode', e.target.value)}>
              <option value="mixed">장비와 맨몸 함께</option><option value="bodyweight">맨몸운동만</option><option value="equipment">헬스장·장비 운동 우선</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rc-location">운동 장소</label>
            <select id="rc-location" className="text-input" value={form.exercise_location} onChange={(e) => set('exercise_location', e.target.value)}>
              {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>운동 경험: <strong>{EXPERIENCE_LABELS[form.experience_level] || '초급'}</strong> · <Link to="/health/profile">프로필에서 변경</Link></p>

        <div style={{ marginTop: 14 }}>
          <label className="field-label">이용할 수 있는 운동 기구</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {EQUIPMENT_OPTIONS.map((o) => (
              <label key={o.value} className={`chip-checkbox ${equipment.has(o.value) ? 'checked' : ''}`}>
                <input type="checkbox" checked={equipment.has(o.value)} onChange={() => toggleEquipment(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label className="field-label">집중할 부위 (선택)</label>
          <p className="muted" style={{ margin: '2px 0 8px' }}>고른 부위는 먼저 배치하고 시간 안에서 1세트를 더합니다. 고르지 않으면 전신을 고르게 구성합니다.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {REGION_FOCUS_OPTIONS.map((region) => {
              const checked = form.focus_regions.includes(region.value);
              return (
                <label key={region.value} className={`chip-checkbox ${checked ? 'checked' : ''}`} title={region.hint}>
                  <input type="checkbox" checked={checked} onChange={() => toggleFocus(region.value)} />
                  {region.label}<span className="muted" style={{ fontSize: '.72rem' }}>{region.hint}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="rc-limitations">제약 사항 (쉼표로 구분)</label>
          <input id="rc-limitations" className="text-input" value={limitationsText} onChange={(e) => setLimitationsText(e.target.value)} placeholder="예: 무릎 통증, 허리 디스크" />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="rc-preferences">선호 사항 (쉼표로 구분)</label>
          <input id="rc-preferences" className="text-input" value={preferencesText} onChange={(e) => setPreferencesText(e.target.value)} placeholder="예: 스쿼트" />
        </div>
      </fieldset>
      <p className="muted" style={{ fontSize: '.8rem' }}>안전 문진은 <Link to="/health/profile">프로필</Link>에서 확인합니다. 해당 항목이 있으면 루틴을 만들지 않습니다.</p>
      {error && <ErrorState message={error.message} onRetry={confirm} />}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={confirm} disabled={disabled}>{disabled ? '생성 중...' : '이 조건으로 루틴 생성'}</button>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel} disabled={disabled}>취소</button>}
      </div>
    </Card>
  );
}
