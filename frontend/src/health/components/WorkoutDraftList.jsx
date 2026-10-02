import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {HealthAPI} from '../../shared/lib/api.js';
import {listWorkoutDrafts,removeDraft} from '../../shared/lib/offline.js';
export default function WorkoutDraftList(){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true,version=0;
  async function reload(){const request=++version;try{
   const routines=await HealthAPI.listRoutines(),lookup=new Map();
   for(const r of routines)for(const e of r.exercises){
    lookup.set(`record:${r.id}:${e.exercise_id}`,{routine:r,exercise:e,day:e.day_number,mode:'record'});
    lookup.set(`guided:${r.id}:${e.day_number}`,{routine:r,day:e.day_number,mode:'guided'});
   }
   const drafts=await listWorkoutDrafts([...lookup.keys()]);
   if(alive&&request===version){setRows(drafts.map(d=>({...d,...lookup.get(d.scope)})));setError('');}
  }catch(e){if(alive&&request===version)setError(e.message);}finally{if(alive&&request===version)setLoading(false);}}
  reload();window.addEventListener('synex-offline-change',reload);
  return()=>{alive=false;window.removeEventListener('synex-offline-change',reload);};
 },[]);
 return <section aria-label="임시 운동 기록 목록"><h3>이어 쓸 기록</h3>{loading&&<p role="status">임시 기록 확인 중…</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!rows.length&&<p>진행 중 임시 입력이 없습니다.</p>}
 {rows.map(d=><article className="exercise-card" key={d.id}><strong>{d.exercise?.exercise_name||(d.mode==='guided'?`${d.day}일차 운동 따라하기`:'이전 운동 입력')}</strong><p>기록 날짜 {d.value.date||'미기록'} · 계획 생성 {d.routine?.created_at?.slice(0,10)||'연결된 계획 없음'}</p>
 {d.routine&&!d.routine.needs_review?<Link className="btn btn-primary" to={`/health/workout?routine=${encodeURIComponent(d.routine.id)}&day=${d.day}&mode=${d.mode}`}>이 기록 이어 쓰기</Link>:<p>계획이 삭제되었거나 안전 재검토가 필요해 운동을 재개할 수 없습니다. 입력 내용은 아래에서 확인하세요.</p>}
 <details><summary>보관된 입력 확인</summary><DraftValues value={d.value}/></details>
 {d.scope&&<button className="btn btn-ghost" onClick={async()=>{if(!window.confirm('이 임시 입력만 삭제할까요?'))return;try{await removeDraft(d.scope,d.token);}catch(e){setError(e.message);}}}>이 임시 입력 삭제</button>}
 </article>)}</section>;
}

function DraftValues({value}){
 const v=value.patch?{...value.base,...value.patch}:value,sets=v.set_records||v.setRows||[],times=v.timed_sets_seconds||v.timedSets||[];
 return <div><p>수행 세트 {v.sets_completed??v.sets??0} · 반복 {v.reps_completed??v.reps??'미기록'} · 통증 {v.pain??0}</p>{sets.map((s,i)=><p key={i}>{i+1}세트: {s.weight_kg??'미기록'} kg × {s.reps}회</p>)}<p>유지시간: {times.length?times.join(' / ')+'초':'미기록'} · 수행 시간 {v.performed_seconds??v.performedSeconds??0}초 · 타이머 {v.timerSeconds??0}초</p><p>힘듦 {v.rpe||'미기록'} · 메모 {v.memo||'미기록'}</p></div>;
}
