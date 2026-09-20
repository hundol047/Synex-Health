import React, { useState } from 'react';
import ExerciseCard from '../components/exercise/ExerciseCard.jsx';
import { Link } from 'react-router-dom';
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

export default function RoutinePage() {
  const routines = useApiData(() => HealthAPI.listRoutines(), []);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [safetyBlocked, setSafetyBlocked] = useState(false);

  async function generate() {
    setGenerating(true);
    setGenError(null);
    setSafetyBlocked(false);
    try {
      await HealthAPI.generateRoutine();
      await routines.reload();
    } catch (error) {
      if (error.status === 409 || error.message === SAFETY_MESSAGE) {
        setSafetyBlocked(true);
        setGenError(error);
      } else {
        setGenError(error);
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

      {genError && !safetyBlocked && genError.status !== 422 && <ErrorState message={genError.message} onRetry={generate} />}

      {!latest && !safetyBlocked && !genError && (
        <Card>
          <EmptyState
            title="아직 생성된 루틴이 없어요"
            description="최신 체성분·운동환경·수행 피드백에 맞춰 동작 안내가 있는 루틴을 만듭니다."
            action={<button className="btn btn-primary" onClick={generate} disabled={generating}>{generating ? '생성 중...' : '오늘의 루틴 시작하기'}</button>}
          />
        </Card>
      )}

      {latest && !safetyBlocked && (
        <Card
          title={latest.goal || '맞춤 운동 루틴'}
          action={<button className="btn btn-secondary" onClick={generate} disabled={generating}>{generating ? '생성 중...' : '루틴 재생성'}</button>}
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
            <div className="plan-sources">{(latest.sources||[]).map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div>
          </details>
          <p className="muted" style={{fontSize:'.76rem',marginTop:12}}>검토 가능한 규칙 기반 맞춤 추천 · 새 측정값을 등록하면 기존 루틴을 자동 재검토합니다.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Badge>{latest.duration_weeks}주 프로그램</Badge>
            <Badge tone="blue">주 {latest.days_per_week}회</Badge>
          </div>
        </Card>
      )}

      {!safetyBlocked && days.map(([day, exs]) => (
        <Card key={day} title={`Day ${day}`} action={latest.day_minutes?.[String(day)] != null ? <Badge>약 {latest.day_minutes[String(day)]}분</Badge> : null}>
          <p className="muted">{latest.schedule?.[day-1] || '동작을 눌러 자세를 확인하세요.'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exs.map((ex,i)=><ExerciseCard key={ex.exercise_id||i} exercise={ex}/>)}
          </div>
        </Card>
      ))}
    </>
  );
}
