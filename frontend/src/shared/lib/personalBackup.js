import {Capacitor,registerPlugin} from '@capacitor/core';
const NativeFiles=registerPlugin('VideoRecording');
const MAX_BYTES=10*1024*1024;
const iterations=600000;
const encode=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
async function key(password,salt){
 if(typeof password!=='string'||password.length<12||password.length>256)throw Error('백업 암호는 12~256자로 입력하세요.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptBackup(data,password){
 const plain=new TextEncoder().encode(JSON.stringify(data));if(plain.length>MAX_BYTES)throw Error('백업이 10MB를 초과합니다.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(password,salt),plain);
 return JSON.stringify({format:'synex-encrypted-backup',version:1,iterations,salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(encrypted))});
}
export async function decryptBackup(text,password){
 if(typeof text!=='string'||text.length>MAX_BYTES*1.5)throw Error('백업 파일 크기를 확인하세요.');
 try{
 const b=JSON.parse(text);if(b.format!=='synex-encrypted-backup'||b.version!==1||b.iterations!==iterations)throw Error();
 const salt=decode(b.salt),iv=decode(b.iv);if(salt.length!==16||iv.length!==12)throw Error();
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(password,salt),decode(b.data));
 return JSON.parse(new TextDecoder().decode(plain),(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw Error();return v;});
 }catch{throw Error('암호가 다르거나 백업 파일이 손상되었습니다. 기존 기록은 유지됩니다.');}
}

export async function saveBackupFile(text,encrypted=true){
 const name=`Synex-backup-${encrypted?'encrypted':'plain'}-${Date.now()}.json`;
 if(Capacitor.isNativePlatform()){
  if(Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('VideoRecording'))throw Error('이 기기의 파일 내보내기를 지원하지 않습니다.');
  let id;
  try{({id}=await NativeFiles.begin({name,mimeType:'application/json',share:false}));
   const bytes=new TextEncoder().encode(text);
   for(let start=0;start<bytes.length;start+=128*1024)await NativeFiles.append({id,data:encode(bytes.slice(start,start+128*1024))});
   await NativeFiles.finish({id});id=null;
  }finally{if(id)await NativeFiles.cancel({id}).catch(()=>{});}
 }else{
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
}
