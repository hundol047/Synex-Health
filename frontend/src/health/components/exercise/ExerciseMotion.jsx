import React, { useEffect, useId, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { MOTIONS, samplePose } from './motions.js';

export default function ExerciseMotion({ exercise }) {
  const motion = MOTIONS[exercise.motion_id];
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
        phase.current = (phase.current + Math.min(time-last,100) * speed / 6000) % 1;
        setProgress(phase.current);
      }
      last=time; frame=requestAnimationFrame(animate);
    }
    frame=requestAnimationFrame(animate);
    const hide=()=>{if(document.hidden) setPlaying(false);};
    document.addEventListener('visibilitychange',hide);
    return () => {cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide);};
  }, [playing, speed, motion]);
  if (!motion) return <p className="muted">이전 버전 운동입니다. 루틴을 다시 생성하면 동작 안내를 볼 수 있습니다.</p>;
  const points=samplePose(exercise.motion_id,progress);
  const bone=(a,b,color,width=15,key='')=><line key={key || `${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke={color} strokeWidth={width} strokeLinecap="round"/>;
  const setPhase=(value)=>{setPlaying(false); phase.current=value;setProgress(value);};
  return <div className="motion-layout">
    <div className="motion-viewer">
      <div className="motion-caption"><span>동작 가이드</span><span>{motion.view}</span></div>
      <svg viewBox="0 0 360 330" role="img" aria-labelledby={labelId} className="motion-svg">
        <title id={labelId}>{exercise.exercise_name} 동작 시범</title>
        <ellipse cx="183" cy="308" rx="124" ry="9" fill="#dae5f3"/>
        <path d="M30 301H330" stroke="#c6d5e8" strokeWidth="2"/>
        <g transform={mirror ? 'translate(360 0) scale(-1 1)' : undefined}>
          {motion.prop==='chair' && <path d="M89 222H158M96 222V298M153 222V298M89 222V158" fill="none" stroke="#94a3b8" strokeWidth="8"/>}
          {motion.prop==='seat' && <path d="M119 207H178M125 207V297M174 207V297M119 207V129" fill="none" stroke="#94a3b8" strokeWidth="8"/>}
          {motion.prop==='wall' && <path d="M291 40V301" stroke="#94a3b8" strokeWidth="12"/>}
          {motion.prop==='mat' && <rect x="26" y="294" width="301" height="6" rx="3" fill="#b6cce8"/>}
          {motion.prop==='support' && <path d="M105 139H134M110 139V301" stroke="#94a3b8" strokeWidth="6"/>}
          {motion.prop==='band' && <><path d="M310 53V299" stroke="#94a3b8" strokeWidth="7"/><path d={`M310 114L${points[4]}M310 114L${points[6]}`} stroke="#f59e0b" strokeWidth="4" fill="none"/></>}
          {[[1,5],[5,6],[2,9],[9,10]].map(([a,b])=>bone(a,b,'#9eb9da',14))}
          {bone(1,2,'#2266b0',32)}
          {bone(0,1,'#c69170',12)}
          {[[1,3],[3,4]].map(([a,b])=>bone(a,b,'#4289d2',15))}
          {[[2,7],[7,8]].map(([a,b])=>bone(a,b,'#244b79',19))}
          {[3,7,9].map(i=><circle key={i} cx={points[i][0]} cy={points[i][1]} r="5" fill="#e8f2fd"/>)}
          <circle cx={points[0][0]} cy={points[0][1]} r="21" fill="#d9ab89"/>
          <path d={`M${points[0][0]-19} ${points[0][1]-6}q19 -30 39 0`} stroke="#24415f" strokeWidth="9" fill="none"/>
          <circle cx={points[0][0]+9} cy={points[0][1]} r="2" fill="#24415f"/>
          {[8,10].map(i=><path key={i} d={`M${points[i][0]-5} ${points[i][1]+2}h18`} stroke="#1a344f" strokeWidth="10" strokeLinecap="round"/>)}
          {motion.prop==='dumbbell' && [4,6].map(i=><g key={i} transform={`translate(${points[i]})`}><path d="M-13 0H13" stroke="#344861" strokeWidth="5"/><path d="M-13 -8V8M13 -8V8" stroke="#344861" strokeWidth="7" strokeLinecap="round"/></g>)}
        </g>
      </svg>
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
