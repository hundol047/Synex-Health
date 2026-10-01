import SetRecordEditor from '../components/exercise/SetRecordEditor.jsx';
import {normalizeSets,previousWorkout} from '../lib/workoutProgress.js';
import WorkoutMode from '../components/exercise/WorkoutMode.jsx';
import React, { useMemo, useState } from 'react';
import WorkoutCalendar from '../components/WorkoutCalendar.jsx';
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
  const [workoutMode,setWorkoutMode]=useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [logging, setLogging] = useState(null);
  const [logError, setLogError] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [minutes,setMinutes]=useState({});
  const [details,setDetails]=useState({});
  const [setRows,setSetRows]=useState({});
  const field=(key,name,value)=>setDetails(d=>({...d,[key]:{...d[key],[name]:value}}));

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

  function rowsFor(ex){
    const key=`${latest.id}-${ex.exercise_id}`;
    const existing=todaysLogs.find(w=>w.routine_id===latest.id&&w.routine_exercise_id===ex.exercise_id);
    return setRows[key]??existing?.set_records??[];
  }
  async function complete(ex) {
    setLogging(ex.exercise_id||ex.exercise_name);
    setLogError(null);
    try {
      const set_records=normalizeSets(rowsFor(ex));
      const saved=await HealthAPI.createWorkout({
        set_records,
        routine_id: latest.id,
        routine_exercise_id: ex.exercise_id,
        day_number: ex.day_number,
        date: today,
        exercise_name: ex.exercise_name,
        sets_completed: details[ex.exercise_id||ex.exercise_name]?.sets==null?ex.sets??null:Number(details[ex.exercise_id||ex.exercise_name].sets),
        reps_completed: details[ex.exercise_id||ex.exercise_name]?.reps || null,
        duration: ex.duration ?? null,
        difficulty: feedback[ex.exercise_id||ex.exercise_name] || 'moderate',
        completed: feedback[ex.exercise_id||ex.exercise_name] !== 'pain' && !(Number(details[ex.exercise_id||ex.exercise_name]?.pain)>0),
        actual_minutes:minutes[ex.exercise_id||ex.exercise_name]==null||minutes[ex.exercise_id||ex.exercise_name]===''?null:Number(minutes[ex.exercise_id||ex.exercise_name]),
        memo: details[ex.exercise_id||ex.exercise_name]?.memo||'',
        rpe: details[ex.exercise_id||ex.exercise_name]?.rpe?Number(details[ex.exercise_id||ex.exercise_name].rpe):null,
        pain: details[ex.exercise_id||ex.exercise_name]?.pain?Number(details[ex.exercise_id||ex.exercise_name].pain):0,
      });
      if(saved.pending_sync){setLogError({message:'기기에 임시 보관했습니다. 앱을 다시 열고 같은 계정으로 로그인해도 전송을 이어갑니다.'});}else await workouts.reload();
    } catch (error) {
      setLogError(error);
    } finally {
      setLogging(null);
    }
  }

  if ((routines.loading || workouts.loading) && !workoutMode) return <Card><Skeleton height={220} /></Card>;
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
      <button className="btn btn-primary" disabled={!dayExercises.length} onClick={()=>setWorkoutMode(true)}>운동 따라하기 · 한 운동씩 시작</button><WorkoutCalendar workouts={workouts.data||[]} routine={latest}/><Card title="오늘의 운동">
        {days.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
            {days.map(([d]) => (
              <button key={d} className={`btn ${activeDay === d ? 'btn-primary' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setSelectedDay(d)}>
                {d}일차
              </button>
            ))}
          </div>
        )}
        {logError && <ErrorState message={logError.message} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayExercises.length === 0 && <p className="muted">이 날에는 계획된 운동이 없습니다.</p>}
          {dayExercises.map((ex,i) => {
            const done=isDone(ex), key=ex.exercise_id||ex.exercise_name;
            const previous=previousWorkout(workouts.data||[],ex,today);
            return <ExerciseCard key={key+i} exercise={ex}>
              {previous&&<p className="muted">지난 기록 ({previous.date}): {previous.set_records?.length?previous.set_records.map(s=>`${s.weight_kg==null?'중량 미기록':`${s.weight_kg}kg`} × ${s.reps}회${s.kind==='warmup'?' (준비)':''}`).join(' / '):`${previous.sets_completed??'—'}세트 · ${previous.reps_completed??'횟수 미기록'}`}</p>}
              {ex.dose_type==='reps'&&<SetRecordEditor rows={rowsFor(ex)} onChange={rows=>setSetRows(old=>({...old,[`${latest.id}-${ex.exercise_id}`]:rows}))} disabled={logging===key}/>}
              {rowsFor(ex).length>0&&<p>세트별 입력을 기준으로 저장합니다. 아래 전체 세트·반복 입력보다 우선합니다.</p>}
              <div className="workout-feedback">
                {[['sets','실제 세트',0,100],['reps','실제 반복 횟수',0,1000],['rpe','운동 힘듦 (RPE 1–10)',1,10],['pain','통증 (0–10)',0,10]].map(([name,label,min,max])=><label key={name}>{label}<input type="number" min={min} max={max} value={details[key]?.[name]??''} onChange={e=>field(key,name,e.target.value)}/></label>)}
                <label>메모<input maxLength="2000" value={details[key]?.memo||''} onChange={e=>field(key,'memo',e.target.value)}/></label>
                <label className="muted" htmlFor={`minutes-${i}`}>실제 운동 시간 (분)</label><input id={`minutes-${i}`} className="text-input" type="number" min="0" max="1440" step=".5" value={minutes[key]??''} onChange={e=>setMinutes({...minutes,[key]:e.target.value})}/><label className="muted" htmlFor={`feedback-${i}`}>오늘의 난이도</label>
                <select id={`feedback-${i}`} className="text-input" value={feedback[key]||'moderate'} onChange={e=>setFeedback({...feedback,[key]:e.target.value})}>
                  <option value="easy">쉬웠어요</option><option value="moderate">적당했어요</option><option value="hard">어려웠어요</option><option value="pain">통증으로 중단</option>
                </select>
                <button className={`btn ${done?'btn-secondary':'btn-primary'}`} disabled={logging===key} onClick={()=>complete(ex)}>
                  {logging===key?'저장 중...':done?'기록 수정':feedback[key]==='pain'?'중단 기록':'완료 기록'}
                </button>
                {done && <span className="muted">오늘 완료</span>}
              </div>
              {(feedback[key]==='pain'||Number(details[key]?.pain)>0) && <p className="motion-cautions">운동을 중단하고 건강센터에 상담하세요. 통증 기록이 있으면 자동 증량하지 않습니다.</p>}
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
