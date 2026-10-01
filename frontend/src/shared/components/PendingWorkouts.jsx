import React,{useState} from 'react';
import {discardPending,resolvePending} from '../lib/offline.js';
import {syncPendingWorkouts} from '../lib/api.js';
export default function PendingWorkouts({state}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function run(action) { setBusy(true);setError('');try { await action(); } catch(e) { setError(e.message); } finally { setBusy(false); } }
 if(!state.pending&&!state.storageError&&!error)return null;
 return <section className="card" aria-label="미전송 운동 기록"><h2>기기 보관 기록 {state.pending}건</h2>
  <p>같은 계정으로 다시 로그인하면 전송을 이어갑니다. 로그아웃·앱 삭제·브라우저 데이터 삭제 전에는 전송을 완료하세요.</p>
  {(state.storageError||error)&&<p role="alert">{state.storageError||error}</p>}
  <button className="btn btn-secondary" disabled={busy||state.syncing} onClick={()=>run(syncPendingWorkouts)}>기록 전송</button>
  <details><summary>미전송 기록 확인·충돌 해결</summary>{state.entries.map(entry=><article key={entry.id} className="exercise-card">
   <strong>{entry.body.exercise_name} · {entry.body.date}</strong><p>이 기기: {entry.body.sets_completed??'—'}세트 · {entry.body.reps_completed??'—'}회 · 통증 {entry.body.pain??0}</p>
   {entry.error&&<p role="alert">{entry.error}</p>}
   {entry.conflict&&<><p>서버: {entry.conflict.sets_completed??'—'}세트 · {entry.conflict.reps_completed??'—'}회 · 통증 {entry.conflict.pain??0}</p><button className="btn btn-secondary" disabled={busy} onClick={()=>run(async()=>{await resolvePending(entry.id,entry.conflict.revision);await syncPendingWorkouts();})}>이 기기 기록으로 변경</button></>}
   <button className="btn btn-ghost" disabled={busy} onClick={()=>{if(window.confirm('이 기기의 미전송 기록을 삭제할까요? 서버 기록은 유지됩니다.'))run(()=>discardPending(entry.id));}}>{entry.conflict?'서버 기록 유지':'미전송 기록 삭제'}</button>
  </article>)}</details>
 </section>;
}
