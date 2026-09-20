import React, { useState } from 'react';
import { Play, ChevronUp } from 'lucide-react';
import ExerciseMotion from './ExerciseMotion.jsx';

export default function ExerciseCard({ exercise, children }) {
  const [open,setOpen]=useState(false);
  return <article className={`exercise-card ${open?'exercise-card-open':''}`}>
    <div className="exercise-card-top"><div>
      <div className="exercise-regions">{(exercise.target_regions||[]).join(' · ')}</div>
      <strong>{exercise.exercise_name}</strong>
      <p className="muted">{exercise.duration || `${exercise.sets??'-'}세트 × ${exercise.reps??'-'}`}{exercise.rest_seconds!=null?` · 휴식 ${exercise.rest_seconds}초`:''}</p>
    </div><button className="btn btn-secondary" type="button" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-label={`${exercise.exercise_name} 동작 ${open?'닫기':'보기'}`}>
      {open?<ChevronUp size={16}/>:<Play size={16}/>} {open?'접기':'동작 보기'}</button></div>
    <p className="muted exercise-reason">{exercise.reason}</p>
    {open && <ExerciseMotion exercise={exercise}/>}
    {children}
  </article>;
}
