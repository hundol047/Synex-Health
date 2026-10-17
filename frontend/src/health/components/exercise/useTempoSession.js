import {useCallback,useEffect,useMemo,useState} from 'react';
import {buildTempoPlan,tempoFrame} from './tempoSession.js';

export default function useTempoSession(exercises,{disabled=false}={}){
 const [speed,setSpeed]=useState(1),[restOverrides,setRestOverrides]=useState({});
 const plan=useMemo(()=>buildTempoPlan(exercises,{speed,restOverrides}),[exercises,speed,restOverrides]);
 const [state,setState]=useState({status:'idle',index:0,elapsed:0});
 const pause=useCallback(()=>setState(s=>s.status==='running'?{...s,status:'paused'}:s),[]);
 const signature=exercises.map(e=>e.exercise_id||e.motion_id).join('|');
 useEffect(()=>{setState({status:'idle',index:0,elapsed:0});setRestOverrides({});},[signature]);
 useEffect(()=>{if(disabled)pause();},[disabled,pause]);
 useEffect(()=>{const hide=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[pause]);
 useEffect(()=>{
  if(state.status!=='running'||disabled)return;
  let last=performance.now();
  const timer=setInterval(()=>{
   const now=performance.now(),delta=now-last;last=now;
   // A suspended/stalled display cannot silently consume a set or its rest.
   if(document.hidden||delta>1500){pause();return;}
   setState(s=>{
    if(s.status!=='running')return s;
    const segment=plan[s.index];if(!segment)return {...s,status:'complete'};
    const elapsed=s.elapsed+Math.max(0,delta);
    if(elapsed>=segment.durationMs)return {status:s.index+1>=plan.length?'complete':'running',index:s.index+1,elapsed:0};
    return {...s,elapsed};
   });
  },1000/24);
  return()=>clearInterval(timer);
 },[state.status,disabled,plan,pause]);
 const segment=plan[state.index],frame=tempoFrame(segment,state.elapsed);
 function start(){if(disabled||document.hidden||!plan.length)return;setState(s=>s.status==='paused'?{...s,status:'running'}:{status:'running',index:0,elapsed:0});}
 function restChange(index,seconds){setRestOverrides(old=>({...old,[index]:Math.max(10,Math.min(120,seconds))}));}
 return {state,segment,frame,plan,speed,setSpeed,pause,start,restChange,restOverrides,
  reset:()=>setState({status:'idle',index:0,elapsed:0}),
  skipRest:()=>setState(s=>plan[s.index]?.kind==='rest'?{status:s.index+1>=plan.length?'complete':s.status,index:s.index+1,elapsed:0}:s),
  playback:state.status==='idle'?null:{progress:frame.progress,running:state.status==='running'&&segment?.kind==='work',kind:segment?.kind||'complete',remaining:frame.remaining,rep:frame.rep,side:frame.side}};
}
