import React,{useState} from 'react';
import SetRecordEditor from './SetRecordEditor.jsx';
import {normalizeSets} from '../../lib/workoutProgress.js';
import {HealthAPI} from '../../../shared/lib/api.js';
const optionalNumber=v=>v===''||v==null?null:Number(v);
export default function WorkoutRecordForm({exercise,routine,date,existing,previous,onSaved}){
 const [patch,setPatch]=useState({}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const value=(name,fallback='')=>patch[name]??existing?.[name]??fallback;
 const field=(name,v)=>setPatch(p=>({...p,[name]:v}));
 const rows=value('set_records',[]),pain=Number(value('pain',0)),difficulty=value('difficulty','moderate');
 async function save(e){
  e.preventDefault();if(busy||pending)return;setBusy(true);setError('');setMessage('');
  try{
   const set_records=normalizeSets(rows);
   const body={routine_id:routine.id,routine_exercise_id:exercise.exercise_id,day_number:exercise.day_number,date,exercise_name:exercise.exercise_name,
    set_records,sets_completed:set_records.length||optionalNumber(value('sets_completed',exercise.sets??'')),
    reps_completed:set_records.length?set_records.map(s=>s.reps).join(', '):String(value('reps_completed',''))||null,
    duration:existing?.duration??exercise.duration??null,rpe:optionalNumber(value('rpe')),pain,
    difficulty,completed:difficulty!=='pain'&&pain===0,actual_minutes:optionalNumber(value('actual_minutes')),memo:value('memo')};
   const saved=await HealthAPI.createWorkout(body);
   if(saved.pending_sync){setPending(true);setMessage('기기에 보관했습니다. 연결되면 전송합니다. 전송 전에는 이 기록을 다시 저장하지 마세요.');}
   else {setPatch({});setMessage('기록을 저장했습니다.');await onSaved();}
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <form onSubmit={save} className="workout-record-form">
 {previous?.set_records?.length>0&&<button type="button" className="btn btn-ghost" disabled={busy||pending} onClick={()=>field('set_records',previous.set_records.map(s=>({...s})))}>지난 세트 불러오기 · {previous.date}</button>}
 <fieldset disabled={busy||pending} className="record-fields">
 {(exercise.dose_type||'reps')==='reps'&&<SetRecordEditor rows={rows} onChange={v=>field('set_records',v)}/>}
 {!rows.length&&<div className="record-grid"><label>실제 세트<input className="text-input" type="number" min="0" max="100" step="1" value={value('sets_completed',exercise.sets??'')} onChange={e=>field('sets_completed',e.target.value)}/></label>{(exercise.dose_type||'reps')==='reps'&&<label>실제 반복 횟수<input className="text-input" value={value('reps_completed')} maxLength="100" onChange={e=>field('reps_completed',e.target.value)}/></label>}</div>}
 <div className="record-grid"><label>오늘의 난이도<select className="text-input" value={difficulty} onChange={e=>field('difficulty',e.target.value)}><option value="easy">쉬웠어요</option><option value="moderate">적당했어요</option><option value="hard">어려웠어요</option><option value="pain">통증으로 중단</option></select></label>
 <label>통증 (0–10)<input className="text-input" type="number" min="0" max="10" step="1" required value={value('pain',0)} onChange={e=>field('pain',e.target.value)}/></label></div>
 <details className="record-extra"><summary>운동 시간·힘듦·메모 {existing?'(저장된 값 유지)':'추가하기'}</summary><div className="record-grid">
 <label>실제 운동 시간 (분)<input className="text-input" type="number" min="0" max="1440" step="0.1" value={value('actual_minutes')} onChange={e=>field('actual_minutes',e.target.value)}/></label>
 <label>운동 힘듦 (RPE 1–10)<input className="text-input" type="number" min="1" max="10" step="1" value={value('rpe')} onChange={e=>field('rpe',e.target.value)}/></label>
 <label className="record-wide">메모<textarea className="text-input" rows="2" maxLength="2000" value={value('memo')} onChange={e=>field('memo',e.target.value)}/></label></div></details>
 </fieldset>
 {(difficulty==='pain'||pain>0)&&<p className="motion-cautions" role="status">운동을 중단하고 건강센터에 상담하세요. 통증 기록은 자동 증량을 차단합니다.</p>}
 <div className="record-actions"><button className="btn btn-primary" disabled={busy||pending}>{busy?'저장 중…':pending?'전송 대기 중':existing?'기록 수정':difficulty==='pain'||pain>0?'중단 기록':'완료 기록'}</button>{existing?.completed&&<span className="record-complete">오늘 완료</span>}</div>
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </form>;
}
