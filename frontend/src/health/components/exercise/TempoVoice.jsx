import React,{useEffect,useRef,useState} from 'react';
import {speechAvailable,speakWorkout,stopWorkoutSpeech,tempoAnnouncement,setTempoSpeechActive} from './workoutSpeech.js';
export default function TempoVoice({session,exercises}){
 const [enabled,setEnabled]=useState(false),[error,setError]=useState('');
 const last=useRef(null),generation=useRef(0);
 const cue=tempoAnnouncement(session,exercises);
 useEffect(()=>{
  const version=++generation.current;
  setTempoSpeechActive(enabled&&session.state.status==='running');
  if(!enabled||!cue){last.current=null;stopWorkoutSpeech();return;}
  if(last.current===cue.key)return;
  last.current=cue.key;
  speakWorkout(cue.text).catch(e=>{if(generation.current===version){setError(e.message||'한국어 음성을 확인해 주세요.');setEnabled(false);}});
 },[enabled,cue?.key,session.state.status]);
 useEffect(()=>()=>{generation.current++;setTempoSpeechActive(false);stopWorkoutSpeech();},[]);
 return <div className="tempo-voice"><label><input type="checkbox" checked={enabled} disabled={!speechAvailable()} onChange={e=>{setEnabled(e.target.checked);setError('');}}/> 운동 음성 · 이름·초·횟수 읽기</label><small>반복 운동은 시범 횟수, 시간 운동은 지난 초, 휴식은 남은 초를 읽습니다. 음성 카운트 중에는 자세 안내 음성이 겹치지 않습니다.</small>{error&&<p role="alert">{error} 휴대폰의 텍스트 음성 변환 설정에서 한국어 음성을 확인하세요.</p>}{!speechAvailable()&&<p>이 브라우저는 음성 읽기를 지원하지 않습니다.</p>}</div>;
}
