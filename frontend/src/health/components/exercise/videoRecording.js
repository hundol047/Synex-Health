import {Capacitor,registerPlugin} from '@capacitor/core';

export const MAX_RECORDING_SECONDS=60;
export const MAX_RECORDING_BYTES=20*1024*1024;
const VideoRecording=registerPlugin('VideoRecording');
const MIME_TYPES=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];

export function recordingMimeType(Recorder=globalThis.MediaRecorder){
 if(typeof Recorder!=='function')throw Error('이 기기에서는 동영상 촬영을 지원하지 않습니다. Android 시스템 WebView를 업데이트한 뒤 다시 열어 주세요.');
 if(typeof Recorder.isTypeSupported!=='function')return '';
 const mime=MIME_TYPES.find(type=>Recorder.isTypeSupported(type));
 if(!mime)throw Error('이 카메라의 동영상 형식을 지원하지 않습니다. Android 시스템 WebView를 업데이트한 뒤 다시 열어 주세요.');
 return mime;
}

// Video frames stay in memory until the user explicitly saves or shares them.
// A discarded session cannot publish a late dataavailable/stop event.
export function createVideoRecording(stream,{onPhase=()=>{},onSeconds=()=>{},onComplete=()=>{},onError=()=>{},Recorder=globalThis.MediaRecorder}={}){
 const mime=recordingMimeType(Recorder);
 const recorder=new Recorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:1800000});
 let chunks=[],bytes=0,timer,deadline,stopTimer,discarded=false,finished=false,started=performance.now();
 const clear=()=>{clearInterval(timer);clearTimeout(deadline);clearTimeout(stopTimer);};
 function fail(message){
  if(discarded||finished)return;
  finished=true;clear();chunks=[];
  try{if(recorder.state!=='inactive')recorder.stop();}catch{}
  onPhase('idle');onError(message);
 }
 function stop({discard=false}={}){
  if(discard){discarded=true;chunks=[];clear();}
  if(finished)return;
  clearInterval(timer);clearTimeout(deadline);
  if(!discard)onPhase('finishing');
  try{if(recorder.state!=='inactive')recorder.stop();else if(!discard)fail('촬영이 종료되었습니다. 다시 촬영해 주세요.');}
  catch{if(!discard)fail('촬영을 마무리하지 못했습니다. 다시 촬영해 주세요.');}
  if(!discard&&!finished)stopTimer=setTimeout(()=>fail('동영상을 마무리하는 시간이 초과되었습니다. 다시 촬영해 주세요.'),5000);
 }
 recorder.ondataavailable=event=>{
  if(discarded||finished||!event.data?.size)return;
  chunks.push(event.data);bytes+=event.data.size;
  if(bytes>=MAX_RECORDING_BYTES&&recorder.state==='recording')stop();
 };
 recorder.onerror=()=>fail('동영상 촬영이 중단되었습니다. 다시 촬영해 주세요.');
 recorder.onstop=()=>{
  clear();if(discarded||finished)return;finished=true;
  const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||mime});chunks=[];
  onPhase('idle');
  if(!blob.size){onError('촬영된 영상이 없습니다. 카메라가 보이는지 확인하고 다시 촬영해 주세요.');return;}
  onComplete({blob,seconds:Math.max(.1,(performance.now()-started)/1000)});
 };
 try{recorder.start(250);started=performance.now();onPhase('recording');onSeconds(0);}
 catch{discarded=true;clear();throw Error('동영상 촬영을 시작하지 못했습니다. 카메라를 다시 켠 뒤 촬영해 주세요.');}
 timer=setInterval(()=>onSeconds(Math.min(MAX_RECORDING_SECONDS,Math.floor((performance.now()-started)/1000))),250);
 deadline=setTimeout(()=>stop(),MAX_RECORDING_SECONDS*1000);
 return {stop,cancel:()=>stop({discard:true}),recorder};
}

export function recordingFilename(motion,mime,now=new Date()){
 const timestamp=now.toISOString().replace(/[:.]/g,'-');
 const safeMotion=String(motion).replace(/[^a-z0-9_-]/gi,'');
 return `Synex-${safeMotion||'exercise'}-${timestamp}.${mime.startsWith('video/mp4')?'mp4':'webm'}`;
}
function blobBase64(blob){
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('촬영 파일을 열지 못했습니다. 다시 시도해 주세요.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});
}
export async function saveRecordedVideo(blob,motion,{share=false,signal}={}){
 if(!(blob instanceof Blob)||!blob.size)throw Error('저장할 촬영 영상이 없습니다. 먼저 동영상을 촬영해 주세요.');
 const name=recordingFilename(motion,blob.type);
 const mimeType=blob.type.startsWith('video/mp4')?'video/mp4':'video/webm';
 if(Capacitor.isNativePlatform()){
  if(Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('VideoRecording'))throw Error('이 앱에서 동영상 저장을 열 수 없습니다. 최신 수정판으로 업데이트해 주세요.');
  const check=()=>{if(signal?.aborted)throw new DOMException('동영상 저장 취소','AbortError');};
  let id;
  try{
   check();({id}=await VideoRecording.begin({name,mimeType,share}));
   // Keep each bridge message small; the whole video is never base64 encoded.
   for(let offset=0;offset<blob.size;offset+=256*1024){
    check();const data=await blobBase64(blob.slice(offset,offset+256*1024));check();
    await VideoRecording.append({id,data});
   }
   check();const result=await VideoRecording.finish({id});id=null;
   return result.saved?{message:`저장 완료 · ${result.path}`}:{message:'공유 창에서 저장할 앱이나 파일 앱을 선택해 주세요.'};
  }catch(e){if(id)await VideoRecording.cancel({id}).catch(()=>{});throw e;}
 }
 const file=new File([blob],name,{type:mimeType});
 if(share&&navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'Synex Health 운동 촬영'});return {message:'동영상 공유 창을 열었습니다.'};}
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.style.display='none';document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
 return {message:'동영상 다운로드를 시작했습니다. 다운로드 폴더를 확인해 주세요.'};
}
