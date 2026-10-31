import ExerciseReplacement from '../components/exercise/ExerciseReplacement.jsx';
import React, { useState } from 'react';
import ExerciseCard from '../components/exercise/ExerciseCard.jsx';
import RoutineConditions from '../components/RoutineConditions.jsx';
import { periodLabel } from '../lib/exerciseProfileOptions.js';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState, Badge } from '../../shared/components/ui.jsx';
import { useApiData } from '../lib/useApiData.js';

const SAFETY_MESSAGE = '건강센터 또는 의료전문가와 상담 후 운동계획을 설정하세요.';

function groupByDay(exercises) {
  const map = new Map();
  for (const ex of exercises || []) {
    if (!map.has(ex.day_number)) map.set(ex.day_number, []);
    map.get(ex.day_number).push(ex);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function DayCard({ latest, day, exs, onReplaced }) {
  return (
    <Card title={`${day}일차 · ${exs.length}개 운동`} action={latest.day_minutes?.[String(day)] != null ? <Badge>약 {latest.day_minutes[String(day)]}분</Badge> : null}>
      {latest.day_timing?.[day]&&<div className="plan-stats" aria-label={`${day}일차 시간 구성`}><div className="plan-stat"><span>직접 준비운동</span><strong>{latest.day_timing[day].warmup_seconds}초</strong></div><div className="plan-stat"><span>실제 운동</span><strong>{Math.round(latest.day_timing[day].work_seconds/6)/10}분</strong></div><div className="plan-stat"><span>휴식·동작 전환</span><strong>{latest.day_timing[day].rest_seconds}초</strong></div></div>}
      <p className="muted">{latest.schedule?.[day-1] || '작은 시범으로 동작을 확인하고 자세히 보기를 눌러 확대하세요.'}</p>
      {latest.day_timing?.[day]&&<p className="muted">시작 전 가벼운 걷기·제자리걷기로 준비하세요. 예상 시간은 기본 시범 속도 기준이며, 운동 후 자동 추천 스트레칭은 별도입니다. 몸 상태에 따라 쉬는 시간을 늘리거나 중단할 수 있습니다.</p>}
      {!latest.needs_review&&<Link className="btn btn-primary" to={`/health/workout?mode=tempo&day=${day}&routine=${encodeURIComponent(latest.id)}`}>{day}일차 루틴 시작</Link>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {exs.map((ex,i)=><ExerciseCard key={`${latest.id}-${ex.exercise_id||i}`} exercise={ex}><ExerciseReplacement routine={latest} exercise={ex} onReplaced={onReplaced}/></ExerciseCard>)}
      </div>
    </Card>
  );
}

// Periods render as full-width header bars over unboxed content, so month > week > day does not nest card in card.
function PeriodGroup({ level, title, badge, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`period-group period-group--${level}`}>
      <button type="button" className="period-group-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <strong>{title}</strong>{badge && <Badge>{badge}</Badge>}<ChevronDown size={18} className="period-group-chevron" />
      </button>
      {/* Closed groups render nothing, so long plans do not mount every exercise preview. */}
      {open && <div className="period-group-body">{children}</div>}
    </section>
  );
}

// The routine is one weekly template; it repeats for every week of the chosen period.
function RoutinePeriods({ routine, days, renderDay }) {
  if (routine.period_unit === 'day') return days.map(([day, exs]) => renderDay(day, exs));
  const months = routine.period_unit === 'month' ? routine.period_length : null;
  const totalWeeks = months ? months * 4 : routine.period_length || routine.duration_weeks || 1;
  const elapsed = Math.floor((Date.now() - Date.parse(routine.created_at)) / (7 * 86400000));
  const current = Number.isFinite(elapsed) ? Math.min(Math.max(elapsed, 0), totalWeeks - 1) + 1 : 1;
  const week = (w) => (
    <PeriodGroup key={w} level="week" title={`${w}주차`} badge={w === current ? '이번 주' : null} defaultOpen={w === current}>
      {days.map(([day, exs]) => renderDay(day, exs))}
    </PeriodGroup>
  );
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (!months) return range(1, totalWeeks).map(week);
  return range(1, months).map((m) => {
    const weeks = range((m - 1) * 4 + 1, m * 4);
    return (
      <PeriodGroup key={`m${m}`} level="month" title={`${m}개월차`} badge={weeks.includes(current) ? '진행 중' : null} defaultOpen={weeks.includes(current)}>
        {weeks.map(week)}
      </PeriodGroup>
    );
  });
}

export default function RoutinePage() {
  const history = useApiData(() => HealthAPI.adaptiveHistory(), []);
  const routines = useApiData(() => HealthAPI.listRoutines(), []);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [safetyBlocked, setSafetyBlocked] = useState(false);
  // Every generation first re-checks the profile's goal/environment and per-region purposes.
  const [checking, setChecking] = useState(false);
  const openCheck = () => { setGenError(null); setSafetyBlocked(false); setChecking(true); };

  async function generate() {
    setGenerating(true);
    setGenError(null);
    setSafetyBlocked(false);
    try {
      await HealthAPI.generateRoutine();
      setChecking(false);
      await routines.reload();
      await history.reload();
    } catch (error) {
      if (error.status === 409 || error.message === SAFETY_MESSAGE) {
        setSafetyBlocked(true);
        setGenError(error);
        setChecking(false);
      } else {
        setGenError(error);
        if (error.status === 422) setChecking(false);
      }
    } finally {
      setGenerating(false);
    }
  }

  if (routines.loading) return <Card><Skeleton height={220} /></Card>;
  if (routines.error) return <ErrorState message={routines.error.message} onRetry={routines.reload} />;

  const latest = (routines.data || [])[0];
  const days = latest ? groupByDay(latest.exercises) : [];

  return (
    <>
      <Link className="btn btn-secondary" to="/health/library">맨몸·헬스장 운동 찾아보기</Link>
      {checking && <RoutineConditions onConfirm={generate} onCancel={() => setChecking(false)} busy={generating} />}
      {safetyBlocked && (
        <Card>
          <div className="error-state">
            <strong>운동 루틴을 생성할 수 없습니다</strong>
            <span>{genError?.message || SAFETY_MESSAGE}</span>
            <p className="muted" style={{ margin: 0 }}>프로필의 안전 문진 항목을 실수로 체크했다면 프로필에서 수정할 수 있습니다.</p>
            <Link className="btn btn-secondary" to="/health/profile" style={{ alignSelf: 'flex-start' }}>프로필에서 확인하기</Link>
          </div>
        </Card>
      )}

      {genError && genError.status === 422 && (
        <Card>
          <EmptyState
            title="운동 프로필이 필요해요"
            description={genError.message}
            action={<Link className="btn btn-primary" to="/health/profile">프로필 입력하기</Link>}
          />
        </Card>
      )}

      {genError && !safetyBlocked && genError.status !== 422 && <ErrorState message={genError.message} onRetry={openCheck} />}

      {!latest && !safetyBlocked && !genError && !checking && (
        <Card>
          <EmptyState
            title="아직 생성된 루틴이 없어요"
            description="최신 체성분·운동환경·수행 피드백에 맞춰 동작 안내가 있는 루틴을 만듭니다."
            action={<button className="btn btn-primary" onClick={openCheck}>내 운동 계획 만들기</button>}
          />
        </Card>
      )}

      {latest && !safetyBlocked && (
        <Card
          title={latest.goal || '맞춤 운동 루틴'}
          action={<button className="btn btn-secondary" onClick={openCheck}>루틴 재생성</button>}
        >
          {latest.needs_review && <p role="alert" className="motion-cautions">{latest.review_reason}</p>}
          <p className="muted">{latest.summary}</p>
          {latest.input_snapshot && <div className="plan-stats">
            {[["체중",latest.input_snapshot.weight_kg,"kg"],["골격근량",latest.input_snapshot.muscle_kg,"kg"],
              ["체지방률",latest.input_snapshot.body_fat_percent,"%"],["회당 가능 시간",latest.input_snapshot.profile?.minutes_per_session,"분"]]
              .map(([label,value,unit])=><div className="plan-stat" key={label}><span>{label}</span><strong>{value==null?'미입력':`${value}${unit}`}</strong></div>)}
          </div>}
          {latest.rationale?.length > 0 && <><strong>나에게 이 운동을 추천한 이유</strong><ul className="plan-rationale">{latest.rationale.map(t=><li key={t}>{t}</li>)}</ul></>}
          {latest.progression && <div className="motion-intensity"><strong>이번 계획의 조정</strong><p>{latest.progression}</p></div>}
          <details style={{marginTop:16}}><summary>추천 기준과 확인할 사항</summary>
            <ul className="plan-notices">{(latest.notices||[]).map(t=><li key={t}>{t}</li>)}</ul>
            {latest.algorithm_version==='device-balanced-v2'&&<p>앱 구성 비교 참고 · 아래 자료는 의료·운동 처방의 근거가 아닙니다.</p>}<div className="plan-sources">{(latest.sources||[]).map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div>
          </details>
          <p className="muted" style={{fontSize:'.76rem',marginTop:12}}>검토 가능한 규칙 기반 맞춤 추천 · 새 측정값을 등록하면 기존 루틴을 자동 재검토합니다.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Badge>{periodLabel(latest)}</Badge>
            {latest.period_unit !== 'day' && <Badge tone="blue">주 {latest.days_per_week}회</Badge>}
          </div>
        </Card>
      )}


      {!safetyBlocked && latest && <RoutinePeriods routine={latest} days={days}
        renderDay={(day, exs) => <DayCard key={day} latest={latest} day={day} exs={exs} onReplaced={() => Promise.all([routines.reload(), history.reload()])} />} />}
      <Card title="운동 계획 변경 이력">{history.error?<ErrorState message={history.error.message} onRetry={history.reload}/>:history.loading?<Skeleton/>:!(history.data||[]).length?<p className="muted">루틴을 생성하면 변경 이유가 여기에 기록됩니다.</p>:(history.data||[]).map(h=><details key={h.id}><summary>{h.date.slice(0,10)} · {h.new_routine.goal}</summary><p>{h.reason}</p><p>이전: {h.old_routine?.goal||'첫 계획'} → 현재: {h.new_routine.goal}</p><p>기록된 완료 비율: {h.workout_adherence==null?'자료 없음':`${Math.round(h.workout_adherence*100)}%`}</p></details>)}</Card>
    </>
  );
}
