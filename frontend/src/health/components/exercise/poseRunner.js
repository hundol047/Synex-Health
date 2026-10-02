export async function createPoseRunner(model,{signal}={}){
 if(signal?.aborted)throw new DOMException("Aborted","AbortError");
 if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'){
  const worker=new Worker(new URL('./pose.worker.js',import.meta.url),{type:'classic'});let pending,closed=false;
  const request=data=>new Promise((resolve,reject)=>{pending={resolve,reject};worker.postMessage(data,data.bitmap?[data.bitmap]:[]);});
  worker.onmessage=({data})=>{if(data.type==='error')pending?.reject(Error('기기 내 자세 추정을 시작하지 못했습니다.'));else pending?.resolve(data);pending=null;};
  worker.onerror=()=>{pending?.reject(Error('자세 분석 작업이 중단되었습니다.'));pending=null;};
  const timer=setTimeout(()=>{pending?.reject(Error('모델 준비 시간이 초과되었습니다.'));worker.terminate();},30000);
  const abort=()=>{pending?.reject(new DOMException('Aborted','AbortError'));pending=null;worker.terminate();};
  signal?.addEventListener('abort',abort,{once:true});
  try{await request({type:'init',model:new URL(model,location.href).href,wasm:new URL('/pose/wasm',location.href).href});}catch(e){worker.terminate();if(signal?.aborted)throw e;return createMainRunner(model,signal);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  return {execution:'worker',async detectForVideo(video,time){if(closed)throw Error('closed');const bitmap=await createImageBitmap(video);if(closed){bitmap.close();throw Error('closed');}const r=await request({type:'frame',bitmap,time});return {landmarks:[r.landmarks],inferenceMs:r.ms};},close(){closed=true;pending?.reject(Error('closed'));pending=null;worker.postMessage({type:'close'});worker.terminate();}};
 }
 return createMainRunner(model,signal);
}
async function createMainRunner(model,signal){
 const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision');
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const files=await FilesetResolver.forVisionTasks('/pose/wasm');if(signal?.aborted)throw new DOMException('Aborted','AbortError');const detector=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:model},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.7,minTrackingConfidence:.7});if(signal?.aborted){detector.close();throw new DOMException('Aborted','AbortError');}detector.execution='main';return detector;
}
