import {FilesetResolver,PoseLandmarker} from '@mediapipe/tasks-vision';
import {installPoseNetworkBoundary} from './poseNetworkBoundary.js';
installPoseNetworkBoundary(self);
let detector;
self.onmessage=async({data})=>{try{
 if(data.type==='init'){const files=await FilesetResolver.forVisionTasks(data.wasm);detector=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:data.model,delegate:'CPU'},runningMode:'VIDEO',numPoses:2,minPoseDetectionConfidence:.7,minTrackingConfidence:.7});self.postMessage({type:'ready'});}
 if(data.type==='frame'){const start=performance.now();try{const out=detector.detectForVideo(data.bitmap,data.time);self.postMessage({type:'result',landmarks:out.landmarks,time:data.time,ms:performance.now()-start});}finally{data.bitmap.close();}}
 if(data.type==='close'){detector?.close();self.close();}
}catch{data.bitmap?.close();self.postMessage({type:'error'});}};
