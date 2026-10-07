import {LOCAL_ONLY} from '../lib/localMode.js';
import React,{useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {BASE} from '../lib/api.js';
import {normalizeServer,verifyServer,SERVER_KEY} from '../lib/serverConfig.js';
import {BUILD_LABEL} from '../lib/buildInfo.js';
export default function NativeServerSetup({children}){
 const [address,setAddress]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=useRef(null);useEffect(()=>()=>active.current?.abort(),[]);
 if(LOCAL_ONLY||!Capacitor.isNativePlatform()||BASE)return children;
 const release=import.meta.env.VITE_RELEASE_BUILD==='true';
 async function connect(){
  if(busy)return;setBusy(true);setError('');
  const controller=new AbortController();active.current=controller;
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const origin=normalizeServer(address);await verifyServer(origin,{signal:controller.signal});
   localStorage.setItem(SERVER_KEY,origin);window.location.reload();
  }catch(e){setError(e.name==='AbortError'?'서버가 응답하지 않습니다. 서버 주소와 실행 상태를 확인해 주세요.':e.message);}
  finally{clearTimeout(timeout);active.current=null;setBusy(false);}
 }
 return <main className="health-main"><section className="card"><h1>서버 연결이 필요합니다</h1><p>이 설치 파일에는 서버 주소가 설정되어 있지 않습니다. 로그인·학교 설정·건강 기록은 서버에 연결한 뒤 사용할 수 있습니다.</p><p className="muted">빌드 {BUILD_LABEL}</p>
 {release?<p role="alert">운영 앱의 서버 설정이 누락됐습니다. 운영자에게 수정된 설치 파일을 요청해 주세요.</p>:<form onSubmit={e=>{e.preventDefault();connect();}}><label>Synex Health API 서버 주소<input className="text-input" type="url" required autoCapitalize="none" autoCorrect="off" autoComplete="off" value={address} disabled={busy} onChange={e=>setAddress(e.target.value)} placeholder="실제 HTTPS 서버 기본 주소"/></label><p className="muted">서버에서 확인한 실제 주소를 입력해 주세요. GitHub 주소나 APK 다운로드 주소는 서버 주소가 아닙니다.</p>{error&&<p role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy?'서버 확인 중…':'서버 확인 · 연결'}</button></form>}
 </section></main>;
}
