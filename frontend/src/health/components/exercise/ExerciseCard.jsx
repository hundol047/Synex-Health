import {equipmentText} from '../../lib/exerciseLabels.js';
import React, { useState, lazy, Suspense } from 'react';
import { Play, ChevronUp } from 'lucide-react';
const CameraCoaching=lazy(()=>import('./CameraCoaching.jsx'));
const ExerciseMotion=lazy(()=>import('./ExerciseMotion.jsx'));
import ExercisePreview from './ExercisePreview.jsx';
import {POSE_EXERCISES} from './poseCoach.js';

export default function ExerciseCard({ exercise, children, paused=false, focused=false,onPoseEvaluation }) {
  const [open,setOpen]=useState(focused),[camera,setCamera]=useState(false);
  return <article id={exercise.exercise_id} className={`exercise-card ${open?'exercise-card-open':''}`}>
    <div className="exercise-card-top"><div className="exercise-card-info">
      <div className="exercise-regions">{(exercise.target_regions||[]).join(' · ')}</div>
      <strong>{exercise.exercise_name}</strong>{exercise.training_type&&<p className="muted">{exercise.training_type==='bodyweight'?'맨몸운동':'헬스장·기구 운동'} · {equipmentText(exercise.equipment)}</p>}
      <p className="muted">{exercise.duration || `${exercise.sets??'-'}세트 × ${exercise.reps??'-'}`}{exercise.rest_seconds!=null?` · 휴식 ${exercise.rest_seconds}초`:''}</p>
    </div><ExercisePreview exercise={exercise} onOpen={()=>setOpen(true)}/></div><button className="btn btn-secondary" type="button" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-label={`${exercise.exercise_name} 동작 ${open?'닫기':'보기'}`}>
      {open?<ChevronUp size={16}/>:<Play size={16}/>} {open?'접기':'동작 보기'}</button>
    <span className="badge">{POSE_EXERCISES[exercise.motion_id]?'카메라 자세 참고 지원 · 정확도 검증 전':'카메라 분석 미지원 · 동작 안내 제공'}</span>
    <details open={!focused}><summary>운동 설명</summary><ul className="exercise-cues">{(exercise.instructions||[]).slice(0,2).map(t=><li key={t}>{t}</li>)}</ul>
    <p className="muted exercise-reason">{exercise.reason}</p></details>
    {POSE_EXERCISES[exercise.motion_id]&&<button type="button" className="btn btn-secondary" aria-expanded={camera} onClick={()=>setCamera(v=>!v)}>{camera?'카메라 코칭 닫기':'카메라 코칭 열기'}</button>}
    {camera&&POSE_EXERCISES[exercise.motion_id]&&<Suspense fallback={<p>카메라 화면 준비 중…</p>}><CameraCoaching onEvaluation={onPoseEvaluation} key={exercise.exercise_id||exercise.motion_id} motion={exercise.motion_id} paused={paused}/></Suspense>}
    {!camera && open && <Suspense fallback={<p role="status">동작을 불러오는 중입니다.</p>}><ExerciseMotion exercise={exercise}/></Suspense>}
    {children}
  </article>;
}
