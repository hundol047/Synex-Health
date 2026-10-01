import React,{useEffect,useState} from 'react';
import ExerciseCard from './ExerciseCard.jsx';
import {HealthAPI} from '../../../shared/lib/api.js';
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function WorkoutMode({routine,exercises,onSaved,onClose}){
 const [index,setIndex]=useState(0),[sets,setSets]=useState(0),[restUntil,setRestUntil]=useState(null),[remaining,setRemaining]=useState(0);
 const [rpe,setRpe]=useState(''),[pain,setPain]=useState('0'),[reps,setReps]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [voice,setVoice]=useState(false),[vibration,setVibration]=useState(false),[records,setRecords]=useState([]),[finished,setFinished]=useState(false),[started,setStarted]=useState(()=>Date.now());
 const exercise=exercises[index];
 function notify(message){if(vibration)navigator.vibrate?.(100);if(voice&&'speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(message));}}
 useEffect(()=>{if(!restUntil)return;const tick=()=>{const seconds=Math.max(0,Math.ceil((restUntil-Date.now())/1000));setRemaining(seconds);if(!seconds){setRestUntil(null);notify('휴식이 끝났습니다.');}};tick();const id=setInterval(tick,250);return()=>clearInterval(id);},[restUntil,voice,vibration]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();navigator.vibrate?.(0);},[]);
 function completeSet(){if(restUntil||busy||sets>=(exercise.sets||1))return;const next=sets+1;setSets(next);notify('세트를 완료했습니다.');if(next<(exercise.sets||1))setRestUntil(Date.now()+(exercise.rest_seconds||60)*1000);}
 async function save(){setBusy(true);setError('');try{
  const result=await HealthAPI.createWorkout({routine_id:routine.id,routine_exercise_id:exercise.exercise_id,day_number:exercise.day_number,date:localDate(),exercise_name:exercise.exercise_name,sets_completed:sets,reps_completed:reps||null,rpe:rpe===''?null:Number(rpe),pain:Number(pain),difficulty:Number(pain)>0?'pain':Number(rpe)>=8?'hard':Number(rpe)>0&&Number(rpe)<=5?'easy':'moderate',completed:Number(pain)===0,actual_minutes:Number(((Date.now()-started)/60000).toFixed(1)),memo:'Workout Mode'});
  setRecords(old=>[...old,{...result,pending_sync:!!result.pending_sync}]);
  if(Number(pain)>0||index===exercises.length-1){setFinished(true);}else{setIndex(index+1);setSets(0);setReps('');setRpe('');setPain('0');setStarted(Date.now());notify('다음 운동입니다.');}
  setRestUntil(null);await onSaved();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 const minutes=records.reduce((s,r)=>s+(r.actual_minutes||0),0),ratings=records.filter(r=>r.rpe!=null);
 if(finished)return <section className="workout-mode"><h2>오늘의 운동 요약</h2><p>{records.length} Exercises · {records.reduce((s,r)=>s+(r.sets_completed||0),0)} Sets · {minutes.toFixed(1)} Minutes</p><p>완료 {Math.round(records.filter(r=>r.completed).length/exercises.length*100)}% · 통증 {Math.max(0,...records.map(r=>r.pain||0))} · 평균 RPE {ratings.length?(ratings.reduce((s,r)=>s+r.rpe,0)/ratings.length).toFixed(1):'미기록'}</p>{records.some(r=>r.pending_sync)&&<p role="status">일부 기록은 기기 임시 보관 중입니다. 서버 동기화가 완료되기 전 앱을 닫지 마세요.</p>}{records.some(r=>r.pain>0)&&<p role="alert">통증이 기록되어 진행을 중단했습니다. 건강센터에 상담하세요.</p>}<button className="btn btn-primary" onClick={onClose}>목록으로</button></section>;
 if(!exercise)return null;
 return <section className="workout-mode"><div className="motion-controls"><h2>Workout Mode · {index+1} / {exercises.length}</h2><button className="btn btn-ghost" onClick={onClose}>목록으로</button></div><ExerciseCard exercise={exercise}/><h3>Set {Math.min(sets+1,exercise.sets||1)} / {exercise.sets||1} · 완료 {sets}</h3>
  <button className="btn btn-primary" disabled={busy||!!restUntil||sets>=(exercise.sets||1)} onClick={completeSet}>Complete Set · 세트 완료</button>
  {restUntil&&<div role="status">휴식 {remaining}초 <button className="btn btn-ghost" onClick={()=>setRestUntil(null)}>휴식 건너뛰기</button></div>}
  <form onSubmit={e=>{e.preventDefault();save();}} className="workout-feedback"><label>실제 반복 횟수<input type="number" min="0" max="1000" value={reps} onChange={e=>setReps(e.target.value)}/></label><label>RPE (1–10)<input type="number" min="1" max="10" value={rpe} onChange={e=>setRpe(e.target.value)}/></label><label>통증 (0–10)<input type="number" min="0" max="10" required value={pain} onChange={e=>setPain(e.target.value)}/></label><button className="btn btn-primary" disabled={busy||(Number(pain)===0&&sets<(exercise.sets||1))}>{busy?'저장 중…':Number(pain)>0?'통증 기록 · 운동 중단':'완료 기록 · 다음 운동'}</button></form>
  {error&&<p role="alert">{error}</p>}<details><summary>선택 안내 (기본 꺼짐)</summary><label><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> 음성 안내</label><label><input type="checkbox" checked={vibration} onChange={e=>setVibration(e.target.checked)}/> 세트·휴식 종료 진동 (지원 기기)</label><p>이 화면이 열려 있는 동안에만 안내합니다.</p></details>
 </section>;
}
