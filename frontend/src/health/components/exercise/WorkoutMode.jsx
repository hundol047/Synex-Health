import SetRecordEditor from './SetRecordEditor.jsx';
import {normalizeSets,previousWorkout} from '../../lib/workoutProgress.js';
import React,{useEffect,useState,useRef,useCallback} from 'react';
import ExerciseCard from './ExerciseCard.jsx';
import {HealthAPI} from '../../../shared/lib/api.js';
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function WorkoutMode({routine,exercises,workouts=[],onSaved,onClose}){
 const [index,setIndex]=useState(0),[sets,setSets]=useState(0),[restUntil,setRestUntil]=useState(null),[remaining,setRemaining]=useState(0);
 const [rpe,setRpe]=useState(''),[pain,setPain]=useState('0'),[reps,setReps]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [voice,setVoice]=useState(false),[vibration,setVibration]=useState(false),[records,setRecords]=useState([]),[finished,setFinished]=useState(false);
 const [setRows,setSetRows]=useState([]),[weight,setWeight]=useState('');
 const [paused,setPaused]=useState(false);
 const clock=useRef({start:Date.now(),pausedAt:null,pausedMs:0});
 const pause=useCallback(()=>{if(clock.current.pausedAt===null){clock.current.pausedAt=Date.now();setPaused(true);window.speechSynthesis?.cancel();}},[]);
 function resume(){const c=clock.current;if(c.pausedAt!==null){const gap=Date.now()-c.pausedAt;c.pausedMs+=gap;c.pausedAt=null;setRestUntil(deadline=>deadline===null?null:deadline+gap);setPaused(false);}}
 function elapsed(){const c=clock.current;return Math.max(0,(c.pausedAt??Date.now())-c.start-c.pausedMs);}
 function resetClock(){clock.current={start:Date.now(),pausedAt:null,pausedMs:0};setPaused(false);}
 const dirty=sets>0||setRows.length>0||reps!==''||weight!==''||rpe!==''||Number(pain)>0;
 function leave(){if(!dirty||window.confirm('아직 저장하지 않은 운동 입력이 있습니다. 저장하지 않고 목록으로 나갈까요?'))onClose();}
 useEffect(()=>{const visibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[pause]);
 useEffect(()=>{if(!dirty||finished)return;const before=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty,finished]);
 const exercise=exercises[index];
 const previous=exercise?previousWorkout(workouts,exercise,localDate()):null;
 function notify(message){if(vibration)navigator.vibrate?.(100);if(voice&&'speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(message));}}
 useEffect(()=>{if(!restUntil||paused)return;const tick=()=>{const seconds=Math.max(0,Math.ceil((restUntil-Date.now())/1000));setRemaining(seconds);if(!seconds){setRestUntil(null);notify('휴식이 끝났습니다.');}};tick();const id=setInterval(tick,250);return()=>clearInterval(id);},[restUntil,voice,vibration,paused]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();navigator.vibrate?.(0);},[]);
 function completeSet(){if(paused||restUntil||busy||sets>=(exercise.sets||1))return;
 if((exercise.dose_type||'reps')==='reps'){
  try{const row=normalizeSets([{weight_kg:weight,reps,kind:'working'}])[0];if(row.reps===0)throw Error('완료한 세트의 반복 횟수를 입력하세요.');setSetRows(old=>[...old,row]);setError('');}catch(e){setError(e.message);return;}
 }
 const next=sets+1;setSets(next);notify('세트를 완료했습니다.');if(next<(exercise.sets||1))setRestUntil(Date.now()+(exercise.rest_seconds||60)*1000);}
 async function save(){if(busy||(paused&&Number(pain)===0))return;setBusy(true);setError('');try{
  const set_records=normalizeSets(setRows);
  const result=await HealthAPI.createWorkout({set_records,routine_id:routine.id,routine_exercise_id:exercise.exercise_id,day_number:exercise.day_number,date:localDate(),exercise_name:exercise.exercise_name,sets_completed:sets,reps_completed:reps||null,rpe:rpe===''?null:Number(rpe),pain:Number(pain),difficulty:Number(pain)>0?'pain':Number(rpe)>=8?'hard':Number(rpe)>0&&Number(rpe)<=5?'easy':'moderate',completed:Number(pain)===0,actual_minutes:Number((elapsed()/60000).toFixed(1)),memo:'Workout Mode'});
  setRecords(old=>[...old,{...result,pending_sync:!!result.pending_sync}]);
  if(Number(pain)>0||index===exercises.length-1){setFinished(true);}else{setIndex(index+1);setSets(0);setSetRows([]);setWeight('');setReps('');setRpe('');setPain('0');resetClock();notify('다음 운동입니다.');}
  setRestUntil(null);await onSaved();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 const minutes=records.reduce((s,r)=>s+(r.actual_minutes||0),0),ratings=records.filter(r=>r.rpe!=null);
 if(finished)return <section className="workout-mode"><h2>오늘의 운동 요약</h2><p>{records.length}개 운동 · {records.reduce((s,r)=>s+(r.sets_completed||0),0)}세트 · {minutes.toFixed(1)}분</p><p>완료 {Math.round(records.filter(r=>r.completed).length/exercises.length*100)}% · 통증 {Math.max(0,...records.map(r=>r.pain||0))} · 평균 힘듦 {ratings.length?(ratings.reduce((s,r)=>s+r.rpe,0)/ratings.length).toFixed(1):'미기록'}</p>{records.some(r=>r.pending_sync)&&<p role="status">일부 기록은 기기 임시 보관 중입니다. 같은 계정으로 다시 로그인하면 전송을 이어갑니다.</p>}{records.some(r=>r.pain>0)&&<p role="alert">통증이 기록되어 진행을 중단했습니다. 건강센터에 상담하세요.</p>}<button className="btn btn-primary" onClick={onClose}>목록으로</button></section>;
 if(!exercise)return null;
 return <section className="workout-mode"><div className="motion-controls"><h2>운동 따라하기 · {index+1} / {exercises.length}</h2><button className="btn btn-ghost" disabled={busy} onClick={leave}>목록으로</button></div><div className="workout-mode-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={paused?resume:pause}>{paused?'운동 계속하기':'잠시 멈추기'}</button><span className="muted">화면을 벗어나면 자동 일시정지됩니다.</span></div>{paused&&<div role="status" className="workout-mode-paused">일시정지 중 · 휴식 타이머와 기록 시간이 멈췄어요. 준비되면 계속하기를 눌러 주세요.</div>}<ExerciseCard exercise={exercise}/><h3>세트 {Math.min(sets+1,exercise.sets||1)} / {exercise.sets||1} · 완료 {sets}</h3>
  {previous&&<p>지난 기록 ({previous.date}): {previous.set_records?.length?previous.set_records.map(s=>`${s.weight_kg??'미기록'}kg × ${s.reps}회`).join(' / '):`${previous.sets_completed??'—'}세트`}</p>}
  {(exercise.dose_type||'reps')==='reps'&&<><label>이번 세트 중량 kg<input className="text-input" type="number" min="0" max="1000" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)}/></label><label>이번 세트 반복 횟수<input className="text-input" type="number" min="0" max="1000" value={reps} onChange={e=>setReps(e.target.value)}/></label><p className="muted">완료 버튼을 누르면 이번 세트의 중량·횟수가 추가됩니다. 중량은 빈칸으로 둘 수 있습니다.</p></>}
  <button className="btn btn-primary" disabled={paused||busy||!!restUntil||sets>=(exercise.sets||1)} onClick={completeSet}>세트 완료</button>
  {restUntil&&<div role="status">휴식 {remaining}초 <button className="btn btn-ghost" onClick={()=>setRestUntil(null)}>휴식 건너뛰기</button></div>}
  {setRows.length>0&&<SetRecordEditor rows={setRows} disabled={busy} onChange={rows=>{setSetRows(rows);setSets(rows.filter(s=>s.kind!=='warmup').length);}}/>}
  <form onSubmit={e=>{e.preventDefault();save();}} className="workout-feedback"><label>운동 힘듦 (RPE 1–10)<input type="number" min="1" max="10" value={rpe} onChange={e=>setRpe(e.target.value)}/></label><label>통증 (0–10)<input type="number" min="0" max="10" required value={pain} onChange={e=>setPain(e.target.value)}/></label><button className="btn btn-primary" disabled={busy||(Number(pain)===0&&(paused||sets<(exercise.sets||1)))}>{busy?'저장 중…':Number(pain)>0?'통증 기록 · 운동 중단':'완료 기록 · 다음 운동'}</button></form>
  {error&&<p role="alert">{error}</p>}<details><summary>선택 안내 (기본 꺼짐)</summary><label><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> 음성 안내</label><label><input type="checkbox" checked={vibration} onChange={e=>setVibration(e.target.checked)}/> 세트·휴식 종료 진동 (지원 기기)</label><p>이 화면이 열려 있는 동안에만 안내합니다.</p></details>
 </section>;
}
