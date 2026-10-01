import WorkoutRecordForm from '../components/exercise/WorkoutRecordForm.jsx';
import {previousWorkout} from '../lib/workoutProgress.js';
import WorkoutMode from '../components/exercise/WorkoutMode.jsx';
import React, { useMemo, useState } from 'react';
import WorkoutCalendar from '../components/WorkoutCalendar.jsx';
import ExerciseCard from '../components/exercise/ExerciseCard.jsx';
import { Link } from 'react-router-dom';
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
  const [workoutMode,setWorkoutMode]=useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

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

  if (((routines.loading && !routines.data) || (workouts.loading && !workouts.data)) && !workoutMode) return <Card><Skeleton height={220} /></Card>;
  if (routines.error) return <ErrorState message={routines.error.message} onRetry={routines.reload} />;
  if (workouts.error) return <ErrorState message={workouts.error.message} onRetry={workouts.reload} />;

  if (!latest) {
    return (
      <Card>
        <EmptyState
          title="운동 루틴이 없어요"
          description="루틴 페이지에서 먼저 맞춤 루틴을 생성해 보세요."
          action={<Link className="btn btn-primary" to="/health/routine">루틴 만들러 가기</Link>}
        />
      </Card>
    );
  }

  if (latest.needs_review) return <Card><EmptyState title="운동 계획을 먼저 갱신하세요" description={latest.review_reason}
    action={<Link className="btn btn-primary" to="/health/routine">루틴 재생성</Link>}/></Card>;

  if(workoutMode)return <Card><WorkoutMode routine={latest} exercises={dayExercises} workouts={workouts.data||[]} onSaved={workouts.reload} onClose={()=>setWorkoutMode(false)}/></Card>;

  return (
    <>
      <section className="workout-hero"><span className="workout-eyebrow">TODAY · 오늘의 움직임</span><h1>내 속도로, 하나씩</h1><p>{activeDay}일차 · {dayExercises.length}개 운동 · {dayExercises.filter(isDone).length}개 완료</p><progress aria-label="오늘 운동 진행률" value={dayExercises.filter(isDone).length} max={Math.max(1,dayExercises.length)}/><button className="btn btn-primary" disabled={!dayExercises.length} onClick={()=>setWorkoutMode(true)}>운동 따라하기 · 한 운동씩 시작</button><Link to="/health/routine">운동 교체·계획 확인</Link></section><Card title="오늘의 운동">
        {days.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
            {days.map(([d]) => (
              <button key={d} className={`btn ${activeDay === d ? 'btn-primary' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap' }} aria-pressed={activeDay===d} onClick={() => setSelectedDay(d)}>
                {d}일차
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayExercises.length === 0 && <p className="muted">이 날에는 계획된 운동이 없습니다.</p>}
          {dayExercises.map((ex,i) => {
            const key=ex.exercise_id||ex.exercise_name;
            const previous=previousWorkout(workouts.data||[],ex,today);
            return <ExerciseCard key={key+i} exercise={ex}>
              {previous&&<p className="muted">지난 기록 ({previous.date}): {previous.set_records?.length?previous.set_records.map(s=>`${s.weight_kg==null?'중량 미기록':`${s.weight_kg}kg`} × ${s.reps}회${s.kind==='warmup'?' (준비)':''}`).join(' / '):`${previous.sets_completed??'—'}세트 · ${previous.reps_completed??'횟수 미기록'}`}</p>}
              <WorkoutRecordForm key={`${latest.id}-${today}-${key}`} exercise={ex} routine={latest} date={today}
                existing={todaysLogs.find(w=>w.routine_id===latest.id&&w.day_number===ex.day_number&&(ex.exercise_id?w.routine_exercise_id===ex.exercise_id:w.exercise_name===ex.exercise_name))}
                previous={previous} onSaved={workouts.reload}/>

            </ExerciseCard>;
          })}
        </div>
      </Card>

      <details className="workout-calendar-disclosure"><summary>운동 캘린더·연속 기록 보기</summary><WorkoutCalendar workouts={workouts.data||[]} routine={latest}/></details>
      <Card title="최근 운동 기록">
        {(workouts.data || []).length === 0 ? (
          <EmptyState title="기록이 없어요" description="운동을 완료하면 여기에 기록이 쌓여요." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...(workouts.data || [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 15).map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
                <span>{w.date} · {w.exercise_name}{w.set_records?.length>0&&<small style={{display:'block'}}>{w.set_records.map(s=>`${s.weight_kg==null?'미기록':`${s.weight_kg}kg`} × ${s.reps}회`).join(' / ')}</small>}</span>
                <Badge tone={w.completed ? 'success' : 'blue'}>{w.completed ? '완료' : '미완료'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
