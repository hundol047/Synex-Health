import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {selectLoginConfig,validateLoginRequest,authorizationParameters} from '../lib/login.js';
import { Capacitor } from '@capacitor/core';
import { setAccessToken,configureRefresh } from '../lib/session.js';
import {clearRememberedSession,rememberNativeSession,restoreRememberedSession} from '../lib/persistentSession.js';
import {clearLocalAccount} from '../lib/accountLifecycle.js';
import {bindOfflineAccount,offlineState} from '../lib/offline.js';
import { api,BASE,getDemoUser } from '../lib/api.js';
const AuthContext=createContext({demo:true,role:'student'});
export const useAuth=()=>useContext(AuthContext);
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const native=Capacitor.isNativePlatform();
const redirect=()=>native?`${import.meta.env.VITE_APP_SCHEME||'com.synex.health'}://auth/callback`:`${location.origin}/auth/callback`;
async function discovery(config){
 const issuer=config?.issuer;
 if(!issuer||!issuer.startsWith('https://'))throw Error('로그인 연결을 준비 중입니다. 운영자에게 문의해 주세요.');
 const response=await fetch(`${issuer.replace(/\/$/,'')}/.well-known/openid-configuration`);
 if(!response.ok)throw Error('로그인 서버에 연결할 수 없습니다.');
 const info=await response.json();
 if(info.issuer!==issuer||!info.authorization_endpoint?.startsWith('https://')||!info.token_endpoint?.startsWith('https://'))throw Error('로그인 서버 설정을 확인해 주세요.');
 return info;
}
export default function AuthBoundary({children}){
 const [remember,setRemember]=useState(false),[notice,setNotice]=useState(''),[schoolSettingsError,setSchoolSettingsError]=useState('');
 const callbackRunning=useRef(false);
 const [reviewEnabled,setReviewEnabled]=useState(false),[reviewName,setReviewName]=useState(''),[reviewPassword,setReviewPassword]=useState('');
 const [provider,setProvider]=useState(null),[settingsLoaded,setSettingsLoaded]=useState(false),[settingsError,setSettingsError]=useState('');
 const [schools,setSchools]=useState([]),[school,setSchool]=useState('');
 const [auth,setAuth]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
 async function load(){setError('');try{
  const health=await api('/api/health/status');
  setReviewEnabled(health.review_login===true);
  if(health.demo&&import.meta.env.VITE_RELEASE_BUILD==='true')throw Error('운영 서버 인증 설정이 올바르지 않습니다.');
  if(health.demo){await bindOfflineAccount(getDemoUser(),BASE);setAuth({demo:true,role:'student'});return;}
  const me=await api('/api/health/profile');await bindOfflineAccount(me.id,BASE);setAuth({demo:false,role:me.role});
  if(me.role==='student')void api('/api/integrations/inbody').then(async status=>{if(!status)return;const last=Date.parse(status.last_sync_time||'');if(['MAPPED','SYNCED','ERROR'].includes(status.operational_state)&&(!Number.isFinite(last)||Date.now()-last>=6*60*60*1000))await api('/api/integrations/inbody/sync?trigger=app_login',{});}).catch(e=>{if(e.status!==429)setNotice('건강센터 데이터를 가져오지 못했습니다. 기존 기록은 계속 사용할 수 있습니다.');});
 }catch(e){if(e.status===401){setAuth({demo:false,login:true});}else setError(e.message);}}
 async function callback(url){
  const received=new URL(url),target=new URL(redirect());
  if(received.origin!==target.origin||received.protocol!==target.protocol||received.host!==target.host||received.pathname!==target.pathname)return;
  if(callbackRunning.current)return;
  callbackRunning.current=true;setPending(true);
  try{
   const raw=sessionStorage.getItem('synex-pkce');
   sessionStorage.removeItem('synex-pkce');
   const saved=validateLoginRequest(raw,received,redirect());
   if(!received.searchParams.get('code'))throw Error('로그인이 취소되었습니다.');
   const info=await discovery(saved.config);
   const response=await fetch(info.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:saved.config.client_id,code:received.searchParams.get('code'),code_verifier:saved.verifier,redirect_uri:redirect()})});
   const tokens=await response.json();
   if(!response.ok||!tokens.access_token)throw Error('로그인을 완료하지 못했습니다.');
   setAccessToken(tokens.access_token);configureRefresh(tokens,info.token_endpoint,saved.config.client_id);
   await clearRememberedSession();
   try{
    const session=await api('/api/auth/session',{remember:!!saved.remember,transport:native?'native':'web'});
    if(session.remembered){
     if(native){
      try{await rememberNativeSession(session,BASE);}
      catch(err){await api('/api/auth/session',undefined,{method:'DELETE',headers:{Authorization:`Bearer ${session.session_token}`}});throw err;}
     }else setAccessToken('');
    }
   }catch{setNotice('로그인은 완료했지만 로그인 유지를 설정하지 못했습니다. 다음 실행 시 다시 로그인해 주세요.');}
   // The backend validates issuer, audience, signature and expiry on every request.
   if(native){const {Browser}=await import('@capacitor/browser');await Browser.close().catch(()=>{});}
   history.replaceState({},'', '/health');await load();
  }catch(e){setAccessToken('');history.replaceState({},'', '/health');setError(e.message);setAuth({demo:false,login:true});}finally{callbackRunning.current=false;setPending(false);}
 }
 async function loadSettings(){
  setSettingsLoaded(false);setSettingsError('');setSchoolSettingsError('');
  // AbortSignal.timeout is absent on older Android/iOS WebViews.
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  let general,schoolList;
  try{[general,schoolList]=await Promise.allSettled([
   api('/api/auth/config',undefined,{signal:controller.signal}),
   api('/api/auth/schools',undefined,{signal:controller.signal})
  ]);}finally{clearTimeout(timer);}
  if(general.status==='fulfilled')setProvider(general.value.provider);
  else{setProvider(null);setSettingsError('일반 로그인 설정을 불러오지 못했습니다. 다시 시도해 주세요.');}
  if(schoolList.status==='fulfilled')setSchools(schoolList.value);
  else{setSchools([]);setSchool('');setSchoolSettingsError('학교 로그인 설정을 불러오지 못했습니다. 일반 계정은 계속 이용할 수 있습니다.');}
  setSettingsLoaded(true);
 }
 useEffect(()=>{
  loadSettings();
  if(location.pathname==='/auth/callback') callback(location.href); else restoreRememberedSession(BASE).catch(()=>setNotice('저장된 로그인을 불러오지 못했습니다. 다시 로그인해 주세요.')).then(load);
  let handle;
  const expired=()=>{setAccessToken('');clearRememberedSession().catch(()=>setNotice('저장된 로그인 정보를 지우지 못했습니다. 기기 상태를 확인하세요.'));setAuth({demo:false,login:true});};
  window.addEventListener('synex-session-expired',expired);
  const listener=native?import('@capacitor/app').then(({App})=>App.addListener('appUrlOpen',({url})=>callback(url))).then(h=>{handle=h;}).catch(()=>setNotice('앱 로그인 연결을 초기화하지 못했습니다. 앱을 완전히 종료한 뒤 다시 시도해 주세요.')):Promise.resolve();
  return()=>{listener.then(()=>handle?.remove()).catch(()=>{});window.removeEventListener('synex-session-expired',expired);};
 },[]);
 async function login(){setPending(true);setError('');try{
  const selected=school?schools.find(c=>c.school_id===school):provider;
  const config=selectLoginConfig(selected,native,redirect());
  const info=await discovery(config);
  const verifier=random(),state=random(),challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  sessionStorage.setItem('synex-pkce',JSON.stringify({verifier,state,created:Date.now(),config,remember,redirect_uri:redirect()}));
  const url=new URL(info.authorization_endpoint);url.search=authorizationParameters(config,{state,challenge,redirectUri:redirect()}).toString();
  if(native){const {Browser}=await import('@capacitor/browser');await Browser.open({url:url.href});setPending(false);}else location.assign(url.href);
 }catch(e){setError(e.message);setPending(false);}}
 if(auth&&!auth.login)return <AuthContext.Provider value={{...auth,logout:async()=>{if((offlineState().pending||offlineState().drafts)&&!window.confirm('미전송 또는 진행 중 임시 기록이 있습니다. 로그아웃하면 이 기기의 미전송·진행 중 기록이 삭제됩니다. 먼저 전송하는 것을 권장합니다. 그래도 로그아웃할까요?'))return;try{try{await api('/api/auth/logout',{});}catch(err){if(err.status!==401)throw err;}await api('/api/auth/session',undefined,{method:'DELETE'});await clearLocalAccount();setAuth({demo:false,login:true});}catch{window.alert('로그아웃을 완료하지 못했습니다. 네트워크와 기기 상태를 확인한 뒤 다시 시도하세요.');}}}}>{notice&&<p role="status">{notice}</p>}{children}</AuthContext.Provider>;
 return <main className="health-main"><section className="membership-hero"><span className="eyebrow">SYNEX HEALTH</span><h1>나의 건강 기록을 안전하게</h1><p>내 계정으로 로그인하여 건강 기록을 연결하세요. 회원가입과 비밀번호 재설정은 연결된 인증 서비스에서 진행합니다. 학교 연동은 선택할 수 있습니다.</p></section><section className="card">{notice&&<p role="status">{notice}</p>}{schoolSettingsError&&<p role="alert">{schoolSettingsError} <button className="btn" onClick={loadSettings}>학교 설정 다시 불러오기</button></p>}{settingsError&&<p role="alert">{settingsError} <button className="btn" onClick={loadSettings}>다시 불러오기</button></p>}{settingsLoaded&&!settingsError&&!provider&&!schools.length&&<p role="status">계정 로그인 연결을 준비 중입니다. 연결이 완료되면 회원가입과 로그인을 이용할 수 있습니다.</p>}{error&&<p role="alert">{error}</p>}{schools.length>0&&<label>학교 로그인 <select value={school} onChange={e=>setSchool(e.target.value)}><option value="">일반 계정 로그인</option>{schools.map(s=><option key={s.school_id} value={s.school_id}>{s.school_id}</option>)}</select></label>}{reviewEnabled&&<form onSubmit={async e=>{e.preventDefault();setPending(true);try{const r=await api('/api/auth/review',{username:reviewName,password:reviewPassword});setAccessToken(r.access_token);setReviewPassword('');await load();}catch(err){setError(err.message);}finally{setPending(false);}}}><h2>App Review · 심사 계정</h2><label>심사 ID<input autoComplete="username" value={reviewName} onChange={e=>setReviewName(e.target.value)}/></label><label>비밀번호<input type="password" autoComplete="current-password" value={reviewPassword} onChange={e=>setReviewPassword(e.target.value)}/></label><button className="btn" disabled={pending}>심사 로그인</button></form>}{auth?.login&&<label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>이 기기에서 로그인 유지 (최대 8시간 · 공용 기기에서는 끄세요)</label>}{auth?.login?<button className="btn btn-primary" disabled={pending||!settingsLoaded||(!school&&!provider)} onClick={login}>{pending?'로그인 중…':school?'학교 계정으로 로그인':'로그인 · 회원가입'}</button>:<><p>서버 연결을 확인하고 있습니다.</p><button className="btn" onClick={load}>다시 연결</button></>}</section></main>;
}
