import React,{useEffect,useRef,useState,lazy,Suspense} from 'react';
import {api} from '../../../shared/lib/api.js';
import {createPoseRunner} from './poseRunner.js';
import {createExercisePoseAnalyzer,POSE_EXERCISES,CAMERA_DIRECTIONS} from './poseCoach.js';
const ExerciseMotion3D=lazy(()=>import('./ExerciseMotion3D.jsx'));
const CONNECTIONS=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
function Demo({motion,paused}){
 const [playing,setPlaying]=useState(false),[progress,setProgress]=useState(0);
 useEffect(()=>{if(paused)setPlaying(false);},[paused]);
 useEffect(()=>{
  if(!playing)return;let frame,last;
  const tick=time=>{if(last!=null)setProgress(p=>(p+Math.min(time-last,100)/6000)%1);last=time;frame=requestAnimationFrame(tick);};
  const hide=()=>{if(document.hidden)setPlaying(false);};
  frame=requestAnimationFrame(tick);document.addEventListener('visibilitychange',hide);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide);};
 },[playing]);
 return <><div className="coach-pane-title"><strong>운동 시범 · {POSE_EXERCISES[motion].label}</strong><button type="button" className="btn btn-ghost" disabled={paused} onClick={()=>setPlaying(p=>!p)}>{playing?'시범 정지':'시범 재생'}</button></div><div className="coach-demo"><Suspense fallback={<p>시범 준비 중…</p>}><ExerciseMotion3D motion={motion} progress={progress} mirror={false} compact/></Suspense></div></>;
}
export default function CameraCoaching({motion='squat',paused=false}){
 const video=useRef(null),stream=useRef(null),cameraVersion=useRef(0),analysisVersion=useRef(0),resources=useRef({}),voiceRef=useRef(false),speechAt=useRef(-Infinity);
 const [running,setRunning]=useState(false),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(false),[preparing,setPreparing]=useState(false),[voice,setVoice]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[points,setPoints]=useState([]),[size,setSize]=useState([640,480]),[layout,setLayout]=useState('split');
 function stopAnalysis(){
  analysisVersion.current++;const r=resources.current;resources.current={};
  cancelAnimationFrame(r.frame);video.current?.cancelVideoFrameCallback?.(r.videoFrame);clearInterval(r.timer);r.detector?.close();
  window.speechSynthesis?.cancel();voiceRef.current=false;setVoice(false);setFeedback(false);setPreparing(false);setResult(null);setPoints([]);
 }
 function stopCamera(){
  cameraVersion.current++;stopAnalysis();stream.current?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream.current=null;
  if(video.current)video.current.srcObject=null;setRunning(false);setBusy(false);
 }
 useEffect(()=>{const hide=()=>{if(document.hidden)stopCamera();};document.addEventListener('visibilitychange',hide);return()=>{stopCamera();document.removeEventListener('visibilitychange',hide);};},[]);
 useEffect(()=>{if(paused)stopCamera();},[paused]);
 async function startCamera(){
  stopCamera();setError('');setBusy(true);const version=cameraVersion.current;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('HTTPS 카메라 지원 환경에서 이용하세요.');
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});
   if(version!==cameraVersion.current){media.getTracks().forEach(t=>t.stop());return;}
   stream.current=media;media.getVideoTracks().forEach(t=>{t.onended=()=>{if(version===cameraVersion.current){stopCamera();setError('카메라 연결이 종료되었습니다. 다시 시작해 주세요.');}};});
   video.current.srcObject=media;await video.current.play();
   if(version!==cameraVersion.current)return;
   setSize([video.current.videoWidth||640,video.current.videoHeight||480]);setRunning(true);
  }catch(e){if(version===cameraVersion.current){stopCamera();setError(e.name==='NotAllowedError'?'카메라 권한이 허용되지 않았습니다. 브라우저 설정에서 허용한 뒤 다시 시작해 주세요.':e.message);}}
  finally{if(version===cameraVersion.current)setBusy(false);}
 }
 async function startAnalysis(){
  stopAnalysis();setError('');setFeedback(true);setPreparing(true);const version=analysisVersion.current;
  const active=()=>version===analysisVersion.current&&!!stream.current;
  try{
   await api('/api/advanced/pose');if(!active())return;
   const model=import.meta.env.VITE_POSE_MODEL_URL||'/pose/pose_landmarker_lite.task';
   const asset=await fetch(model,{method:'HEAD'});if(!active())return;
   if(!asset.ok||!(asset.headers.get('content-type')||'').includes('octet-stream'))throw Error('분석 모델을 준비하지 못했습니다. 카메라만 보기는 계속 사용할 수 있습니다.');
   const detector=await createPoseRunner(model);if(!active()){detector.close();return;}
   const r={detector};resources.current=r;
   r.timer=setInterval(()=>api('/api/advanced/pose').catch(()=>{if(active()){stopAnalysis();setError('분석 권한을 확인할 수 없어 피드백을 껐습니다. 카메라는 계속 볼 수 있습니다.');}}),60000);
   const coach=createExercisePoseAnalyzer(motion);let last=-Infinity;
   const schedule=()=>{if(!active())return;if(video.current.requestVideoFrameCallback)r.videoFrame=video.current.requestVideoFrameCallback(loop);else r.frame=requestAnimationFrame(loop);};
   const loop=async time=>{
    if(!active())return;
    try{
     if(time-last>=150&&video.current.readyState>=2){
      const out=await detector.detectForVideo(video.current,time);if(!active())return;
      const raw=out.landmarks?.[0]||[],w=video.current.videoWidth||640,h=video.current.videoHeight||480;
      const visible=POSE_EXERCISES[motion].joints.every(i=>raw[i]&&raw[i].x>=0&&raw[i].x<=1&&raw[i].y>=0&&raw[i].y<=1);
      const next=coach.update(visible?raw.map(p=>({...p,y:p.y*h/w})):[],time);
      const message=next.corrections?.[0]||next.warnings?.[0]||next.feedback;
      setResult({...next,message});setPoints(next.detected?raw:[]);setSize([w,h]);last=time;
      if(voiceRef.current&&time-speechAt.current>10000&&window.speechSynthesis&&typeof SpeechSynthesisUtterance!=='undefined'){
       window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.lang='ko-KR';window.speechSynthesis.speak(utterance);speechAt.current=time;
      }
     }
     schedule();
    }catch{if(active()){stopAnalysis();setError('피드백이 중단되었습니다. 카메라를 보면서 다시 켤 수 있습니다.');}}
   };
   setPreparing(false);schedule();
  }catch(e){if(active()){stopAnalysis();setError(e.message);}}
 }
 const valid=p=>p&&(p.visibility??0)>=.7&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
 return <section className="camera-coaching" aria-label="선택형 카메라 코칭">
  <div className="coach-toolbar"><label>화면 배치<select value={layout} onChange={e=>{setLayout(e.target.value);if(e.target.value==='demo')stopCamera();}}><option value="split">반반 보기</option><option value="camera">카메라 크게</option><option value="demo">시범만 보기</option></select></label><span>권장 촬영: {CAMERA_DIRECTIONS[motion]}</span></div>
  <div className={`coach-stage coach-stage-${layout}`}>
   <div className="coach-pane coach-example"><Demo motion={motion} paused={paused}/></div>
   <div className="coach-pane coach-camera" hidden={layout==='demo'}><div className="coach-pane-title"><strong>내 모습</strong><span>{running?'카메라 켜짐':'카메라 꺼짐'}</span></div><div className="coach-feed"><video ref={video} muted playsInline aria-label="내 운동 모습"/><svg aria-hidden="true" viewBox={`0 0 ${size[0]} ${size[1]}`} preserveAspectRatio="xMidYMid meet">{feedback&&CONNECTIONS.map(([a,b])=>valid(points[a])&&valid(points[b])?<line key={`${a}-${b}`} x1={points[a].x*size[0]} y1={points[a].y*size[1]} x2={points[b].x*size[0]} y2={points[b].y*size[1]} stroke="#5df5cb" strokeWidth="4"/>:null)}</svg>{!running&&<p className="coach-camera-empty">카메라를 켜면 여기에 내 모습이 보여요.</p>}</div></div>
  </div>
  <div className="motion-controls"><button type="button" className="btn btn-primary" disabled={busy||running||paused||layout==='demo'} onClick={startCamera}>{busy?'카메라 준비 중…':'카메라 켜기'}</button><button type="button" className="btn btn-ghost" disabled={!busy&&!running} onClick={stopCamera}>카메라 끄기</button></div>
  <div className="coach-preferences"><label><input type="checkbox" role="switch" checked={feedback} disabled={!running||paused} onChange={e=>e.target.checked?startAnalysis():stopAnalysis()}/> 자세 피드백 받기</label><label><input type="checkbox" checked={voice} disabled={!feedback||preparing||!window.speechSynthesis} onChange={e=>{voiceRef.current=e.target.checked;setVoice(e.target.checked);speechAt.current=-Infinity;if(!e.target.checked)window.speechSynthesis?.cancel();}}/> 음성으로도 듣기</label></div>
  <p className="muted">피드백은 기본 꺼짐입니다. 켜면 기기 내 자세 분석과 관절선을 표시합니다. 끄면 분석·음성 안내를 멈추고 카메라만 보여줍니다.</p>
  {feedback&&<div className="coach-feedback" role="status" aria-live="polite"><strong>{preparing?'피드백 준비 중…':result?.message||'전신이 화면에 들어오도록 서 주세요.'}</strong>{result&&<p>{result.detected?(result.seconds!=null?`${result.seconds}초 유지`:`${result.reps}회 관찰`):'추적 불확실 · 자세 판정 보류'}</p>}</div>}
  {error&&<p role="alert">{error}</p>}
  <details><summary>촬영 준비와 개인정보</summary><p>전신이 보이도록 휴대폰을 고정하고 약 2–3m 떨어져 화각에 맞게 조정하세요. 녹화·영상 저장·서버 전송을 하지 않습니다. 피드백 설정은 저장하지 않으며 다시 열면 꺼져 있습니다.</p><p>시범과 내 동작은 자동 동기화되지 않습니다. 안내는 관절 추적에 따른 참고이며 자세의 안전성이나 의료적 상태를 판정하지 않습니다. 추정 횟수는 운동 기록에 자동 저장하지 않습니다.</p></details>
 </section>;
}
