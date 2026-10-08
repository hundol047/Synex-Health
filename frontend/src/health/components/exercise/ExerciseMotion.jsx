import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, FlipHorizontal2, Repeat2, Check, ChevronDown } from 'lucide-react';
import ExerciseMotion3D from './ExerciseMotion3D.jsx';
import { MOTIONS } from './motions.js';
import { getMotionGuide, motionPhase } from './motionGuide.js';
import MotionFigure from './MotionFigure.jsx';
import './exercise-experience.css';

export default function ExerciseMotion({ exercise, measurement, profile, paused=false }) {
  const motion = MOTIONS[exercise.motion_id], guide = getMotionGuide(exercise.motion_id);
  const [dimension, setDimension] = useState('3d');
  const [loop, setLoop] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [mirror, setMirror] = useState(false);
  const phase = useRef(0), viewer = useRef(null);
  const currentPhase = motionPhase(exercise.motion_id, progress);
  useEffect(() => { setPlaying(false); setDimension('3d'); phase.current = 0; setProgress(0); }, [exercise.motion_id]);
  useEffect(() => { if (paused) setPlaying(false); }, [paused]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const pause = () => setPlaying(false);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); }, { threshold: .05 });
    if (viewer.current) observer?.observe(viewer.current);
    media?.addEventListener?.('change', pause);
    return () => { observer?.disconnect(); media?.removeEventListener?.('change', pause); };
  }, [exercise.motion_id]);
  useEffect(() => {
    if (!playing || !motion) return;
    if (document.hidden) { setPlaying(false); return; }
    let frame, last, renderedAt = 0;
    const duration = guide?.durationMs || 7000;
    function animate(time) {
      if (last !== undefined) {
        const next = phase.current + Math.min(time - last, 100) * speed / duration;
        phase.current = loop ? next % 1 : Math.min(next, 1);
        if (!loop && next >= 1) setPlaying(false);
        if (time - renderedAt >= 1000 / 24 || (!loop && next >= 1)) { setProgress(phase.current); renderedAt = time; }
      }
      last = time;
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide); };
  }, [playing, speed, motion, loop, guide?.durationMs]);
  if (!motion) return <p className="muted">이전 버전 운동입니다. 루틴을 다시 생성하면 동작 안내를 볼 수 있습니다.</p>;
  const setPhase = value => { setPlaying(false); phase.current = value; setProgress(value); };
  const playPause = () => { if (!playing && phase.current >= 1) { phase.current = 0; setProgress(0); } setPlaying(p => !p); };
  const selectStep = step => {
    const cycle = guide?.kind === 'alternating' ? progress >= .5 ? .5 : 0 : 0;
    setPhase(cycle + step.start / (guide?.kind === 'alternating' ? 2 : 1));
  };
  return <div className="motion-layout exercise-motion-experience">
    <div className="motion-viewer" ref={viewer}>
      <div className="motion-studio-heading"><div><span className="motion-studio-kicker">동작 가이드</span><strong>{dimension === '3d' ? '3D 동작 시범' : '간단 동작 안내'}</strong></div><span className="motion-studio-status"><i className={playing ? 'is-playing' : ''}/>{playing ? '재생 중' : '정지 화면'}</span></div>
      {dimension === '3d' ? <ExerciseMotion3D motion={exercise.motion_id} progress={progress} mirror={mirror} measurement={measurement} profile={profile} defaultView={guide?.defaultView}/> : <MotionFigure exercise={exercise} progress={progress} mirror={mirror}/>}
      <div className="motion-playback-controls">
        <button className="btn btn-primary" type="button" disabled={paused} onClick={playPause}>{playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor"/>}{playing ? '일시정지' : '동작 재생'}</button>
        <button className="motion-icon-control" aria-label="처음 자세로" title="처음 자세로" type="button" onClick={() => setPhase(0)}><RotateCcw size={18}/></button>
        <select aria-label="재생 속도" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={.5}>0.5× 느리게</option><option value={.75}>0.75×</option><option value={1}>1× 보통</option></select>
        <button className={`motion-icon-control ${mirror ? 'is-active' : ''}`} aria-label="좌우 반전" aria-pressed={mirror} title="좌우 반전" type="button" onClick={() => setMirror(p => !p)}><FlipHorizontal2 size={18}/></button>
      </div>
      <div className="motion-current-phase"><div><span>{guide?.kind === 'alternating' ? `교대 동작 ${progress >= .5 ? '2' : '1'} / 2` : guide?.kind === 'hold' ? '호흡 유지' : '현재 동작'}</span><strong>{currentPhase?.label || motion.label}</strong></div>{currentPhase && <small>{currentPhase.index + 1} / {currentPhase.total}</small>}</div>
      <p className="motion-phase-cue">{currentPhase?.cue || exercise.instructions?.[0]}</p>
      {!!guide?.phases.length && <div className="motion-phase-steps" role="group" aria-label="동작 순서">{guide.phases.map((step, index) => <button type="button" key={index} aria-label={`${step.label} 구간 보기`} aria-current={currentPhase?.index === index ? 'step' : undefined} onClick={() => selectStep(step)}><span>{index + 1}</span>{step.label}</button>)}</div>}
      <div className="motion-scrubber"><input aria-label="동작 구간" aria-valuetext={`${Math.round(progress * 100)}% · ${currentPhase?.label || motion.label}`} type="range" min="0" max="100" value={Math.round(progress * 100)} style={{ '--motion-progress': `${Math.round(progress * 100)}%` }} onChange={e => setPhase(Number(e.target.value) / 100)}/><div><span>시작 자세</span><span>{Math.round(progress * 100)}%</span><span>한 주기</span></div></div>
      <details className="motion-extra-controls"><summary>재생 설정<ChevronDown size={14}/></summary><div><label><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)}/><Repeat2 size={16}/> 반복 재생</label><button type="button" onClick={() => setDimension(d => d === '3d' ? '2d' : '3d')}>{dimension === '3d' ? '2D 안내 보기' : '3D 안내 보기'}</button></div></details>
    </div>
    <div className="motion-instructions">
      <div className="motion-instruction-heading"><span>01</span><h4>준비부터 마무리까지</h4></div><p className="motion-instruction-intro">시작 자세를 확인한 뒤, 0.5× 속도로 지지점과 움직임을 살펴보세요.</p>
      <ol className="motion-instruction-list">{(exercise.instructions || []).map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
      <div className="motion-intensity"><strong>운동 강도</strong><p>{exercise.intensity || '통증 없는 편안한 범위'}</p></div>
      <div className="motion-instruction-heading"><span>02</span><h4>수행 중 확인할 점</h4></div><ul className="motion-cautions">{(exercise.cautions || []).map((c, index) => <li key={`${index}-${c}`}><Check size={14}/><span>{c}</span></li>)}</ul>
      <p className="motion-note">자세 이해를 위한 애니메이션입니다. 개인의 관절 각도나 가동범위를 측정한 영상이 아닙니다.</p>
    </div>
  </div>;
}
