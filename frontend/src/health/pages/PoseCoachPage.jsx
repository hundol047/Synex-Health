import React,{useRef,useEffect,useState} from 'react';
import {api} from '../../shared/lib/api.js';
import {Card} from '../../shared/components/ui.jsx';
import {SquatCoach} from '../components/exercise/poseCoach.js';
export default function PoseCoachPage(){
 const video=useRef(),resources=useRef({}),generation=useRef(0),[running,setRunning]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[consent,setConsent]=useState(false);
 function stop(){generation.current++;cancelAnimationFrame(resources.current.frame);clearInterval(resources.current.entitlementTimer);resources.current.stream?.getTracks().forEach(t=>t.stop());resources.current.detector?.close();resources.current={};if(video.current)video.current.srcObject=null;setRunning(false);setBusy(false);}
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{stop();document.removeEventListener('visibilitychange',hide);};},[]);
 async function start(){stop();const id=generation.current;setBusy(true);setError('');try{
  await api('/api/advanced/pose');
  if(!navigator.mediaDevices?.getUserMedia)throw Error('HTTPS 카메라 지원 환경에서 이용하세요.');
  const model=import.meta.env.VITE_POSE_MODEL_URL||'/pose/pose_landmarker_lite.task';
  const asset=await fetch(model,{method:'HEAD'});if(!asset.ok||!(asset.headers.get('content-type')||'').includes('octet-stream'))throw Error('자세 추정 모델이 설치되지 않았습니다. 운영자에게 모델 설치를 요청하세요.');
  if(!model)throw Error('자세 추정 모델이 아직 설치되지 않았습니다. 카메라는 켜지지 않습니다.');
  const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision');
  const vision=await FilesetResolver.forVisionTasks('/pose/wasm');
  const detector=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:model},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.65,minTrackingConfidence:.65});
  if(id!==generation.current){detector.close();return;}resources.current.detector=detector;
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});
  if(id!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
  resources.current.entitlementTimer=setInterval(()=>api('/api/advanced/pose').catch(()=>{stop();setError('구독 권한을 확인할 수 없어 자세 분석을 중지했습니다.');}),60000);
  resources.current.stream=stream;video.current.srcObject=stream;await video.current.play();
  const coach=new SquatCoach();let last=0;setRunning(true);
  const loop=time=>{if(id!==generation.current)return;try{if(time-last>100&&video.current.readyState>=2){const out=detector.detectForVideo(video.current,time);setResult(coach.update(out.landmarks[0]?.map(p=>({...p,y:p.y*video.current.videoHeight/video.current.videoWidth})),time));last=time;}resources.current.frame=requestAnimationFrame(loop);}catch{stop();setError('자세 추정이 중단되었습니다. 다시 시작해 주세요.');}};
  resources.current.frame=requestAnimationFrame(loop);
 }catch(e){if(id===generation.current){stop();setError(e.message);}}finally{if(id===generation.current)setBusy(false);}}
 return <Card title="Pose Coach · 스쿼트"><p>영상은 기기에서 처리하며 서버에 저장하거나 업로드하지 않습니다. 현재 스쿼트 횟수와 설명용 자세 피드백을 지원합니다. 카메라 각도에 따라 오차가 크며 의료 판단에 사용할 수 없습니다.</p><label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);if(!e.target.checked)stop();}}/> 카메라의 기기 내 자세 분석에 동의합니다.</label><video ref={video} muted playsInline style={{width:'100%',maxHeight:440,background:'#142031',borderRadius:16}}/><div className="motion-controls"><button className="btn btn-primary" disabled={!consent||busy||running} onClick={start}>{busy?'준비 중…':'카메라 시작'}</button><button className="btn btn-ghost" onClick={stop}>중지 · 카메라 끄기</button></div>{error&&<p role="alert">{error}</p>}{result&&<div role="status"><h3>{result.reps}회</h3><p>{result.feedback}</p><p>추정 무릎 {result.knee??'—'}° · 고관절 {result.hip??'—'}° · 상체 기울기 {result.lean??'—'}°</p></div>}</Card>;
}
