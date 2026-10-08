import {useWorkoutDraft} from '../../lib/useWorkoutDraft.js';
import {workoutStatus,WORKOUT_STATUS} from '../../lib/workoutStatus.js';
import React,{useState} from 'react';
import SetRecordEditor from './SetRecordEditor.jsx';
import WorkoutFeedbackFields from './WorkoutFeedbackFields.jsx';
import {normalizeSets} from '../../lib/workoutProgress.js';
import {HealthAPI} from '../../../shared/lib/api.js';
const optionalNumber=v=>v===''||v==null?null:Number(v);
export default function WorkoutRecordForm({exercise,routine,date,existing,previous,onSaved}){
 const [patch,setPatch]=useState({}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const [base,setBase]=useState(existing||{}),[recordZone,setRecordZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');
 const [recordDate,setRecordDate]=useState(date),[baseRevision,setBaseRevision]=useState(existing?.revision??0),[mutationId,setMutationId]=useState(()=>crypto.randomUUID());
 const dirty=Object.keys(patch).length>0&&!pending;
 const draft=useWorkoutDraft(`record:${routine.id}:${exercise.exercise_id}`,{patch,base,date:recordDate,time_zone:recordZone,baseRevision,mutationId},dirty,s=>{setPatch(s.patch||{});setBase(s.base||{});setRecordZone(s.time_zone||'UTC');setRecordDate(s.date||date);setBaseRevision(s.baseRevision??0);setMutationId(s.mutationId||crypto.randomUUID());});
 const value=(name,fallback='')=>patch[name]??base[name]??fallback;
 const field=(name,v)=>setPatch(p=>({...p,[name]:v}));
 const rows=value('set_records',[]),pain=Number(value('pain',0)),difficulty=value('difficulty','moderate');
 const preview=workoutStatus({set_records:rows,sets_completed:value('sets_completed',0),reps_completed:value('reps_completed',''),performed_seconds:value('performed_seconds',0),timed_sets_seconds:value('timed_sets_seconds',[]),pain,difficulty},exercise);
 async function save(e){
  e.preventDefault();if(busy||pending||!draft.ready)return;setBusy(true);setError('');setMessage('');
  try{
   const set_records=normalizeSets(rows);
   const body={routine_id:routine.id,routine_exercise_id:exercise.exercise_id,day_number:exercise.day_number,date:recordDate,time_zone:recordZone,expected_revision:baseRevision,mutation_id:mutationId,exercise_name:exercise.exercise_name,
    performed_seconds:optionalNumber(value('performed_seconds')),timed_sets_seconds:value('timed_sets_seconds',[]).map(Number),
    set_records,sets_completed:set_records.length||optionalNumber(value('sets_completed',0)),
    reps_completed:set_records.length?set_records.map(s=>s.reps).join(', '):String(value('reps_completed',''))||null,
    duration:base.duration??exercise.duration??null,rpe:optionalNumber(value('rpe')),pain,
    difficulty,completed:difficulty!=='pain'&&pain===0,actual_minutes:optionalNumber(value('actual_minutes')),memo:value('memo')};
   body.completion_status=workoutStatus(body,exercise);body.completed=body.completion_status==='completed';
   await draft.flush().catch(()=>{});
   const saved=await HealthAPI.createWorkout(body);
   await draft.clear();
   if(saved.pending_sync){setPending(true);setMessage('기기에 보관했습니다. 연결되면 전송합니다. 전송 전에는 이 기록을 다시 저장하지 마세요.');}
   else {setPatch({});setBase(saved);setBaseRevision(saved.revision??baseRevision+1);setMutationId(crypto.randomUUID());setMessage(`${WORKOUT_STATUS[saved.completion_status||body.completion_status]} 기록을 저장했습니다.`);await onSaved();}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <form onSubmit={save} className="workout-record-form">
 <p className="muted">기록 날짜 {recordDate}</p>{draft.status&&<p role="status">{draft.status}</p>}{draft.error&&<p role="alert">{draft.error}</p>}
 {dirty&&<button type="button" className="btn btn-ghost" disabled={busy||pending||!draft.ready} onClick={async()=>{
  if(busy||pending||!draft.ready||!window.confirm('임시 입력을 버리고 저장된 값으로 돌아갈까요?'))return;
  setBusy(true);setError('');
  try{await draft.clear();setPatch({});if((existing?.revision??0)>baseRevision){setBase(existing);setBaseRevision(existing.revision);}setRecordDate(date);setRecordZone(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');setMutationId(crypto.randomUUID());}
  catch(e){setError('임시 입력을 삭제하지 못했습니다. 입력을 유지합니다. '+e.message);}
  finally{setBusy(false);}
 }}>임시 입력 버리기</button>}
 {previous?.set_records?.length>0&&<button type="button" className="btn btn-ghost" disabled={busy||pending||!draft.ready} onClick={()=>field('set_records',previous.set_records.map(s=>({...s})))}>지난 세트 불러오기 · {previous.date}</button>}
 <fieldset disabled={busy||pending||!draft.ready} className="record-fields">
 {(exercise.dose_type||'reps')==='reps'&&<SetRecordEditor rows={rows} onChange={v=>field('set_records',v)}/>}
 {!rows.length&&(exercise.dose_type||'reps')==='reps'&&<div className="record-grid"><label>실제 세트<input className="text-input" type="number" min="0" max="100" step="1" value={value('sets_completed',0)} onChange={e=>field('sets_completed',e.target.value)}/></label>{(exercise.dose_type||'reps')==='reps'&&<label>실제 반복 횟수<input className="text-input" value={value('reps_completed')} maxLength="100" onChange={e=>field('reps_completed',e.target.value)}/></label>}</div>}
 {exercise.dose_type==='duration'&&<label>실제 수행 시간 (초)<input className="text-input" type="number" min="0" max="86400" step="1" value={value('performed_seconds',0)} onChange={e=>field('performed_seconds',e.target.value)}/></label>}
 {exercise.dose_type==='hold'&&<div><p>세트별 유지시간 · 목표 {exercise.hold_seconds??'—'}초</p>{value('timed_sets_seconds',[]).map((seconds,i)=><label key={i}>{i+1}세트 유지시간 (초)<input className="text-input" type="number" min="0" max="86400" step="1" value={seconds} onChange={e=>field('timed_sets_seconds',value('timed_sets_seconds',[]).map((v,j)=>i===j?e.target.value:v))}/></label>)}<button type="button" className="btn btn-secondary" disabled={value('timed_sets_seconds',[]).length>=100} onClick={()=>field('timed_sets_seconds',[...value('timed_sets_seconds',[]),0])}>시간 세트 추가</button></div>}
 <WorkoutFeedbackFields rpe={value('rpe')} pain={value('pain',0)} onRpeChange={v=>field('rpe',v)} onPainChange={v=>field('pain',v)}/>
 <label className="record-difficulty">오늘의 난이도<select className="text-input" value={difficulty} onChange={e=>field('difficulty',e.target.value)}><option value="easy">쉬웠어요</option><option value="moderate">적당했어요</option><option value="hard">어려웠어요</option><option value="pain">통증으로 중단</option></select></label>
 <details className="record-extra"><summary>운동 시간·메모 {existing?'(저장된 값 유지)':'추가하기'}</summary><div className="record-grid">
 <label className="record-wide">실제 운동 시간 (분)<input className="text-input" type="number" min="0" max="1440" step="0.1" value={value('actual_minutes')} onChange={e=>field('actual_minutes',e.target.value)}/></label>
 <label className="record-wide">메모<textarea className="text-input" rows="2" maxLength="2000" value={value('memo')} onChange={e=>field('memo',e.target.value)}/></label></div></details>
 </fieldset>
 {(difficulty==='pain'||pain>0)&&<p className="motion-cautions" role="status">운동을 중단하고 건강센터에 상담하세요. 통증 기록은 자동 증량을 차단합니다.</p>}
 <p aria-live="polite">이번 기록: {WORKOUT_STATUS[preview]}</p>
 <div className="record-actions"><button className="btn btn-primary" disabled={busy||pending||!draft.ready}>{busy?'저장 중…':pending?'전송 대기 중':existing?'기록 수정':`${WORKOUT_STATUS[preview]} 기록`}</button>{existing?.completed&&<span className="record-complete">오늘 완료</span>}</div>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </form>;
}
