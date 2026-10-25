import React from 'react';
import {recommendedRest,tempoPrescription} from './tempoSession.js';
import './tempo.css';
import TempoVoice from './TempoVoice.jsx';

export default function TempoControls({session,exercises,disabled=false,showSkip=true}){
 const {state,segment,frame}=session,index=segment?.exerciseIndex??Math.max(0,exercises.length-1);
 const exercise=exercises[index];if(!exercise)return null;
 const p=tempoPrescription(exercise),rest=recommendedRest(exercise),idle=state.status==='idle',done=state.status==='complete';
 const total=Math.ceil(session.plan.reduce((sum,s)=>sum+s.durationMs,0)/60000),restTotal=Math.round(session.plan.filter(s=>s.kind==='rest').reduce((sum,s)=>sum+s.durationMs,0)/1000);
 const next=segment?.kind==='rest'&&segment.final?exercises[index+1]:exercise;
 return <section className="tempo-panel" aria-label="자동 운동 템포" data-stage={done?'complete':idle?'idle':segment?.kind}>
  <div className="tempo-heading"><strong>{done?(exercises.length===1?'선택한 운동 시범 완료':'오늘의 시범 완료'):idle?'타이밍에 맞춰 따라하기':state.status==='paused'?'일시정지':segment?.kind==='prepare'?'시작 자세 준비':segment?.kind==='rest'?(segment.restType==='transition'?'다음 운동 준비':'세트 사이 휴식'):'시범과 함께 움직이세요'}</strong><span>{!idle&&!done?`${frame.remaining}초`:`${p.sets}세트`}</span></div>
  {idle&&<p>{exercises.length}개 운동 · 시범과 휴식 약 {total}분 · 휴식 합계 {restTotal}초</p>}
  {!idle&&!done&&<><progress aria-label="현재 구간 진행률" max={segment.durationMs} value={state.elapsed}/><p>운동 {index+1} / {exercises.length} · {exercise.exercise_name||exercise.name} · {segment.set} / {p.sets}세트 {frame.rep?`· 시범 ${frame.rep} / ${p.reps}회`:''}{frame.side?` · ${frame.side}`:''}</p>{segment.kind==='rest'&&<p>다음: {next?.exercise_name||next?.name||'마무리'} · {segment.reason||rest.reason}</p>}</>}
  <div className="tempo-buttons">{state.status!=='running'?<button type="button" className="btn btn-primary" disabled={disabled} onClick={session.start}>{state.status==='paused'?'템포 계속하기':done?'다시 따라하기':'자동 따라하기 시작'}</button>:<button type="button" className="btn btn-secondary" onClick={session.pause}>템포 일시정지</button>}{segment?.kind==='rest'&&!done&&!idle&&<button type="button" className="btn btn-secondary" onClick={session.skipRest}>휴식 건너뛰기</button>}{!idle&&<button type="button" className="btn btn-ghost" onClick={session.reset}>템포 종료</button>}</div>
  {showSkip&&!done&&<button type="button" className="btn btn-secondary" disabled={disabled} onClick={session.skipExercise}>이 운동 건너뛰기</button>}
  {!!state.skipped?.length&&<p role="status">{state.skipped.length}개 운동 건너뜀 · 남은 세트와 휴식을 생략했습니다. 실제 수행 기록은 자동으로 추가되지 않습니다.</p>}
  <TempoVoice session={session} exercises={exercises}/>
  <details><summary>운동 속도·휴식 조절</summary><label>시범 속도<select aria-label="따라하기 속도" value={session.speed} disabled={!idle} onChange={e=>session.setSpeed(Number(e.target.value))}><option value={.75}>천천히 · 0.75배</option><option value={1}>기본 · 1배</option><option value={1.25}>빠르게 · 1.25배</option></select></label>{exercises.map((ex,i)=><label key={ex.exercise_id||`${ex.motion_id}-${i}`}>{ex.exercise_name||ex.name} 세트 사이 휴식 · {session.restOverrides[i]??recommendedRest(ex).seconds}초<input aria-label={`${ex.exercise_name||ex.name} 휴식 초`} type="range" min="10" max="120" step="5" value={session.restOverrides[i]??recommendedRest(ex).seconds} onChange={e=>session.restChange(i,Number(e.target.value))}/></label>)}</details>
  <p className="tempo-note">처음에 5초 준비하고, 세트 사이 휴식과 운동 전환 시간을 구분해 자동 진행합니다. 마지막 운동은 추가 휴식 없이 마무리합니다. 횟수는 시범 기준이며 실제 수행 기록은 별도로 확인합니다. 화면을 벗어나면 멈춥니다.</p>
 </section>;
}
