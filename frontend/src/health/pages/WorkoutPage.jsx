import React, { useMemo, useState } from 'react';
import ExerciseCard from '../components/exercise/ExerciseCard.jsx';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Skeleton, ErrorState, EmptyState, Badge } from '../../shared/components/ui.jsx';
import { useApiData } from '../lib/useApiData.js';

function todayStr() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
  const [feedback, setFeedback] = useState({});

  const latest = (routines.data || [])[0];
  const days = useMemo(() => groupByDay(latest?.exercises), [latest]);
  const activeDay = selectedDay ?? days[0]?.[0] ?? 1;
  const dayExercises = days.find(([d]) => d === activeDay)?.[1] || [];

  const today = todayStr();
  const todaysLogs = (workouts.data || []).filter((w) => w.date === today);

  function isDone(ex) {
    return todaysLogs.some(w=>w.routine_id===latest.id && w.day_number===ex.day_number &&
      (ex.exercise_id?w.routine_exercise_id===ex.exercise_id:w.exercise_name===ex.exercise_name) && w.completed);
  }

  async function complete(ex) {
    setLogging(ex.exercise_id||ex.exercise_name);
    setLogError(null);
    try {
      await HealthAPI.createWorkout({
        routine_id: latest.id,
        routine_exercise_id: ex.exercise_id,
        day_number: ex.day_number,
        date: today,
        exercise_name: ex.exercise_name,
        sets_completed: ex.sets ?? null,
        reps_completed: ex.reps ?? null,
        duration: ex.duration ?? null,
        difficulty: feedback[ex.exercise_id||ex.exercise_name] || 'moderate',
        completed: feedback[ex.exercise_id||ex.exercise_name] !== 'pain',
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

  if (latest.needs_review) return <Card><EmptyState title="운동 계획을 먼저 갱신하세요" description={latest.review_reason}
    action={<Link className="btn btn-primary" to="/health/routine">루틴 재생성</Link>}/></Card>;

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
          {dayExercises.map((ex,i) => {
            const done=isDone(ex), key=ex.exercise_id||ex.exercise_name;
            return <ExerciseCard key={key+i} exercise={ex}>
              <div className="workout-feedback">
                <label className="muted" htmlFor={`feedback-${i}`}>오늘의 난이도</label>
                <select id={`feedback-${i}`} className="text-input" value={feedback[key]||'moderate'} onChange={e=>setFeedback({...feedback,[key]:e.target.value})}>
                  <option value="easy">쉬웠어요</option><option value="moderate">적당했어요</option><option value="hard">어려웠어요</option><option value="pain">통증으로 중단</option>
                </select>
                <button className={`btn ${done?'btn-secondary':'btn-primary'}`} disabled={logging===key} onClick={()=>complete(ex)}>
                  {logging===key?'저장 중...':done?'기록 수정':feedback[key]==='pain'?'중단 기록':'완료 기록'}
                </button>
                {done && <span className="muted">오늘 완료</span>}
              </div>
              {feedback[key]==='pain' && <p className="motion-cautions">운동을 중단하고 건강센터에 상담하세요. 통증 기록이 있으면 자동 증량하지 않습니다.</p>}
            </ExerciseCard>;
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
