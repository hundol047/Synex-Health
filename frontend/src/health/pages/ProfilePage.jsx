import {LOCAL_ONLY} from '../../shared/lib/localMode.js';
import {saveProfileChanges} from '../lib/saveProfileChanges.js';
import {registerDraftNavigation} from '../../shared/lib/draftNavigation.js';
import {EQUIPMENT_LABELS} from '../lib/exerciseLabels.js';
import { Link } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import MeasurementEntry from '../components/MeasurementEntry.jsx';
import SchoolSelector from '../components/SchoolSelector.jsx';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, Disclaimer } from '../../shared/components/ui.jsx';
import { useApiData } from '../lib/useApiData.js';

const GOAL_OPTIONS = [
  { value: 'MUSCLE_GAIN', label: '근력/근육량 향상' },
  { value: 'FAT_MANAGEMENT', label: '체지방 관리' },
  { value: 'GENERAL_FITNESS', label: '전반적인 체력 향상' },
  { value: 'BALANCE', label: '좌우 균형 개선' },
  { value: 'GENERAL_HEALTH', label: '일반 건강 관리' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'BEGINNER', label: '초급' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '고급' },
];

const LOCATION_OPTIONS = [
  { value: 'gym', label: '헬스장' },
  { value: 'home', label: '홈트레이닝' },
  { value: 'outdoor', label: '실외' },
];

const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS).filter(([value])=>value!=='none').map(([value,label])=>({value,label}));

const SAFETY_FIELDS = [
  { key: 'safety_chest_pain', label: '최근 심한 흉통이 있었나요?' },
  { key: 'safety_fainting', label: '실신한 적이 있나요?' },
  { key: 'safety_breathlessness', label: '심한 호흡곤란이 있었나요?' },
  { key: 'safety_acute_injury', label: '급성 부상이 있나요?' },
  { key: 'safety_medical_restriction', label: '의료진이 운동 제한을 지시했나요?' },
];

function toCsv(list) {
  return (list || []).join(', ');
}
function fromCsv(text) {
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function ProfilePage() {
  const [dirty,setDirty]=useState(false),guard=useRef(Symbol());
  useEffect(()=>registerDraftNavigation(guard.current,dirty,()=>Promise.resolve(),'저장하지 않은 프로필·안전 문진 변경이 있습니다. 변경을 버리고 이동할까요?','/health/profile'),[dirty]);
  const profile = useApiData(() => HealthAPI.getProfile(), []);
  const exercise = useApiData(() => HealthAPI.getExerciseProfile(), []);

  const confirmedHealth=useRef(null);
  const [heightInput, setHeightInput] = useState('');
  const [name,setName]=useState('');
  const [birthDate,setBirthDate]=useState('');
  const [gender,setGender]=useState('unspecified');
  const [form, setForm] = useState(null);
  const [equipmentSet, setEquipmentSet] = useState(new Set());
  const [limitationsText, setLimitationsText] = useState('');
  const [preferencesText, setPreferencesText] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if(profile.data)confirmedHealth.current={height:profile.data.height,gender:profile.data.gender,birth_date:profile.data.birth_date||null};
    if (profile.data?.height != null) setHeightInput(String(profile.data.height));
    setGender(profile.data?.gender||'unspecified');setName(profile.data?.name||'');setBirthDate(profile.data?.birth_date||'');
  }, [profile.data]);

  useEffect(() => {
    if (exercise.data) {
      setForm({ ...exercise.data });
      setEquipmentSet(new Set(exercise.data.available_equipment || []));
      setLimitationsText(toCsv(exercise.data.limitations));
      setPreferencesText(toCsv(exercise.data.preferences));
    }
  }, [exercise.data]);

  function toggleEquipment(value) {
    setEquipmentSet((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const heightNum = heightInput === '' ? null : Number(heightInput);
      const current=confirmedHealth.current||profile.data;
      const health=current&&(heightNum!==current.height||gender!==current.gender||(LOCAL_ONLY&&(name!==profile.data?.name||(birthDate||null)!==current.birth_date)))?{height:heightNum,gender,...(LOCAL_ONLY?{name,birth_date:birthDate||null}: {})}:null;
      await saveProfileChanges(HealthAPI,health,{
        experience_level: form.experience_level,
        goal: form.goal,
        days_per_week: Number(form.days_per_week) || 1,
        minutes_per_session: Number(form.minutes_per_session) || 10,
        exercise_location: form.exercise_location,
        training_mode: form.training_mode || 'mixed',
        available_equipment: [...equipmentSet],
        limitations: fromCsv(limitationsText),
        preferences: fromCsv(preferencesText),
        safety_chest_pain: !!form.safety_chest_pain,
        safety_fainting: !!form.safety_fainting,
        safety_breathlessness: !!form.safety_breathlessness,
        safety_acute_injury: !!form.safety_acute_injury,
        safety_medical_restriction: !!form.safety_medical_restriction,
      },value=>{confirmedHealth.current=value;});
      setDirty(false);setSaved(true);
      await Promise.all([profile.reload(),exercise.reload()]);
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  }

  if ((profile.loading && !profile.data) || (exercise.loading && !exercise.data)) return <Card><Skeleton height={300} /></Card>;
  if (profile.error) return <ErrorState message={profile.error.message} onRetry={profile.reload} />;
  if (exercise.error) return <ErrorState message={exercise.error.message} onRetry={exercise.reload} />;
  if (!form) return null;

  return (
    <>
      <section className="card"><h2>나의 건강 메뉴</h2><div className="membership-actions"><Link className="btn btn-ghost" to="/health/goals">목표</Link>{!LOCAL_ONLY&&<Link className="btn btn-ghost" to="/health/subscription">멤버십</Link>}<Link className="btn btn-ghost" to="/health/library">운동 라이브러리</Link><Link className="btn btn-ghost" to="/health/pose">맨몸운동 카메라 코치</Link><Link className="btn btn-ghost" to="/health/connections">기기·알림 연동</Link><Link className="btn btn-ghost" to="/health/privacy">개인정보 관리</Link></div><div className="membership-actions"><Link className="btn btn-ghost" to="/health/workout">운동 기록</Link><Link className="btn btn-ghost" to="/health/progress">변화 추적</Link><Link className="btn btn-ghost" to="/health/comparison">측정 비교</Link>{!LOCAL_ONLY&&<Link className="btn btn-ghost" to="/health/agent">AI 코치</Link>}{!LOCAL_ONLY&&<Link className="btn btn-ghost" to="/health/report">월별 리포트</Link>}</div></section>
      <SchoolSelector profile={profile.data} onSaved={profile.reload}/>
      <MeasurementEntry />
      <div onChangeCapture={()=>{setDirty(true);setSaved(false);}}><fieldset disabled={saving} style={{border:0,padding:0,minWidth:0}}><Card title="내 정보">
        <div className="profile-grid">
          <div>
            <label className="field-label">이름</label>
            {LOCAL_ONLY?<input aria-label="이름" className="text-input" maxLength={30} value={name} onChange={e=>setName(e.target.value)} placeholder="이름 또는 별명"/>:<p>{profile.data.name || '—'}</p>}
          </div>
          <div>
            <label className="field-label">성별</label>
            <select aria-label="인체 모형 성별" className="text-input" value={gender} onChange={e=>setGender(e.target.value)}><option value="unspecified">미지정 (중립 모형)</option><option value="male">남성</option><option value="female">여성</option></select><p className="muted">3D 모형과 기준값 조회에 반영됩니다.</p>
          </div>
          <div>
            <label className="field-label">생년월일</label>
            {LOCAL_ONLY?<><input aria-label="생년월일" className="text-input" type="date" min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={birthDate} onChange={e=>setBirthDate(e.target.value)}/><p className="muted">측정일 기준 나이로 문헌 평균 대상 연령을 확인합니다.</p></>:<p>{profile.data.birth_date || '측정되지 않음'}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="height-input">키 (cm)</label>
            <input id="height-input" type="number" className="text-input" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card title="운동 목표 및 환경">
        <div className="profile-grid">
          <div>
            <label className="field-label" htmlFor="goal-select">운동 목표</label>
            <select id="goal-select" className="text-input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
              {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="experience-select">운동 경험</label>
            <select id="experience-select" className="text-input" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>
              {EXPERIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="days-input">주당 운동 일수</label>
            <input id="days-input" type="number" min={1} max={7} className="text-input" value={form.days_per_week}
              onChange={(e) => setForm({ ...form, days_per_week: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="minutes-input">회당 운동 시간(분)</label>
            <input id="minutes-input" type="number" min={10} max={180} className="text-input" value={form.minutes_per_session}
              onChange={(e) => setForm({ ...form, minutes_per_session: e.target.value })} />
          </div>
          <div><label className="field-label" htmlFor="training-mode">운동 방식</label><select id="training-mode" className="text-input" value={form.training_mode||'mixed'} onChange={e=>setForm({...form,training_mode:e.target.value})}><option value="mixed">장비와 맨몸 함께</option><option value="bodyweight">맨몸운동만</option><option value="equipment">헬스장·장비 운동 우선</option></select></div>
          <div>
            <label className="field-label" htmlFor="location-select">운동 장소</label>
            <select id="location-select" className="text-input" value={form.exercise_location} onChange={(e) => setForm({ ...form, exercise_location: e.target.value })}>
              {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label className="field-label">실제로 이용할 수 있는 운동 기구</label><p className="muted">맨몸운동만 선택하면 기구 설정과 관계없이 맨몸으로 구성합니다. 머신은 이용할 종류를 각각 선택하세요.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {EQUIPMENT_OPTIONS.map((o) => (
              <label key={o.value} className={`chip-checkbox ${equipmentSet.has(o.value) ? 'checked' : ''}`}>
                <input type="checkbox" checked={equipmentSet.has(o.value)} onChange={() => toggleEquipment(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="limitations-input">제약 사항 (쉼표로 구분)</label>
          <input id="limitations-input" className="text-input" value={limitationsText} onChange={(e) => setLimitationsText(e.target.value)} placeholder="예: 무릎 통증, 허리 디스크" />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="preferences-input">선호 사항 (쉼표로 구분)</label>
          <input id="preferences-input" className="text-input" value={preferencesText} onChange={(e) => setPreferencesText(e.target.value)} placeholder="예: 하체 균형 개선" />
        </div>
      </Card>

      <Card title="안전 문진">
        <Disclaimer>
          아래 항목 중 하나라도 해당하면 AI가 자동으로 운동 루틴을 생성하지 않으며, 건강센터 또는 의료 전문가와의 상담을 먼저 안내합니다.
        </Disclaimer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {SAFETY_FIELDS.map((f) => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={!!form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
              />
              {f.label}
            </label>
          ))}
        </div>
      </Card>

      {saveError && <ErrorState message={saveError.message} onRetry={save} />}
      {saved && <p className="muted">저장되었습니다.</p>}
      <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? '저장 중...' : '저장하기'}</button></fieldset></div>
    </>
  );
}
