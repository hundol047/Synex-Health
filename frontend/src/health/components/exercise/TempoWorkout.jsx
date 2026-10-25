import React,{useEffect,useRef,useState} from 'react';
import useTempoSession from './useTempoSession.js';
import TempoControls from './TempoControls.jsx';
import ExerciseMotion from './ExerciseMotion.jsx';
import CameraCoaching from './CameraCoaching.jsx';
import WorkoutResults from './WorkoutResults.jsx';
import {coachingMotionId} from './coachingCatalog.js';

export default function TempoWorkout({exercises,onClose,measurement,autoStart=false}){
 const session=useTempoSession(exercises),[stopped,setStopped]=useState(false);
 const current=useRef(session);current.current=session;
 useEffect(()=>{if(!autoStart)return;const timer=setTimeout(()=>current.current.start(),0);return()=>clearTimeout(timer);},[autoStart]);
 const exercise=exercises[session.segment?.exerciseIndex??0];
 if(!exercise)return <p>계획된 운동이 없습니다.</p>;
 const motion=coachingMotionId(exercise.motion_id);
 return <section className={`tempo-workout${session.state.status!=='complete'&&!stopped?' tempo-workout-live':''}`}><header><div><h2>자동 운동 따라하기</h2><p>{exercise.exercise_name||exercise.name}</p></div><button type="button" className="btn btn-secondary" onClick={onClose}>실제 수행 기록하기</button></header>
  <TempoControls compact session={session} exercises={exercises} disabled={stopped}/>
  {session.state.status==='complete'?<WorkoutResults exercises={exercises} measurement={measurement} skipped={session.state.skipped} workMs={session.state.workMs}/>:stopped?<p role="alert">통증으로 운동을 중단했습니다. 편하게 쉬고 실제 수행 기록에 통증을 남겨 주세요.</p>:<><button type="button" className="btn btn-secondary" onClick={()=>{session.pause();setStopped(true);}}>통증이 있어 중단</button>
   {motion?<CameraCoaching continuousSession immersive standaloneSession={false} motion={motion} playback={session.playback} paused={session.state.status==='paused'} exercise={exercise}/>:<ExerciseMotion exercise={exercise} playback={session.playback}/>}
  </>}
 </section>;
}
