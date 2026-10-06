import {secureUUID} from '../../../shared/lib/uuid.js';
import BottomActions from '../../../shared/components/BottomActions.jsx';
import MotionFigure from './MotionFigure.jsx';
import {useWorkoutDraft} from '../../lib/useWorkoutDraft.js';
import {targetSeconds,workoutStatus,WORKOUT_STATUS} from '../../lib/workoutStatus.js';
import WorkoutTimer from './WorkoutTimer.jsx';
import SetRecordEditor from './SetRecordEditor.jsx';
import {normalizeSets,previousWorkout} from '../../lib/workoutProgress.js';
import React,{useEffect,useState,useRef,useCallback} from 'react';
import ExerciseCard from './ExerciseCard.jsx';
import {HealthAPI} from '../../../shared/lib/api.js';
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function WorkoutMode({routine,exercises,workouts=[],onSaved,onClose}){
 const [poseEvaluation,setPoseEvaluation]=useState(null);
 const [exerciseDrafts,setExerciseDrafts]=useState({});
 const [resumePrompt,setResumePrompt]=useState(false);
 const [sessionStart,setSessionStart]=useState(()=>Date.now());
 const [index,setIndex]=useState(0),[sets,setSets]=useState(0),[restUntil,setRestUntil]=useState(null),[remaining,setRemaining]=useState(0);
 const [rpe,setRpe]=useState(''),[pain,setPain]=useState('0'),[reps,setReps]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [voice,setVoice]=useState(false),[vibration,setVibration]=useState(false),[records,setRecords]=useState([]),[finished,setFinished]=useState(false);
 const [setRows,setSetRows]=useState([]),[weight,setWeight]=useState('');
 const [paused,setPaused]=useState(false),[elapsedMs,setElapsedMs]=useState(0);
 const [timerSeconds,setTimerSeconds]=useState(0),[timedSets,setTimedSets]=useState([]),[performedSeconds,setPerformedSeconds]=useState(0);
 const [recordZone,setRecordZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
 const [recordDate,setRecordDate]=useState(localDate),[baseRevisions,setBaseRevisions]=useState(()=>Object.fromEntries(exercises.map(e=>[e.exercise_id,workouts.find(w=>w.routine_id===routine.id&&w.date===localDate()&&w.routine_exercise_id===e.exercise_id)?.revision||0])));
 const [mutationIds,setMutationIds]=useState(()=>Object.fromEntries(exercises.map(e=>[e.exercise_id,secureUUID()])));
 const clock=useRef({start:Date.now(),pausedAt:null,pausedMs:0});
 const pause=useCallback(()=>{if(clock.current.pausedAt===null){clock.current.pausedAt=Date.now();setElapsedMs(Math.max(0,clock.current.pausedAt-clock.current.start-clock.current.pausedMs));setPaused(true);window.speechSynthesis?.cancel();}},[]);
 function resume(){const c=clock.current;if(c.pausedAt!==null){const gap=Date.now()-c.pausedAt;c.pausedMs+=gap;c.pausedAt=null;setResumePrompt(false);setPaused(false);}}
 function elapsed(){const c=clock.current;return Math.max(0,(c.pausedAt??Date.now())-c.start-c.pausedMs);}
 function resetClock(){clock.current={start:Date.now(),pausedAt:null,pausedMs:0};setPaused(false);setElapsedMs(0);}
 const dirty=!finished&&(Object.keys(exerciseDrafts).length>0||elapsedMs>0||index>0||sets>0||setRows.length>0||reps!==''||weight!==''||rpe!==''||Number(pain)>0||timerSeconds>0||timedSets.length>0||performedSeconds>0);
 const draft=useWorkoutDraft(`guided:${routine.id}:${exercises[0]?.day_number}`,{poseEvaluation,exerciseDrafts,routine_id:routine.id,start_time:sessionStart,restUntil,index,sets,setRows,reps,weight,rpe,pain,records,date:recordDate,time_zone:recordZone,baseRevisions,mutationIds,elapsedMs,remaining,timerSeconds,timedSets,performedSeconds},dirty,s=>{
  if(!Number.isInteger(s.index)||s.index<0||s.index>=exercises.length)return;
  setPoseEvaluation(s.poseEvaluation||null);setSessionStart(s.start_time||Date.now());setExerciseDrafts(s.exerciseDrafts||{});setResumePrompt(true);setIndex(s.index);setSets(s.sets||0);setSetRows(s.setRows||[]);setReps(s.reps||'');setWeight(s.weight||'');setRpe(s.rpe||'');setPain(s.pain||'0');setRecords(s.records||[]);setRecordDate(s.date||localDate());setRecordZone(s.time_zone||'UTC');setBaseRevisions(s.baseRevisions||{});setMutationIds(s.mutationIds||{});
  setTimerSeconds(s.timerSeconds||0);setTimedSets(s.timedSets||[]);setPerformedSeconds(s.performedSeconds||0);
  setElapsedMs(s.elapsedMs||0);clock.current={start:Date.now()-(s.elapsedMs||0),pausedAt:Date.now(),pausedMs:0};setPaused(true);
  setRemaining(s.restUntil?Math.max(0,Math.ceil((s.restUntil-Date.now())/1000)):0);setRestUntil(s.restUntil||null);
 });
 useEffect(()=>{if(paused||finished)return;const id=setInterval(()=>setElapsedMs(elapsed()),1000);return()=>clearInterval(id);},[paused,finished]);
 async function leave(){if(!dirty){onClose();return;}if(window.confirm('진행 중인 입력을 기기에 임시 저장하고 목록으로 나갈까요?')){try{pause();await draft.flush();onClose();}catch(e){setError('임시 저장에 실패했습니다. '+e.message);}}}
 useEffect(()=>{const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[pause]);
 useEffect(()=>{if(!dirty||finished)return;const before=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty,finished]);
 function navigate(next,fromSave=false){
  if(next<0||next>=exercises.length||(busy&&!fromSave))return;
  setExerciseDrafts(old=>({...old,[index]:{poseEvaluation,sets,setRows,reps,weight,rpe,pain,elapsedMs:elapsed(),timerSeconds,timedSets,performedSeconds,restUntil}}));
  const saved=exerciseDrafts[next]||{};setPoseEvaluation(saved.poseEvaluation||null);setIndex(next);setSets(saved.sets||0);setSetRows(saved.setRows||[]);setReps(saved.reps||'');setWeight(saved.weight||'');setRpe(saved.rpe||'');setPain(saved.pain||'0');setTimerSeconds(saved.timerSeconds||0);setTimedSets(saved.timedSets||[]);setPerformedSeconds(saved.performedSeconds||0);setRestUntil(saved.restUntil||(fromSave?restUntil:null));setElapsedMs(saved.elapsedMs||0);clock.current={start:Date.now()-(saved.elapsedMs||0),pausedAt:Date.now(),pausedMs:0};setPaused(true);
 }
 const exercise=exercises[index];
 const nextPreview=sets<(exercise?.sets||1)?exercise:exercises[index+1];
 const previous=exercise?previousWorkout(workouts,exercise,localDate()):null;
 function notify(message){if(vibration)navigator.vibrate?.(100);if(voice&&'speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(message));}}
 useEffect(()=>{if(!restUntil||finished)return;const tick=()=>{const seconds=Math.max(0,Math.ceil((restUntil-Date.now())/1000));setRemaining(seconds);if(!seconds){setRestUntil(null);notify('휴식이 끝났습니다.');}};tick();const id=setInterval(tick,250);return()=>clearInterval(id);},[restUntil,voice,vibration,finished]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();navigator.vibrate?.(0);},[]);
 function completeSet(){if(!draft.ready||paused||restUntil||busy||sets>=(exercise.sets||1))return;
 if((exercise.dose_type||'reps')==='reps'){
  try{const row=normalizeSets([{weight_kg:weight,reps,kind:'working'}])[0];if(row.reps===0)throw Error('완료한 세트의 반복 횟수를 입력하세요.');setSetRows(old=>[...old,{...row,rpe:rpe===''?null:Number(rpe),pain:Number(pain)}]);setError('');}catch(e){setError(e.message);return;}
 }
 if(exercise.dose_type==='hold'){if(timerSeconds<=0){setError('먼저 유지시간을 측정하세요.');return;}setTimedSets(old=>[...old,timerSeconds]);setTimerSeconds(0);}
 if(exercise.dose_type==='duration'){if(timerSeconds<=0){setError('먼저 운동 시간을 측정하세요.');return;}setPerformedSeconds(timerSeconds);setTimerSeconds(0);}
 const next=sets+1;setSets(next);notify('세트를 완료했습니다.');setRestUntil(Date.now()+(exercise.rest_seconds??60)*1000);}
 async function save(){if(busy||!draft.ready)return;if(Number(pain)>0)pause();setBusy(true);setError('');try{
  const set_records=normalizeSets(setRows);
  const stopping=Number(pain)>0;
  const savedTimedSets=stopping&&exercise.dose_type==='hold'&&timerSeconds>0?[...timedSets,timerSeconds]:timedSets;
  const savedSeconds=performedSeconds+(stopping&&exercise.dose_type==='duration'?timerSeconds:0);
  const savedSets=exercise.dose_type==='hold'?savedTimedSets.filter(s=>s>0).length:exercise.dose_type==='duration'&&savedSeconds>0?Math.max(1,sets):sets;
  const body={pose_evaluation:poseEvaluation,set_records,time_zone:recordZone,timed_sets_seconds:savedTimedSets,performed_seconds:savedSeconds,expected_revision:baseRevisions[exercise.exercise_id]||0,mutation_id:mutationIds[exercise.exercise_id],routine_id:routine.id,routine_exercise_id:exercise.exercise_id,day_number:exercise.day_number,date:recordDate,exercise_name:exercise.exercise_name,sets_completed:savedSets,reps_completed:reps||null,rpe:rpe===''?null:Number(rpe),pain:Number(pain),difficulty:Number(pain)>0?'pain':Number(rpe)>=8?'hard':Number(rpe)>0&&Number(rpe)<=5?'easy':'moderate',completed:Number(pain)===0,actual_minutes:Number((elapsed()/60000).toFixed(1)),memo:'운동 따라하기'};
  body.completion_status=workoutStatus(body,exercise);body.completed=body.completion_status==='completed';
  await draft.flush();
  const result=await HealthAPI.createWorkout(body);
  setRecords(old=>[...old.filter(r=>r.routine_exercise_id!==exercise.exercise_id),{...result,pending_sync:!!result.pending_sync}]);setBaseRevisions(old=>({...old,[exercise.exercise_id]:result.revision||old[exercise.exercise_id]||0}));setMutationIds(old=>({...old,[exercise.exercise_id]:secureUUID()}));
  const savedIds=new Set([...records.map(r=>r.routine_exercise_id),exercise.exercise_id]);
  const next=exercises.findIndex((e,i)=>i>index&&!savedIds.has(e.exercise_id));
  const remainingIndex=next>=0?next:exercises.findIndex(e=>!savedIds.has(e.exercise_id));
  if(Number(pain)>0||remainingIndex<0){setFinished(true);if(Object.keys(exerciseDrafts).some(i=>!savedIds.has(exercises[Number(i)]?.exercise_id)))await draft.flush();else await draft.clear();}else{navigate(remainingIndex,true);notify('다음 운동입니다.');}
  await onSaved();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 const minutes=records.reduce((s,r)=>s+(r.actual_minutes||0),0),ratings=records.filter(r=>r.rpe!=null);
 if(finished)return <section className="workout-mode"><h2>오늘의 운동 요약</h2><p>{records.length}개 운동 · {records.reduce((s,r)=>s+(r.sets_completed||0),0)}세트 · {minutes.toFixed(1)}분</p><p>완료 {Math.round(records.filter(r=>r.completed).length/exercises.length*100)}% · 통증 {Math.max(0,...records.map(r=>r.pain||0))} · 평균 힘듦 {ratings.length?(ratings.reduce((s,r)=>s+r.rpe,0)/ratings.length).toFixed(1):'미기록'}</p><ul>{records.map((r,i)=><li key={`${r.id||'record'}-${i}`}>{r.exercise_name} · 계획 {exercises.find(e=>e.exercise_id===r.routine_exercise_id)?.sets}세트 × {exercises.find(e=>e.exercise_id===r.routine_exercise_id)?.reps} · 실제 {r.set_records?.map(s=>s.reps).join(' / ')||r.sets_completed+'세트'} · {WORKOUT_STATUS[r.completion_status]||(r.completed?'완료':'일부 수행')}</li>)}</ul>{records.some(r=>r.pending_sync)&&<p role="status">일부 기록은 기기 임시 보관 중입니다. 같은 계정으로 다시 로그인하면 전송을 이어갑니다.</p>}{records.some(r=>r.pain>0)&&<p role="alert">통증이 기록되어 진행을 중단했습니다. 건강센터에 상담하세요.</p>}<button className="btn btn-primary" onClick={onClose}>목록으로</button></section>;
 if(!exercise)return null;
 return <section className="workout-mode"><div className="motion-controls"><h2>운동 따라하기 · {index+1} / {exercises.length}</h2><button className="btn btn-ghost" disabled={busy} onClick={leave}>목록으로</button></div><div className="workout-mode-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={paused?resume:pause}>{paused?'운동 계속하기':'잠시 멈추기'}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={async()=>{if(window.confirm('진행 중 임시 입력을 버릴까요? 이미 저장한 운동 기록은 유지됩니다.')){await draft.clear();onClose();}}}>임시 입력 버리기</button><span className="muted">화면을 벗어나면 자동 일시정지됩니다.</span></div>{paused&&<div role="status" className="workout-mode-paused">일시정지 중 · 운동 기록 시간이 멈췄어요. 휴식은 실제 시간 기준으로 진행됩니다. 준비되면 계속하기를 눌러 주세요.</div>}{resumePrompt&&<div role="alert"><p>진행 중인 운동이 있습니다.</p><button className="btn btn-primary" onClick={resume}>이어하기</button><button className="btn btn-secondary" onClick={leave}>종료 · 임시 저장 유지</button></div>}<p className="muted">기록 날짜 {recordDate}</p>{draft.status&&<p role="status">{draft.status}</p>}{draft.error&&<p role="alert">{draft.error}</p>}<ExerciseCard focused onPoseEvaluation={setPoseEvaluation} key={exercise.exercise_id} exercise={exercise} paused={paused||!!restUntil||Number(pain)>0}/><h3>세트 {Math.min(sets+1,exercise.sets||1)} / {exercise.sets||1} · 완료 {sets}</h3>
  {previous&&<p>지난 기록 ({previous.date}): {previous.set_records?.length?previous.set_records.map(s=>`${s.weight_kg??'미기록'}kg × ${s.reps}회`).join(' / '):`${previous.sets_completed??'—'}세트`}</p>}
  {(exercise.dose_type||'reps')==='reps'&&<><label>이번 세트 중량 kg<input className="text-input" type="number" min="0" max="1000" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)}/></label><label>이번 세트 반복 횟수<input className="text-input" type="number" min="0" max="1000" value={reps} onChange={e=>setReps(e.target.value)}/></label><p className="muted">완료 버튼을 누르면 이번 세트의 중량·횟수가 추가됩니다. 중량은 빈칸으로 둘 수 있습니다.</p></>}
  {(exercise.dose_type==='hold'||exercise.dose_type==='duration')&&<WorkoutTimer key={index+'-'+sets} seconds={timerSeconds} onChange={setTimerSeconds} target={targetSeconds(exercise)} paused={paused} disabled={busy||!draft.ready||!!restUntil||sets>=(exercise.sets||1)}/>}
  {timedSets.length>0&&<p>유지시간: {timedSets.map((v,i)=>`${i+1}세트 ${v}초`).join(' · ')}</p>}{performedSeconds>0&&<p>수행 시간 {performedSeconds}초</p>}
  <button className="btn btn-primary" disabled={!draft.ready||paused||busy||!!restUntil||sets>=(exercise.sets||1)} onClick={completeSet}>{exercise.dose_type==='hold'||exercise.dose_type==='duration'?'시간 기록하기':'세트 완료'}</button>
  {restUntil&&<div role="status">REST · {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')} <button className="btn btn-ghost" onClick={()=>setRestUntil(null)}>휴식 건너뛰기</button><button className="btn btn-secondary" onClick={()=>setRestUntil(v=>v+30000)}>+30 sec</button><p>NEXT · {sets<(exercise.sets||1)?exercise.exercise_name:exercises[index+1]?.exercise_name||'운동 요약'} · {sets<(exercise.sets||1)?exercise.reps:exercises[index+1]?.reps}</p>{nextPreview&&<div style={{width:120}} aria-label="다음 동작 미리보기"><MotionFigure exercise={nextPreview} progress={0}/></div>}</div>}
  {setRows.length>0&&<SetRecordEditor rows={setRows} disabled={busy} onChange={rows=>{setSetRows(rows);setSets(rows.filter(s=>s.kind!=='warmup').length);}}/>}
  <div aria-label="RPE 빠른 선택">{[4,5,6,7,8].map(v=><button type="button" className="btn btn-secondary" key={v} aria-pressed={Number(rpe)===v} onClick={()=>setRpe(String(v))}>RPE {v}</button>)}</div><form onSubmit={e=>{e.preventDefault();save();}} id="guided-workout-feedback" className="workout-feedback"><label>운동 힘듦 (RPE 1–10)<input type="number" min="1" max="10" value={rpe} onChange={e=>setRpe(e.target.value)}/></label><label>통증 (0–10)<input type="number" min="0" max="10" required value={pain} onChange={e=>setPain(e.target.value)}/></label></form>
  {error&&<p role="alert">{error}</p>}<details><summary>선택 안내 (기본 꺼짐)</summary><label><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> 음성 안내</label><label><input type="checkbox" checked={vibration} onChange={e=>setVibration(e.target.checked)}/> 세트·휴식 종료 진동 (지원 기기)</label><p>이 화면이 열려 있는 동안에만 안내합니다.</p></details>
 <BottomActions className="workout-bottom-actions" label="운동 이동 및 저장"><button type="button" className="btn btn-secondary" disabled={busy||index===0} onClick={()=>navigate(index-1)}>이전 운동</button><button type="button" className="btn btn-secondary" disabled={busy||index===exercises.length-1} onClick={()=>navigate(index+1)}>다음 운동 · 입력 보관</button><button type="submit" form="guided-workout-feedback" className="btn btn-primary" disabled={busy||!draft.ready||(Number(pain)===0&&sets===0)}>{busy?'저장 중…':Number(pain)>0?'통증 기록 · 운동 중단':sets>0&&sets<(exercise.sets||1)?'여기까지 기록 · 다음 운동':'완료 기록 · 다음 운동'}</button></BottomActions>
 </section>;
}
