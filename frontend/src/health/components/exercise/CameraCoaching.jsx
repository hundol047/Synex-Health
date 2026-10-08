import React,{useEffect,useRef,useState} from 'react';
import {recordPoseDiagnostics} from '../../lib/poseDiagnostics.js';
import {TRACKING_LABELS} from './poseThresholds.js';
import {PoseCalibration} from './poseRules.js';
import {claimCamera} from './cameraLease.js';
import {api} from '../../../shared/lib/api.js';
import {LOCAL_ONLY} from '../../../shared/lib/localMode.js';
import {createPoseRunner} from './poseRunner.js';
import {createExercisePoseAnalyzer,POSE_EXERCISES,CAMERA_DIRECTIONS} from './poseCoach.js';
import BodyweightDemo from './BodyweightDemo.jsx';
import {getBodyweightGuide} from './bodyweightGuide.js';

const CONNECTIONS=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[28,30],[30,32]];
const validPoint=p=>p&&(p.visibility??0)>=.7&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
export function stableCoachingFeedback(next){
 if(!Array.isArray(next.issues))return next;
 const issues=next.detected===false?[]:next.issues.filter(issue=>issue.severity==='camera'||!Number.isFinite(issue.observedMs)||issue.observedMs>=300);
 const corrections=[...new Set(issues.map(issue=>issue.message))];
 const rawMessages=new Set(next.issues.map(issue=>issue.message));
 const warnings=(next.warnings||[]).filter(message=>!rawMessages.has(message)||corrections.includes(message));
 const pending=next.detected!==false&&next.issues.length>issues.length;
 return {...next,issues,corrections,warnings,feedback:pending&&!issues.length?'동작을 확인하고 있어요. 천천히 움직여 주세요.':next.feedback};
}
function cameraError(e){
 if(e.name==='NotAllowedError'||e.name==='PermissionDeniedError')return '카메라 권한이 허용되지 않았습니다. 휴대폰 설정에서 이 앱의 카메라를 허용한 뒤 다시 시작해 주세요.';
 if(e.name==='NotFoundError')return '사용할 수 있는 카메라를 찾지 못했습니다. 다른 카메라로 다시 시작해 주세요.';
 if(e.name==='NotReadableError')return '다른 앱이 카메라를 사용하고 있습니다. 카메라를 사용하는 앱을 닫고 다시 시작해 주세요.';
 return e.message||'카메라를 시작하지 못했습니다. 다시 시도해 주세요.';
}
export default function CameraCoaching({motion='squat',paused=false,onEvaluation,immersive=false}){
 const video=useRef(null),stream=useRef(null),cameraVersion=useRef(0),analysisVersion=useRef(0),resources=useRef({}),voiceRef=useRef(false),speechAt=useRef(-Infinity),releaseCamera=useRef(null);
 const [running,setRunning]=useState(false),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(false),[preparing,setPreparing]=useState(false),[voice,setVoice]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[points,setPoints]=useState([]),[size,setSize]=useState([640,480]),[layout,setLayout]=useState('split'),[facing,setFacing]=useState('user');
 const guide=getBodyweightGuide(motion),label=guide?.label||POSE_EXERCISES[motion]?.label||'운동';
 function stopAnalysis(){
  analysisVersion.current++;const r=resources.current;resources.current={};
  cancelAnimationFrame(r.frame);video.current?.cancelVideoFrameCallback?.(r.videoFrame);clearInterval(r.timer);clearTimeout(r.prepareTimer);clearTimeout(r.staleTimer);r.abort?.abort();r.detector?.close();
  window.speechSynthesis?.cancel();voiceRef.current=false;setVoice(false);setFeedback(false);setPreparing(false);setResult(null);setPoints([]);
 }
 function stopCamera(){
  cameraVersion.current++;releaseCamera.current?.();releaseCamera.current=null;stopAnalysis();stream.current?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream.current=null;
  if(video.current)video.current.srcObject=null;setRunning(false);setBusy(false);
 }
 useEffect(()=>{const hide=()=>{if(document.hidden)stopCamera();};document.addEventListener('visibilitychange',hide);return()=>{stopCamera();document.removeEventListener('visibilitychange',hide);};},[]);
 useEffect(()=>{if(paused)stopCamera();},[paused]);
 async function startCamera({analyze=false,nextFacing=facing}={}){
  stopCamera();releaseCamera.current=claimCamera(stopCamera);setError('');setBusy(true);setFacing(nextFacing);const version=cameraVersion.current;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('이 기기에서 카메라를 열 수 없습니다. 카메라 권한과 앱 지원 여부를 확인해 주세요.');
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:nextFacing},width:{ideal:960},height:{ideal:720}},audio:false});
   if(version!==cameraVersion.current){media.getTracks().forEach(t=>t.stop());return;}
   stream.current=media;media.getVideoTracks().forEach(t=>{t.onended=()=>{if(version===cameraVersion.current){stopCamera();setError('카메라 연결이 종료되었습니다. 다시 시작해 주세요.');}};});
   video.current.srcObject=media;await video.current.play();
   if(version!==cameraVersion.current)return;
   setSize([video.current.videoWidth||640,video.current.videoHeight||480]);setRunning(true);
   if(analyze)await startAnalysis();
  }catch(e){if(version===cameraVersion.current){stopCamera();setError(cameraError(e));}}
  finally{if(version===cameraVersion.current)setBusy(false);}
 }
 async function startAnalysis(){
  stopAnalysis();setError('');setFeedback(true);setPreparing(true);const version=analysisVersion.current;
  const active=()=>version===analysisVersion.current&&!!stream.current;
  const r={abort:new AbortController()};resources.current=r;
  r.prepareTimer=setTimeout(()=>{if(active()){stopAnalysis();setError('피드백 준비 시간이 초과되었습니다. 카메라는 그대로 볼 수 있습니다. 다시 켜 주세요.');}},20000);
  try{
   // The personal app uses its bundled model and never needs login or a server.
   if(!LOCAL_ONLY){await api('/api/advanced/pose',undefined,{signal:r.abort.signal});if(!active())return;}
   const model=LOCAL_ONLY?'/pose/pose_landmarker_lite.task':import.meta.env.VITE_POSE_MODEL_URL||'/pose/pose_landmarker_lite.task';
   const asset=await fetch(model,{method:'HEAD',signal:r.abort.signal});if(!active())return;
   const type=asset.headers.get('content-type')||'';
   if(!asset.ok||type.includes('text/html')||type.includes('application/json'))throw Error('기기 내 분석 모델을 열지 못했습니다. 카메라는 그대로 볼 수 있습니다. 앱을 다시 열고 피드백을 켜 주세요.');
   const detector=await createPoseRunner(model,{signal:r.abort.signal});if(!active()){detector.close();return;}
   r.detector=detector;clearTimeout(r.prepareTimer);
   if(!LOCAL_ONLY)r.timer=setInterval(()=>api('/api/advanced/pose').catch(()=>{if(active()){stopAnalysis();setError('분석 권한을 확인할 수 없어 피드백을 껐습니다. 카메라는 계속 볼 수 있습니다.');}}),60000);
   const coach=createExercisePoseAnalyzer(motion),calibration=new PoseCalibration();let last=-Infinity;
   const watch=()=>{clearTimeout(r.staleTimer);r.staleTimer=setTimeout(()=>{if(active()){stopAnalysis();setError('새 분석 결과가 없어 피드백을 중지했습니다. 카메라 상태를 확인하고 다시 켜 주세요.');}},5000);};
   watch();
   const schedule=()=>{if(!active())return;if(video.current.requestVideoFrameCallback)r.videoFrame=video.current.requestVideoFrameCallback(loop);else r.frame=requestAnimationFrame(loop);};
   const loop=async time=>{
    if(!active())return;
    try{
     if(time-last>=150&&video.current.readyState>=2){
      const began=performance.now();const out=await detector.detectForVideo(video.current,time);recordPoseDiagnostics({inferenceMs:out.inferenceMs??performance.now()-began,poseFPS:Number.isFinite(last)?1000/(time-last):null,cameraFPS:video.current.srcObject?.getVideoTracks()[0]?.getSettings?.()?.frameRate??null});if(!active())return;
      const raw=out.landmarks?.[0]||[],w=video.current.videoWidth||640,h=video.current.videoHeight||480;
      const visible=POSE_EXERCISES[motion].joints.every(i=>raw[i]&&raw[i].x>=0&&raw[i].x<=1&&raw[i].y>=0&&raw[i].y<=1);
      const calibrated=calibration.update(out.landmarks,time);
      const next=stableCoachingFeedback(calibrated.ready?coach.update(visible?raw:[],time,h/w):{...coach.update([],time,h/w),feedback:calibrated.message,calibration:calibrated.progress});
      const message=next.issues?.[0]?.message||next.corrections?.[0]||next.warnings?.[0]||next.feedback;
      watch();onEvaluation?.({...next,message});setResult({...next,message});setPoints(next.detected?raw:[]);setSize([w,h]);last=time;
      if(r.hadDetection&&!next.detected)window.speechSynthesis?.cancel();r.hadDetection=next.detected;
      if(message&&voiceRef.current&&time-speechAt.current>10000&&window.speechSynthesis&&typeof SpeechSynthesisUtterance!=='undefined'){
       window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.lang='ko-KR';window.speechSynthesis.speak(utterance);speechAt.current=time;
      }
     }
     schedule();
    }catch{if(active()){stopAnalysis();setError('피드백이 중단되었습니다. 카메라는 계속 볼 수 있습니다. 피드백을 다시 켜 주세요.');}}
   };
   setPreparing(false);schedule();
  }catch(e){if(active()){stopAnalysis();setError(e.message||'자세 분석을 시작하지 못했습니다. 다시 켜 주세요.');}}
 }
 const issues=result?.detected?(result.issues||[]).filter(issue=>issue.severity!=='camera'):[];
 const highlighted=new Set(issues.flatMap(issue=>issue.joints||[]));
 const mirror=facing==='user';
 return <section className={`camera-coaching${immersive?' camera-coaching-immersive':''}`} aria-label="선택형 카메라 코칭">
  {!immersive&&<div className="coach-toolbar"><label>화면 배치<select value={layout} onChange={e=>{setLayout(e.target.value);if(e.target.value==='demo')stopCamera();}}><option value="split">반반 보기</option><option value="camera">카메라 크게</option><option value="demo">시범만 보기</option></select></label><span>권장 촬영: {guide?.cameraView||CAMERA_DIRECTIONS[motion]}</span></div>}
  <div className={`coach-stage coach-stage-${layout}`}>
   <div className="coach-pane coach-example" aria-label={`위 화면 · ${label} 운동 시범`}><div className="coach-pane-title"><strong>01 · 운동 방법</strong><span>{label}</span></div><div className="coach-demo"><BodyweightDemo exerciseId={motion} compact paused={paused}/></div></div>
   <div className="coach-pane coach-camera" hidden={layout==='demo'} aria-label="아래 화면 · 내 운동 자세"><div className="coach-pane-title"><strong>02 · 내 자세</strong><span>{running?(feedback?'스켈레톤 분석 중':'카메라 켜짐'):'카메라 꺼짐'} · {guide?.cameraView||CAMERA_DIRECTIONS[motion]} 촬영</span></div><div className={`coach-feed${mirror?' coach-feed-mirrored':''}`}><video ref={video} muted playsInline aria-label="내 운동 모습"/><svg aria-hidden="true" viewBox={`0 0 ${size[0]} ${size[1]}`} preserveAspectRatio="xMidYMid meet">{feedback&&CONNECTIONS.map(([a,b])=>validPoint(points[a])&&validPoint(points[b])?<line key={`${a}-${b}`} x1={points[a].x*size[0]} y1={points[a].y*size[1]} x2={points[b].x*size[0]} y2={points[b].y*size[1]} stroke={highlighted.has(a)&&highlighted.has(b)?'#ff7c72':'#5df5cb'} strokeWidth={highlighted.has(a)&&highlighted.has(b)?6:4} strokeLinecap="round" data-highlighted={highlighted.has(a)&&highlighted.has(b)||undefined}/>:null)}{feedback&&points.map((point,index)=>validPoint(point)&&index>=11?<circle key={index} cx={point.x*size[0]} cy={point.y*size[1]} r={highlighted.has(index)?7:4} fill={highlighted.has(index)?'#ff7c72':'#5df5cb'} stroke="#142031" strokeWidth="2" data-joint={index} data-highlighted={highlighted.has(index)||undefined}/>:null)}</svg>{!running&&<div className="coach-camera-empty"><strong>시범을 보고, 내 자세를 확인하세요</strong><p>휴대폰을 고정하고 전신이 보이도록 2–3m 떨어져 주세요.</p><span>코칭 시작을 누르면 카메라와 자세 분석을 함께 켭니다.</span></div>}
    {feedback&&<div className={`coach-feedback${issues.length?' coach-feedback-adjust':''}`} role="status" aria-live="polite"><div className="coach-feedback-heading"><strong>{preparing?'피드백 준비 중…':result?.message||'전신이 화면에 들어오도록 위치를 잡아 주세요.'}</strong>{result?.detected&&<span className="coach-counter">{result.seconds!=null?`${result.seconds}초`:`${result.reps}회`}</span>}</div>{result&&<p>{result.detected?(issues[0]?.bodyPart?`${issues[0].bodyPart} · 빨간 관절 부위를 확인하세요`:'관절을 추적하며 동작을 확인하고 있어요'):'추적 불확실 · 자세 판정 보류'}</p>}</div>}
   </div></div>
  </div>
  <div className="coach-control-panel"><div className="motion-controls coach-actions"><button type="button" className="btn btn-primary" disabled={busy||paused||layout==='demo'||feedback} onClick={()=>running?startAnalysis():startCamera({analyze:true})}>{busy||preparing?'코칭 준비 중…':'코칭 시작'}</button><button type="button" className="btn btn-secondary" disabled={busy||running||paused||layout==='demo'} onClick={()=>startCamera()}>{busy?'카메라 준비 중…':'카메라 켜기'}</button><button type="button" className="btn btn-ghost" disabled={!busy&&!running} onClick={stopCamera}>카메라 끄기</button><button type="button" className="btn btn-ghost coach-camera-switch" aria-label="전면·후면 카메라 전환" disabled={busy||paused||layout==='demo'} onClick={()=>{const nextFacing=facing==='user'?'environment':'user';if(running)startCamera({analyze:feedback,nextFacing});else setFacing(nextFacing);}}>카메라 전환</button></div>
   <div className="coach-preferences"><label><input type="checkbox" role="switch" checked={feedback} disabled={!running||paused} onChange={e=>e.target.checked?startAnalysis():stopAnalysis()}/> 자세 피드백 받기</label><label><input type="checkbox" checked={voice} disabled={!feedback||preparing||!window.speechSynthesis} onChange={e=>{voiceRef.current=e.target.checked;setVoice(e.target.checked);speechAt.current=-Infinity;if(!e.target.checked)window.speechSynthesis?.cancel();}}/> 음성으로도 듣기</label></div>
   {error&&<p className="coach-error" role="alert">{error}</p>}
   <details className="coach-help"><summary>촬영 준비 · 기기 내 분석</summary><p>권장 방향: {guide?.cameraView||CAMERA_DIRECTIONS[motion]}. 한 사람의 전신과 바닥 지지점이 보이도록 촬영하세요. 자세 분석은 기기에서 처리하며 영상을 녹화·저장·전송하지 않습니다.</p><p>카메라만 켜면 분석하지 않습니다. 피드백을 끄면 관절 분석과 음성 안내가 멈춥니다. 시범과 내 동작은 자동 동기화되지 않습니다. 통증이 있으면 멈추고, 잘 보이지 않는 관절은 판정을 보류합니다.</p>{result?.detected&&<p>{TRACKING_LABELS[result.tracking_quality]} · 관찰 가동 범위 {result.range_of_motion??'—'}° · {result.rep_seconds!=null?`${result.rep_seconds}초/회`:'반복 속도 측정 중'}</p>}</details>
  </div>
 </section>;
}
