import React from 'react';
import {recommendedRest,tempoPrescription} from './tempoSession.js';
import './tempo.css';
import TempoVoice from './TempoVoice.jsx';

export default function TempoControls({session,exercises,disabled=false}){
 const {state,segment,frame}=session,index=segment?.exerciseIndex??Math.max(0,exercises.length-1);
 const exercise=exercises[index];if(!exercise)return null;
 const p=tempoPrescription(exercise),rest=recommendedRest(exercise),idle=state.status==='idle',done=state.status==='complete';
 const next=segment?.kind==='rest'&&segment.final?exercises[index+1]:exercise;
 return <section className="tempo-panel" aria-label="자동 운동 템포" data-stage={done?'complete':idle?'idle':segment?.kind}>
  <div className="tempo-heading"><strong>{done?'오늘의 시범 완료':idle?'타이밍에 맞춰 따라하기':state.status==='paused'?'일시정지':segment?.kind==='prepare'?'시작 자세 준비':segment?.kind==='rest'?'회복 시간':'시범과 함께 움직이세요'}</strong><span>{!idle&&!done?`${frame.remaining}초`:`${p.sets}세트`}</span></div>
  {!idle&&!done&&<><progress aria-label="현재 구간 진행률" max={segment.durationMs} value={state.elapsed}/><p>{exercise.exercise_name||exercise.name} · {segment.set} / {p.sets}세트 {frame.rep?`· 시범 ${frame.rep} / ${p.reps}회`:''}{frame.side?` · ${frame.side}`:''}</p>{segment.kind==='rest'&&<p>다음: {next?.exercise_name||next?.name||'마무리'} · {rest.reason}</p>}</>}
  <div className="tempo-buttons">{state.status!=='running'?<button type="button" className="btn btn-primary" disabled={disabled} onClick={session.start}>{state.status==='paused'?'템포 계속하기':done?'다시 따라하기':'자동 따라하기 시작'}</button>:<button type="button" className="btn btn-secondary" onClick={session.pause}>템포 일시정지</button>}{segment?.kind==='rest'&&!done&&!idle&&<button type="button" className="btn btn-secondary" onClick={session.skipRest}>휴식 건너뛰기</button>}{!idle&&<button type="button" className="btn btn-ghost" onClick={session.reset}>템포 종료</button>}</div>
  <TempoVoice session={session} exercises={exercises}/>
  <details><summary>운동 속도·휴식 조절</summary><label>시범 속도<select aria-label="따라하기 속도" value={session.speed} disabled={!idle} onChange={e=>session.setSpeed(Number(e.target.value))}><option value={.75}>천천히 · 0.75배</option><option value={1}>기본 · 1배</option><option value={1.25}>빠르게 · 1.25배</option></select></label>{exercises.map((ex,i)=><label key={ex.exercise_id||`${ex.motion_id}-${i}`}>{ex.exercise_name||ex.name} 휴식 · {session.restOverrides[i]??recommendedRest(ex).seconds}초<input aria-label={`${ex.exercise_name||ex.name} 휴식 초`} type="range" min="10" max="120" step="5" value={session.restOverrides[i]??recommendedRest(ex).seconds} onChange={e=>session.restChange(i,Number(e.target.value))}/></label>)}</details>
  <p className="tempo-note">5초 준비 후 시범·휴식·다음 운동을 자동 진행합니다. 횟수는 시범 기준이며 실제 수행 기록은 별도로 확인합니다. 화면을 벗어나면 멈춥니다.</p>
 </section>;
}
