import React,{useEffect,useRef,useState} from 'react';
export default function WorkoutTimer({seconds,onChange,target,paused,disabled}){
 const [running,setRunning]=useState(false);const latest=useRef({seconds,onChange});latest.current={seconds,onChange};
 useEffect(()=>{if(paused||disabled)setRunning(false);},[paused,disabled]);
 useEffect(()=>{
  if(!running||paused||disabled)return;
  const start=Date.now(),base=latest.current.seconds;
  const tick=()=>{const elapsed=Math.min(86400,base+(Date.now()-start)/1000);latest.current.onChange(Math.floor(elapsed));if(elapsed>=86400)setRunning(false);};
  const id=setInterval(tick,250);return()=>clearInterval(id);
 },[running,paused,disabled]);
 const format=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
 return <section className="workout-timer" aria-label="운동 시간 타이머"><p>목표 {format(target)} · 수행 <strong role="timer">{format(seconds)}</strong></p>
 <button type="button" className="btn btn-primary" disabled={paused||disabled} onClick={()=>setRunning(v=>!v)}>{running?'타이머 멈추기':'타이머 시작'}</button>
 <button type="button" className="btn btn-ghost" disabled={running||disabled} onClick={()=>onChange(0)}>시간 초기화</button><p className="muted">중간에 멈춰도 실제 수행한 시간을 기록할 수 있어요. 다시 열었을 때는 정지 상태로 복구됩니다.</p></section>;
}
