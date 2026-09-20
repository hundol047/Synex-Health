import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState, Badge } from '../../shared/components/ui.jsx';
import { useApiData } from '../lib/useApiData.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function groupByDay(exercises) {
  const map = new Map();
  for (const ex of exercises || []) {
    if (!map.has(ex.day_number)) map.set(ex.day_number, []);
    map.get(ex.day_number).push(ex);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export default function WorkoutPage() {
  const routines = useApiData(() => HealthAPI.listRoutines(), []);
  const workouts = useApiData(() => HealthAPI.listWorkouts(), []);
  const [selectedDay, setSelectedDay] = useState(null);
  const [logging, setLogging] = useState(null);
  const [logError, setLogError] = useState(null);

  const latest = (routines.data || [])[0];
  const days = useMemo(() => groupByDay(latest?.exercises), [latest]);
  const activeDay = selectedDay ?? days[0]?.[0] ?? 1;
  const dayExercises = days.find(([d]) => d === activeDay)?.[1] || [];

  const today = todayStr();
  const todaysLogs = (workouts.data || []).filter((w) => w.date === today);

  function isDone(name) {
    return todaysLogs.some((w) => w.exercise_name === name && w.completed);
  }

  async function complete(ex) {
    setLogging(ex.exercise_name);
    setLogError(null);
    try {
      await HealthAPI.createWorkout({
        routine_id: latest.id,
        date: today,
        exercise_name: ex.exercise_name,
        sets_completed: ex.sets ?? null,
        reps_completed: ex.reps ?? null,
        duration: ex.duration ?? null,
        difficulty: 'moderate',
        completed: true,
        memo: '',
      });
      await workouts.reload();
    } catch (error) {
      setLogError(error);
    } finally {
      setLogging(null);
    }
  }

  if (routines.loading || workouts.loading) return <Card><Skeleton height={220} /></Card>;
  if (routines.error) return <ErrorState message={routines.error.message} onRetry={routines.reload} />;
  if (workouts.error) return <ErrorState message={workouts.error.message} onRetry={workouts.reload} />;

  if (!latest) {
    return (
      <Card>
        <EmptyState
          title="운동 루틴이 없어요"
          description="루틴 페이지에서 먼저 AI 맞춤 루틴을 생성해 보세요."
          action={<Link className="btn btn-primary" to="/health/routine">루틴 만들러 가기</Link>}
        />
      </Card>
    );
  }

  return (
    <>
      <Card title="오늘의 운동">
        {days.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
            {days.map(([d]) => (
              <button key={d} className={`btn ${activeDay === d ? 'btn-primary' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setSelectedDay(d)}>
                Day {d}
              </button>
            ))}
          </div>
        )}
        {logError && <ErrorState message={logError.message} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayExercises.length === 0 && <p className="muted">이 날에는 계획된 운동이 없습니다.</p>}
          {dayExercises.map((ex, i) => {
            const done = isDone(ex.exercise_name);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{ex.exercise_name}</div>
                  <div className="muted">{ex.duration ? ex.duration : `${ex.sets ?? '-'}세트 × ${ex.reps ?? '-'}`}</div>
                </div>
                <button
                  className={`btn ${done ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={done || logging === ex.exercise_name}
                  onClick={() => complete(ex)}
                >
                  {done ? (<><CheckCircle2 size={16} /> 완료</>) : logging === ex.exercise_name ? '저장 중...' : (<><Circle size={16} /> 완료</>)}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="최근 운동 기록">
        {(workouts.data || []).length === 0 ? (
          <EmptyState title="기록이 없어요" description="운동을 완료하면 여기에 기록이 쌓여요." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...(workouts.data || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 15).map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
                <span>{w.date} · {w.exercise_name}</span>
                <Badge tone={w.completed ? 'success' : 'blue'}>{w.completed ? '완료' : '미완료'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
