import {Capacitor} from '@capacitor/core';
export const SERVER_KEY='synex-server-origin-v1';
export function normalizeServer(value){
 let url;try{url=new URL(value.trim());}catch{throw Error('올바른 HTTPS 서버 주소를 입력해 주세요.');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('경로·계정 정보가 없는 HTTPS 서버 기본 주소를 입력해 주세요.');
 if(['localhost','127.0.0.1','example.com','example.org','example.net'].includes(url.hostname)||url.hostname.endsWith('.example'))throw Error('예시 주소 대신 실제 배포된 서버 주소를 입력해 주세요.');
 return url.origin;
}
export function resolveApiBase(){
 const configured=import.meta.env.VITE_API_BASE||'';
 if(configured||!Capacitor.isNativePlatform?.()||import.meta.env.VITE_RELEASE_BUILD==='true')return configured;
 try{const saved=localStorage.getItem(SERVER_KEY);return saved?normalizeServer(saved):'';}catch{return '';}
}
export async function verifyServer(origin,{fetcher=fetch,signal}={}){
 const response=await fetcher(origin+'/api/health/status',{signal});
 if(!response.ok)throw Error('서버 연결 실패 ('+response.status+'). 서버 실행 상태를 확인해 주세요.');
 let data;try{data=await response.json();}catch{throw Error('서버 API 대신 웹 화면이 응답했습니다. /api를 제공하는 서버 주소가 필요합니다.');}
 if(data?.service!=='synex-health'||data?.status!=='ok')throw Error('Synex Health API 서버를 확인할 수 없습니다.');
 return data;
}
