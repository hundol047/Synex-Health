import React,{useEffect,useRef} from 'react';
import StretchRecovery from './StretchRecovery.jsx';
import './recovery.css';

export default function WorkoutResults({exercises,records:recordedWork,skipped=[]}){
 const records=recordedWork||[],container=useRef(null);
 useEffect(()=>{if(!records.some(record=>record.pain>0))container.current?.scrollIntoView?.({block:'start',behavior:'auto'});},[]);
 const performed=exercises.filter((_,i)=>!skipped.includes(i)&&(recordedWork===undefined||records.some(r=>r.routine_exercise_id===exercises[i].exercise_id&&(r.sets_completed>0||r.performed_seconds>0))));
 return <section ref={container} className="workout-results" aria-label="운동 결과와 회복">
  <header><span className="recovery-kicker">WORKOUT COMPLETE</span><h2>오늘의 운동 결과</h2><p>수행한 운동에 맞춘 마무리 스트레칭을 이어서 진행합니다.</p></header>
  <StretchRecovery exercises={performed} pain={records.some(r=>r.pain>0)}/>
 </section>;
}
