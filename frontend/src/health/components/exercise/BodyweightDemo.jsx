import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { getBodyweightGuide, getBodyweightDemoPhase } from './bodyweightGuide.js';

const ExerciseMotion3D = lazy(() => import('./ExerciseMotion3D.jsx'));

export default function BodyweightDemo({ exerciseId, compact = true, paused = false, measurement, profile }) {
  const guide = getBodyweightGuide(exerciseId);
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [playing, setPlaying] = useState(!reducedMotion);
  const [visible, setVisible] = useState(!document.hidden);
  const [speed, setSpeed] = useState(.75);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  useEffect(() => { progressRef.current = 0; setProgress(0); setPlaying(!reducedMotion); }, [exerciseId, reducedMotion]);
  useEffect(() => {
    const visibilityChanged = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => document.removeEventListener('visibilitychange', visibilityChanged);
  }, []);
  useEffect(() => {
    if (!guide || paused || !playing || !visible) return;
    let frame, last, renderedAt = 0;
    const animate = time => {
      if (last != null && !document.hidden) {
        progressRef.current = (progressRef.current + Math.min(time - last, 80) * speed / (exerciseId === 'lunge' || exerciseId === 'side_lunge' ? 10000 : 6000)) % 1;
        if (time - renderedAt >= 1000 / 24) { setProgress(progressRef.current); renderedAt = time; }
      }
      last = time;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [guide, exerciseId, playing, paused, speed, visible]);
  if (!guide) return <p role="status">이 운동의 시범을 준비하고 있습니다.</p>;
  const phase = getBodyweightDemoPhase(exerciseId, progress);
  return <div className={`bodyweight-demo coach-demo${guide.floor?' bodyweight-demo-floor':''}`}>
    <div className="bodyweight-demo-stage">
      <div className="bodyweight-demo-controls motion-controls">
        <button type="button" className="btn btn-ghost" aria-label={playing ? '운동 시범 일시정지' : '운동 시범 재생'} aria-pressed={playing} disabled={paused} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={14} aria-hidden="true"/> : <Play size={14} aria-hidden="true"/>}</button>
        {!guide.hold&&<select aria-label="운동 시범 속도" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.5}>느리게</option><option value={.75}>보통</option><option value={1}>1×</option></select>}
      </div>
      <Suspense fallback={<p className="bodyweight-demo-loading" role="status">운동 시범 준비 중…</p>}><ExerciseMotion3D motion={guide.motionId} progress={progress} mirror={false} compact={compact} measurement={measurement} profile={profile} defaultView={guide.defaultView}/></Suspense>
      <span className="bodyweight-demo-target">{guide.target}</span>
    </div>
    <div className="bodyweight-demo-cue" aria-label="현재 시범 안내">
      <div className="bodyweight-phase-heading"><strong>{phase.label}</strong><div className="bodyweight-phase-track" aria-hidden="true">{guide.phases.map((_,index)=><i key={index} className={index===phase.index?'is-current':index<phase.index?'is-complete':''}/>)}</div><small>{guide.hold?'호흡 유지':`${phase.index+1} / ${guide.phases.length}`}</small></div>
      <span>{phase.cue}</span>
    </div>
  </div>;
}
