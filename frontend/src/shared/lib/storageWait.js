// Native bridge and IndexedDB requests can fail without delivering a callback.
// Bound the wait, and consume late rejections without treating them as success.
export function storageWait(operation,{signal,timeout=8000,message='기기 저장소의 응답이 늦어지고 있습니다. 다시 시도하거나 앱을 완전히 종료한 뒤 열어주세요.',cancel=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,value)=>{
   if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   if(error)reject(error);else resolve(value);
  };
  const abort=()=>{try{cancel();}finally{finish(new DOMException('저장소 열기가 취소되었습니다.','AbortError'));}};
  const timer=setTimeout(()=>{try{cancel();}finally{finish(Error(message));}},timeout);
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  try{Promise.resolve(operation()).then(value=>finish(null,value),error=>finish(error));}catch(error){finish(error);}
 });
}
