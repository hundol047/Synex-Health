import React,{useEffect,useMemo,useRef,useState} from 'react';
import ExerciseMotion3D from './ExerciseMotion3D.jsx';
import StretchDiagram from './StretchDiagram.jsx';
import {speakWorkout,stopWorkoutSpeech} from './workoutSpeech.js';
import {STRETCHES,recommendStretches} from './stretchCatalog.js';
import {FLOOR_STRETCHES} from './stretchRig.js';
import './recovery.css';

export default function StretchRecovery({exercises=[],pain=false,autoStart=true}){
 const signature=exercises.map(e=>e.motion_id).join('|');
 const recommended=useMemo(()=>recommendStretches(exercises),[signature]);
 const [queue,setQueue]=useState(()=>recommended),[index,setIndex]=useState(0),[running,setRunning]=useState(()=>autoStart&&!pain&&recommended.length>0),[elapsed,setElapsed]=useState(0),[preparing,setPreparing]=useState(true),[all,setAll]=useState(false),[region,setRegion]=useState('전체');
 const initialized=useRef(recommended.length>0);
 const [voice,setVoice]=useState(false),[voiceError,setVoiceError]=useState(''),lastSpoken=useRef('');
 // Start once when actual exercise data arrives. Editing a calorie estimate
 // never interrupts or silently restarts a recovery session.
 useEffect(()=>{if(!initialized.current&&recommended.length){initialized.current=true;setQueue(recommended);setRunning(autoStart&&!pain);}},[recommended,autoStart,pain]);
 useEffect(()=>{if(pain)setRunning(false);},[pain]);
 const selected=queue[index],half=selected?selected.seconds+6:26,duration=preparing?5:half*(selected?.bilateral?2:1);
 useEffect(()=>{
  if(!running||!selected)return;
  let last=performance.now();
  // Loading the next stretch's 3D model can stall a frame; skip that gap instead of pausing,
  // so the sequence keeps advancing. Leaving the screen still pauses.
  const tick=setInterval(()=>{const now=performance.now(),delta=(now-last)/1000;last=now;if(document.hidden){setRunning(false);return;}if(delta>1.5)return;setElapsed(old=>Math.min(duration,old+delta));},1000/30);
  const hide=()=>{if(document.hidden)setRunning(false);};document.addEventListener('visibilitychange',hide);
  return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',hide);};
 },[running,selected,duration]);
 useEffect(()=>{if(!running||elapsed<duration)return;if(preparing){setPreparing(false);setElapsed(0);}else{setIndex(i=>i+1);setElapsed(0);setPreparing(true);if(index+1>=queue.length)setRunning(false);}},[elapsed,duration,running,preparing,index,queue.length]);
 const side=!preparing&&elapsed>=half&&selected?.bilateral?1:0,local=preparing?0:Math.min(half,elapsed-side*half);
 const phase=preparing?'다음 자세 준비':local<3?'천천히 자세 잡기':local<half-3?(selected?.dynamic?'편안한 범위에서 천천히 움직이기':'편안히 유지 · 숨 참지 않기'):'천천히 풀기';
 const progress=selected?.dynamic?local/half:local<3?local/3*.12:local<half-3?.5:.88+(local-half+3)/3*.12;
 const seconds=Math.ceil(duration-elapsed);
 useEffect(()=>{
  if(!voice||!running||!selected){stopWorkoutSpeech('recovery');lastSpoken.current='';return;}
  const key=`${index}:${selected.id}:${preparing}:${side}:${seconds}`;
  const message=preparing&&seconds===5?`${selected.name}. 5초 뒤 시작합니다.`:!preparing&&local<.5?`${side?'반대쪽. ':''}${selected.cue}`:!preparing&&seconds<=5?`${seconds}초`:null;
  if(message&&lastSpoken.current!==key){lastSpoken.current=key;speakWorkout(message,'recovery').catch(()=>{setVoice(false);setVoiceError('음성을 사용할 수 없어 화면 안내를 계속합니다.');});}
 },[voice,running,selected,index,preparing,side,seconds]);
 useEffect(()=>()=>stopWorkoutSpeech('recovery'),[]);
 const shown=all?STRETCHES.filter(s=>region==='전체'||s.regions.includes(region)):recommended;
 // Picking from the full list continues through the rest of that list automatically.
 function choose(s){const list=shown.slice(shown.indexOf(s));setQueue(list);setIndex(0);setElapsed(0);setPreparing(true);setRunning(!pain);}
 function skip(){setIndex(i=>i+1);setElapsed(0);setPreparing(true);if(index+1>=queue.length)setRunning(false);}
 function restart(){setQueue(recommended);setIndex(0);setElapsed(0);setPreparing(true);setRunning(!pain);}
 return <section className="stretch-recovery" aria-label="운동 후 스트레칭">
  <header><span className="recovery-kicker">RECOVERY · 운동에 맞춘 마무리</span><h2>사용한 근육을 부드럽게 풀어요</h2><p>{recommended.length?`수행한 운동의 사용 부위와 연결된 부위에 맞춰 ${recommended.length}개를 추천했어요. 5초 준비 후 순서대로 자동 진행합니다.`:'아직 수행한 운동이 없어 자동 추천을 시작하지 않았어요.'}</p></header>
  <p>당기는 느낌이 약한 범위에서 반동 없이 20초씩, 양쪽 동작은 반대쪽도 이어집니다. 실제 피로도 측정이나 근육통·회복 효과를 보장하는 추천은 아닙니다.</p>
  <label><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> 스트레칭 음성 안내</label>{voiceError&&<p role="status">{voiceError}</p>}
  {pain&&<p role="alert">통증이 기록되어 자동 스트레칭을 멈췄어요. 아픈 부위를 늘리기보다 쉬고, 통증이 지속되면 전문가와 상담하세요.</p>}
  {!!queue.length&&<div className="recovery-tabs"><button type="button" className="btn btn-primary" disabled={pain} onClick={()=>selected?setRunning(v=>!v):restart()}>{selected?(running?'스트레칭 일시정지':'스트레칭 계속하기'):'추천 스트레칭 다시 시작'}</button>{selected&&<button type="button" className="btn btn-secondary" onClick={skip}>이 스트레칭 건너뛰기</button>}<button type="button" className="btn btn-ghost" onClick={()=>{setRunning(false);setIndex(queue.length);}}>스트레칭 종료</button></div>}
  {!!queue.length&&!selected&&<p role="status">회복 동작 순서가 끝났어요. 편안하게 마무리하세요.</p>}
  {selected&&<article className="stretch-player" aria-label={selected.name+' 동작 안내'}>
   <header><div><small>{index+1} / {queue.length} · {selected.regions.join(' · ')}</small><h3>{selected.name}</h3></div><span>{running?'자동 진행 중':'일시정지'}</span></header>
   <ExerciseMotion3D key={selected.id} motion={selected.motion_id} progress={progress} mirror={!!side} defaultView={FLOOR_STRETCHES.has(selected.motion_id)||selected.id==='triceps'?'45':'front'} fallbackContent={<StretchDiagram motion={selected.motion_id} progress={progress} mirror={!!side}/>}/>
   <div className="stretch-clock" role="timer" aria-label="스트레칭 남은 시간"><strong>{Math.ceil(Math.max(0,duration-elapsed))}초</strong><span>{!preparing&&selected.bilateral?(side?'반대쪽 · ':'첫 번째 쪽 · '):''}{phase}</span></div>
   <p>{selected.cue}</p><p className="stretch-caution">{selected.caution}</p>
   <p className="muted">다음: {queue[index+1]?.name||'마무리'} · 동작 사이 5초 준비. 한 동작이 끝나면 다음 동작으로 자동으로 넘어가며, 화면을 벗어나면 멈춥니다.</p>
  </article>}
  <div className="recovery-tabs"><button type="button" className="btn btn-secondary" aria-pressed={!all} onClick={()=>setAll(false)}>추천 순서 보기</button><button type="button" className="btn btn-secondary" aria-pressed={all} onClick={()=>setAll(true)}>전체 30가지 · 동작 바꾸기</button></div>
  {all&&<label>늘릴 부위<select value={region} onChange={e=>setRegion(e.target.value)}>{['전체',...new Set(STRETCHES.flatMap(s=>s.regions))].map(r=><option key={r}>{r}</option>)}</select></label>}
  {!recommended.length&&<p>수행한 운동이 없어 자동 스트레칭은 시작하지 않습니다. 전체 목록에서도 고를 수 있어요.</p>}
  <div className="stretch-grid">{shown.map((s,i)=><button type="button" className="stretch-choice" key={s.id} aria-pressed={selected?.id===s.id} disabled={pain} onClick={()=>all?choose(s):(setQueue(recommended),setIndex(i),setElapsed(0),setPreparing(true),setRunning(true))}><small>{!all?i+1+'. ':''}{s.regions.join(' · ')}</small><strong>{s.name}</strong><span>{s.bilateral?'양쪽 각 ':''}20초{s.dynamic?' · 천천히 움직이기':''}</span>{s.reasons?.length>0&&<small>{s.reasons.slice(0,2).join(' / ')} 후 {s.related?'연결 부위 이완':'추천'}</small>}</button>)}</div>
 </section>;
}
