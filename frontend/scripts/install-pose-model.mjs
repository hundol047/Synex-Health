import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const url='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const expected='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a';
const destination=new URL('../public/pose/pose_landmarker_lite.task',import.meta.url);
let installed;
try{installed=await readFile(destination);}catch(e){if(e.code!=='ENOENT')throw e;}
if(installed){
 if(createHash('sha256').update(installed).digest('hex')!==expected)throw Error('Installed pose model checksum is invalid. Remove the corrupt file and rerun pose:setup.');
 console.log('Verified installed MediaPipe Pose Lite model.');
}else{
const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error('Official model download failed: '+response.status);
const bytes=new Uint8Array(await response.arrayBuffer());
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Model checksum changed. Review the new official model and license before updating.');
await mkdir(new URL('../public/pose/',import.meta.url),{recursive:true});
await writeFile(destination,bytes);
console.log('Installed verified MediaPipe Pose Lite model.');
}
