import React, { useState } from 'react';
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
            <span>{SAFETY_MESSAGE}</span>
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

      {genError && genError.status !== 422 && <ErrorState message={genError.message} onRetry={generate} />}

      {!latest && !safetyBlocked && !genError && (
        <Card>
          <EmptyState
            title="아직 생성된 루틴이 없어요"
            description="AI가 최신 체성분 데이터를 기반으로 맞춤 운동 루틴을 만들어드려요."
            action={<button className="btn btn-primary" onClick={generate} disabled={generating}>{generating ? '생성 중...' : '오늘의 루틴 시작하기'}</button>}
          />
        </Card>
      )}

      {latest && (
        <Card
          title={latest.goal || '맞춤 운동 루틴'}
          action={<button className="btn btn-secondary" onClick={generate} disabled={generating}>{generating ? '생성 중...' : '루틴 재생성'}</button>}
        >
          <p className="muted">{latest.summary}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Badge>{latest.duration_weeks}주 프로그램</Badge>
            <Badge tone="blue">주 {latest.days_per_week}회</Badge>
          </div>
        </Card>
      )}

      {days.map(([day, exs]) => (
        <Card key={day} title={`Day ${day}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exs.map((ex, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: 700 }}>
                  <span>{ex.exercise_name}</span>
                  <span className="muted" style={{ fontWeight: 600 }}>
                    {ex.duration ? ex.duration : `${ex.sets ?? '-'}세트 × ${ex.reps ?? '-'}`}
                  </span>
                </div>
                <p className="muted" style={{ marginTop: 2 }}>
                  {ex.rest_seconds != null ? `휴식 ${ex.rest_seconds}초` : ''}{ex.reason ? ` · ${ex.reason}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
