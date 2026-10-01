import React, { useState, lazy, Suspense } from 'react';
import { Play, ChevronUp } from 'lucide-react';
const ExerciseMotion=lazy(()=>import('./ExerciseMotion.jsx'));
import ExercisePreview from './ExercisePreview.jsx';
import {POSE_EXERCISES} from './poseCoach.js';

export default function ExerciseCard({ exercise, children }) {
  const [open,setOpen]=useState(false);
  return <article className={`exercise-card ${open?'exercise-card-open':''}`}>
    <div className="exercise-card-top"><div className="exercise-card-info">
      <div className="exercise-regions">{(exercise.target_regions||[]).join(' · ')}</div>
      <strong>{exercise.exercise_name}</strong>
      <p className="muted">{exercise.duration || `${exercise.sets??'-'}세트 × ${exercise.reps??'-'}`}{exercise.rest_seconds!=null?` · 휴식 ${exercise.rest_seconds}초`:''}</p>
    </div><ExercisePreview exercise={exercise} onOpen={()=>setOpen(true)}/></div><button className="btn btn-secondary" type="button" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-label={`${exercise.exercise_name} 동작 ${open?'닫기':'보기'}`}>
      {open?<ChevronUp size={16}/>:<Play size={16}/>} {open?'접기':'동작 보기'}</button>
    {POSE_EXERCISES[exercise.motion_id] && <span className="badge">AI FORM CHECK · 설명용 추정</span>}
    <ul className="exercise-cues">{(exercise.instructions||[]).slice(0,2).map(t=><li key={t}>{t}</li>)}</ul>
    <p className="muted exercise-reason">{exercise.reason}</p>
    {open && <Suspense fallback={<p role="status">동작을 불러오는 중입니다.</p>}><ExerciseMotion exercise={exercise}/></Suspense>}
    {children}
  </article>;
}
