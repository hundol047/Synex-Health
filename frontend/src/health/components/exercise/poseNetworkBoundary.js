// Dedicated workers do not inherit a document's connect-src policy. Keep the
// pose worker's model/WASM requests local and block the library's telemetry.
export function installPoseNetworkBoundary(scope){
 const origin=scope.location.origin;
 const isLocal=input=>{
  try{
   const target=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,scope.location.href);
   return target.origin===origin;
  }catch{return false;}
 };
 const blocked=()=>new DOMException('자세 분석은 기기 내 파일만 사용할 수 있습니다.','SecurityError');
 if(typeof scope.fetch==='function'){
  const fetchLocal=scope.fetch.bind(scope);
  scope.fetch=(input,options)=>isLocal(input)?fetchLocal(input,options):Promise.reject(blocked());
 }
 if(scope.XMLHttpRequest){
  const open=scope.XMLHttpRequest.prototype.open;
  scope.XMLHttpRequest.prototype.open=function(method,url,...options){
   if(!isLocal(url))throw blocked();
   return open.call(this,method,url,...options);
  };
 }
 if(typeof scope.navigator?.sendBeacon==='function'){
  const sendBeacon=scope.navigator.sendBeacon.bind(scope.navigator);
  scope.navigator.sendBeacon=(url,data)=>isLocal(url)?sendBeacon(url,data):false;
 }
 return isLocal;
}
