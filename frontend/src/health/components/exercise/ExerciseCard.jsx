import {equipmentText} from '../../lib/exerciseLabels.js';
import React, { useState, lazy, Suspense } from 'react';
import { Play, ChevronUp, Video, ChevronRight } from 'lucide-react';
const CameraCoaching=lazy(()=>import('./CameraCoaching.jsx'));
const ExerciseMotion=lazy(()=>import('./ExerciseMotion.jsx'));
import ExercisePreview from './ExercisePreview.jsx';
import {BODYWEIGHT_EXERCISES, bodyweightRecordingMotionId} from './bodyweightGuide.js';
import {cameraMotionId} from './motionGuide.js';

export default function ExerciseCard({ exercise, children, paused=false, focused=false,onPoseEvaluation, onSelect, selected=false, compact=false }) {
  const [open,setOpen]=useState(focused),[camera,setCamera]=useState(false);
  const cameraMotion=cameraMotionId(exercise.motion_id);
  const cameraSupported=!!BODYWEIGHT_EXERCISES[cameraMotion]&&exercise.training_type!=='equipment';
  const recordingMotion=exercise.training_type!=='equipment'&&bodyweightRecordingMotionId(exercise.motion_id);
  if(compact) return <article id={exercise.exercise_id} className={`exercise-card exercise-catalog-card ${selected?'is-selected':''}`}>
    <ExercisePreview exercise={exercise} onOpen={onSelect}/>
    <div className="exercise-catalog-copy"><div className="exercise-regions">{(exercise.target_regions||[]).join(' · ')}</div><strong>{exercise.exercise_name}</strong>
      <p>{exercise.training_type==='bodyweight'?'맨몸운동':equipmentText(exercise.equipment)}</p>
      <div className="exercise-catalog-footer"><span>{cameraSupported?<><Video size={12}/> 카메라 코칭</>:recordingMotion?<><Video size={12}/> 동영상 촬영</>:'3D 시범'}</span><button type="button" onClick={onSelect} aria-label={`${exercise.exercise_name} 동작 보기`} aria-pressed={selected}><ChevronRight size={18}/></button></div>
    </div>
  </article>;
  return <article id={exercise.exercise_id} className={`exercise-card exercise-experience-card ${open?'exercise-card-open':''}`}>
    <div className="exercise-card-top"><div className="exercise-card-info">
      <div className="exercise-regions">{(exercise.target_regions||[]).join(' · ')}</div>
      <strong>{exercise.exercise_name}</strong>{exercise.training_type&&<p className="muted">{exercise.training_type==='bodyweight'?'맨몸운동':'헬스장·기구 운동'} · {equipmentText(exercise.equipment)}</p>}
      <p className="muted">{exercise.duration || `${exercise.sets??'-'}세트 × ${exercise.reps??'-'}`}{exercise.rest_seconds!=null?` · 휴식 ${exercise.rest_seconds}초`:''}</p>
    </div><ExercisePreview exercise={exercise} onOpen={()=>setOpen(true)}/></div><button className="btn btn-secondary" type="button" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-label={`${exercise.exercise_name} 동작 ${open?'닫기':'보기'}`}>
      {open?<ChevronUp size={16}/>:<Play size={16}/>} {open?'접기':'동작 보기'}</button>
    <span className="badge">{cameraSupported?'스켈레톤 자세 코칭 지원':'동작 시범 제공'}</span>
    <details open={!focused}><summary>운동 설명</summary><ul className="exercise-cues">{(exercise.instructions||[]).slice(0,2).map(t=><li key={t}>{t}</li>)}</ul>
    <p className="muted exercise-reason">{exercise.reason}</p></details>
    {recordingMotion&&<button type="button" className="btn btn-secondary" aria-expanded={camera} onClick={()=>setCamera(v=>!v)}>{camera?'촬영 화면 닫기':cameraSupported?'동영상 촬영·자세 교정 열기':'동영상 촬영 열기'}</button>}
    {camera&&recordingMotion&&<Suspense fallback={<p>카메라 화면 준비 중…</p>}><CameraCoaching onEvaluation={onPoseEvaluation} key={exercise.exercise_id||exercise.motion_id} motion={recordingMotion} paused={paused}/></Suspense>}
    {!camera && open && <Suspense fallback={<p role="status">동작을 불러오는 중입니다.</p>}><ExerciseMotion exercise={exercise} paused={paused}/></Suspense>}
    {children}
  </article>;
}
