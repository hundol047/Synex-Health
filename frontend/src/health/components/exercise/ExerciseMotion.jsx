import React, { useEffect, useId, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import ExerciseMotion3D from './ExerciseMotion3D.jsx';
import { MOTIONS } from './motions.js';
import MotionFigure from './MotionFigure.jsx';

export default function ExerciseMotion({ exercise, measurement, profile }) {
  const motion = MOTIONS[exercise.motion_id];
  const [dimension,setDimension]=useState(motion?.twoDimensionalOnly?'2d':'3d');
  const [loop,setLoop]=useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [mirror, setMirror] = useState(false);
  const phase = useRef(0);
  const labelId = useId();
  useEffect(() => { setPlaying(false); phase.current=0; setProgress(0); }, [exercise.motion_id]);
  useEffect(() => {
    if (!playing || !motion) return;
    let frame, last;
    function animate(time) {
      if (last !== undefined) {
        const next=phase.current + Math.min(time-last,100) * speed / 6000;
        phase.current = loop?next%1:Math.min(next,1);if(!loop&&next>=1)setPlaying(false);
        setProgress(phase.current);
      }
      last=time; frame=requestAnimationFrame(animate);
    }
    frame=requestAnimationFrame(animate);
    const hide=()=>{if(document.hidden) setPlaying(false);};
    document.addEventListener('visibilitychange',hide);
    return () => {cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide);};
  }, [playing, speed, motion, loop]);
  if (!motion) return <p className="muted">이전 버전 운동입니다. 루틴을 다시 생성하면 동작 안내를 볼 수 있습니다.</p>;
  const setPhase=(value)=>{setPlaying(false); phase.current=value;setProgress(value);};
  return <div className="motion-layout">
    <div className="motion-viewer">
      <div className="motion-caption"><span>동작 가이드</span><span>{motion.view}</span></div>
      <div className="motion-controls"><button disabled={motion.twoDimensionalOnly} className="btn btn-ghost" onClick={()=>setDimension(d=>d==='3d'?'2d':'3d')}>{motion.twoDimensionalOnly?'기구·지지점 2D 안내':dimension==='3d'?'2D 안내 보기':'3D 안내 보기'}</button><label><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> 반복 재생</label></div>
      {dimension==='3d'?<ExerciseMotion3D motion={exercise.motion_id} progress={progress} mirror={mirror} measurement={measurement} profile={profile}/>:<MotionFigure exercise={exercise} progress={progress} mirror={mirror}/>}
      <p className="motion-phase">{motion.label}</p>
      <input aria-label="동작 구간" type="range" min="0" max="100" value={Math.round(progress*100)} onChange={e=>setPhase(Number(e.target.value)/100)} />
      <div className="motion-controls">
        <button className="btn btn-primary" type="button" onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'일시정지':'동작 재생'}</button>
        <button className="btn btn-ghost" aria-label="처음 자세로" type="button" onClick={()=>setPhase(0)}><RotateCcw size={16}/></button>
        <select aria-label="재생 속도" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5× 느리게</option><option value={1}>1×</option></select>
        <button className="btn btn-ghost" type="button" onClick={()=>setMirror(p=>!p)}>좌우 반전</button>
      </div>
      <p className="motion-note">자세 이해를 위한 개념 애니메이션입니다. 관절 각도나 개인 가동범위를 측정한 영상이 아닙니다.</p>
    </div>
    <div className="motion-instructions">
      <h4>이렇게 따라 하세요</h4>
      <ol>{(exercise.instructions||[]).map(step=><li key={step}>{step}</li>)}</ol>
      <div className="motion-intensity"><strong>운동 강도</strong><p>{exercise.intensity || '통증 없는 편안한 범위'}</p></div>
      <ul className="motion-cautions">{(exercise.cautions||[]).map(c=><li key={c}>{c}</li>)}</ul>
    </div>
  </div>;
}
