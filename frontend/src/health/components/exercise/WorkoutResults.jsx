import React,{useEffect,useRef,useState} from 'react';
import {CALORIE_SOURCE,calorieActivity,calorieOptions,estimateCalories,recordedActiveMinutes} from './workoutCalories.js';
import StretchRecovery from './StretchRecovery.jsx';
import './recovery.css';

export default function WorkoutResults({exercises,measurement,records:recordedWork,skipped=[],workMs={}}){
 const records=recordedWork||[],container=useRef(null);
 useEffect(()=>{if(!records.some(record=>record.pain>0))container.current?.scrollIntoView?.({block:'start',behavior:'auto'});},[]);
 const [weight,setWeight]=useState(()=>String(measurement?.weight_kg??measurement?.weight??''));
 const [rows,setRows]=useState(()=>exercises.map((ex,i)=>({minutes:skipped.includes(i)?'0':recordedActiveMinutes(records.find(r=>r.routine_exercise_id===ex.exercise_id)),met:String(calorieActivity(ex).met)})));
 const [confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 function change(i,key,value){setConfirmed(false);setRows(old=>old.map((r,j)=>i===j?{...r,[key]:value}:r));}
 const estimates=rows.map(r=>r.minutes.trim()===''?null:estimateCalories(Number(weight),Number(r.minutes),Number(r.met)));
 const total=estimates.reduce((s,v)=>s+(v?.gross||0),0),active=estimates.reduce((s,v)=>s+(v?.active||0),0);
 const muscle=measurement?.skeletal_muscle_mass??measurement?.skeletal_muscle_mass_kg;
 const performed=exercises.filter((_,i)=>confirmed?Number(rows[i].minutes)>0:!skipped.includes(i)&&(recordedWork===undefined||records.some(r=>r.routine_exercise_id===exercises[i].exercise_id&&(r.sets_completed>0||r.performed_seconds>0))));
 return <section ref={container} className="workout-results" aria-label="운동 결과와 회복">
  <header><span className="recovery-kicker">WORKOUT COMPLETE</span><h2>오늘의 운동 결과</h2><p>실제로 움직인 시간을 확인하면 예상 소모 칼로리를 보여드려요.</p></header>
  <StretchRecovery exercises={performed} pain={records.some(r=>r.pain>0)}/><h3>칼로리 확인</h3>
  <div className="recovery-measurements"><label>계산할 몸무게 (kg)<input type="number" min="20" max="350" step="0.1" value={weight} onChange={e=>{setWeight(e.target.value);setConfirmed(false);}}/></label><p>최근 골격근량 <strong>{Number.isFinite(muscle)?`${muscle} kg`:'미입력'}</strong><small>골격근량은 신체 정보로 표시합니다. 근육량만으로 운동 칼로리를 정확히 환산할 수 없어 계산 계수로 사용하지 않습니다.</small></p></div>
  <form onSubmit={e=>{e.preventDefault();if(estimates.some(v=>v===null)){setError('몸무게 20~350kg, 각 운동의 실제 시간 0~240분을 입력하세요. 안 한 운동은 0분입니다.');return;}setError('');setConfirmed(true);}}>
   <div className="calorie-rows">{exercises.map((ex,i)=><fieldset key={ex.exercise_id||`${ex.motion_id}-${i}`}><legend>{ex.exercise_name||ex.name}{skipped.includes(i)?' · 건너뜀':''}</legend>{workMs[i]>0&&<small>시범 진행 {(workMs[i]/60000).toFixed(1)}분 · 실제 수행 시간은 직접 확인하세요.</small>}<label>실제 운동 시간 (분)<input aria-label={`${ex.exercise_name||ex.name} 실제 운동 분`} type="number" min="0" max="240" step="0.01" value={rows[i].minutes} onChange={e=>change(i,'minutes',e.target.value)}/></label><label>활동 강도<select aria-label={`${ex.exercise_name||ex.name} 활동 강도`} value={rows[i].met} onChange={e=>change(i,'met',e.target.value)}>{calorieOptions(ex).map(option=><option key={option.met} value={option.met}>{option.label} · {option.met} MET</option>)}</select></label>{confirmed&&<strong>약 {Math.round(estimates[i].gross)} kcal</strong>}</fieldset>)}</div>
   <p>준비·휴식·일시정지 시간은 빼고 입력하세요. 건너뛴 운동은 기본 0분이며, 일부 수행했다면 그 시간만 입력할 수 있습니다.</p>{error&&<p role="alert">{error}</p>}<button className="btn btn-primary" type="submit">실제 시간 확인 · 칼로리 계산</button>
  </form>
  {confirmed&&<div className="calorie-total" role="status"><span>운동 시간 동안의 예상 소모량</span><strong>약 {Math.round(total)} <small>kcal</small></strong><p>안정 시 소모를 뺀 추가 활동량 약 {Math.round(active)} kcal</p></div>}
  <details><summary>칼로리 계산 기준</summary><p>MET × 3.5 × 체중(kg) ÷ 200 × 실제 운동 시간(분). 활동 종류별 평균을 적용한 추정치로, 심박·중량·휴식·운동 숙련도에 따라 실제 값은 달라집니다. 이 화면의 입력은 계산용이며 완료 기록에 자동 저장되지 않습니다.</p><a href={CALORIE_SOURCE} target="_blank" rel="noreferrer">2024 Adult Compendium of Physical Activities</a></details>
 </section>;
}
