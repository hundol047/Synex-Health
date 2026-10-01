import React,{useEffect,useRef,useState} from 'react';
import MotionFigure from './MotionFigure.jsx';
// The existing motion catalog and SVG renderer are shared with the detail viewer.
export default function ExercisePreview({exercise,onOpen}){
 const ref=useRef(null),[progress,setProgress]=useState(0);
 useEffect(()=>{
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let visible=false,frame=0,last=0,phase=0;
  const tick=time=>{if(time-last>=1000/12){phase=(phase+Math.min(time-last,100)/6000)%1;setProgress(phase);last=time;}frame=requestAnimationFrame(tick);};
  const update=()=>{cancelAnimationFrame(frame);if(visible&&!document.hidden&&!media?.matches){last=performance.now();frame=requestAnimationFrame(tick);}};
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.1}):null;
  if(observer)observer.observe(ref.current); // Unsupported browsers retain the still preview.
  document.addEventListener('visibilitychange',update);media?.addEventListener?.('change',update);
  return ()=>{observer?.disconnect();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',update);media?.removeEventListener?.('change',update);};
 },[exercise.motion_id]);
 return <button ref={ref} className="exercise-preview" onClick={onOpen} type="button" aria-label={`${exercise.exercise_name} 자세히 보기`} data-testid="exercise-preview"><MotionFigure exercise={exercise} progress={progress}/><span>동작 미리보기</span></button>;
}
