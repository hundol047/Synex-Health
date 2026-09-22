import React,{createContext,useContext,useEffect,useState} from 'react';
import { Capacitor } from '@capacitor/core';
import { setAccessToken } from '../lib/session.js';
import { api } from '../lib/api.js';
const AuthContext=createContext({demo:true,role:'student'});
export const useAuth=()=>useContext(AuthContext);
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const native=Capacitor.isNativePlatform();
const redirect=()=>native?'com.synex.health://auth/callback':`${location.origin}/auth/callback`;
async function discovery(config){
 const issuer=config?.issuer||import.meta.env.VITE_OIDC_ISSUER;
 if(!issuer||!issuer.startsWith('https://'))throw Error('학교 로그인 연결을 준비 중입니다. 운영자에게 문의해 주세요.');
 const response=await fetch(`${issuer.replace(/\/$/,'')}/.well-known/openid-configuration`);
 if(!response.ok)throw Error('로그인 서버에 연결할 수 없습니다.');
 const info=await response.json();
 if(info.issuer!==issuer||!info.authorization_endpoint?.startsWith('https://')||!info.token_endpoint?.startsWith('https://'))throw Error('로그인 서버 설정을 확인해 주세요.');
 return info;
}
export default function AuthBoundary({children}){
 const [schools,setSchools]=useState([]),[school,setSchool]=useState('');
 const [auth,setAuth]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(false);
 async function load(){setError('');try{
  const health=await api('/api/health/status');
  if(health.demo){setAuth({demo:true,role:'student'});return;}
  const me=await api('/api/health/profile');setAuth({demo:false,role:me.role});
 }catch(e){if(e.status===401){setAuth({demo:false,login:true});}else setError(e.message);}}
 async function callback(url){
  const received=new URL(url),target=new URL(redirect());
  if(received.origin!==target.origin||received.protocol!==target.protocol||received.host!==target.host||received.pathname!==target.pathname)return;
  const raw=sessionStorage.getItem('synex-pkce');
  if(!raw)return;
  sessionStorage.removeItem('synex-pkce');
  const saved=JSON.parse(raw);
  try{
   if(saved.state!==received.searchParams.get('state')||Date.now()-saved.created>600000)throw Error('로그인 요청이 만료되었습니다. 다시 로그인해 주세요.');
   if(!received.searchParams.get('code'))throw Error('로그인이 취소되었습니다.');
   const info=await discovery(saved.config);
   const response=await fetch(info.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:saved.config?.client_id||import.meta.env.VITE_OIDC_CLIENT_ID,code:received.searchParams.get('code'),code_verifier:saved.verifier,redirect_uri:redirect()})});
   const tokens=await response.json();
   if(!response.ok||!tokens.access_token)throw Error('로그인을 완료하지 못했습니다.');
   setAccessToken(tokens.access_token);
   // The backend validates issuer, audience, signature and expiry on every request.
   if(native){const {Browser}=await import('@capacitor/browser');await Browser.close().catch(()=>{});}
   history.replaceState({},'', '/health');await load();
  }catch(e){setError(e.message);setAuth({demo:false,login:true});}finally{setPending(false);}
 }
 useEffect(()=>{
  api('/api/auth/schools').then(setSchools).catch(()=>{});
  if(location.pathname==='/auth/callback' && sessionStorage.getItem('synex-pkce')) callback(location.href); else load();
  let handle;
  const expired=()=>{setAccessToken('');setAuth({demo:false,login:true});};
  window.addEventListener('synex-session-expired',expired);
  const listener=native?import('@capacitor/app').then(({App})=>App.addListener('appUrlOpen',({url})=>callback(url))).then(h=>{handle=h;}):Promise.resolve();
  return()=>{listener.then(()=>handle?.remove());window.removeEventListener('synex-session-expired',expired);};
 },[]);
 async function login(){setPending(true);setError('');try{
  const config=schools.find(c=>c.school_id===school);
  if(schools.length&&!config)throw Error('로그인할 학교를 선택하세요.');
  if(config&&config.redirect_url!==redirect())throw Error('현재 앱의 로그인 redirect URL이 학교 설정과 다릅니다.');
  const info=await discovery(config),client=config?.client_id||import.meta.env.VITE_OIDC_CLIENT_ID;
  if(!client)throw Error('로그인 클라이언트 설정이 필요합니다.');
  const verifier=random(),state=random(),challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  sessionStorage.setItem('synex-pkce',JSON.stringify({verifier,state,created:Date.now(),config}));
  const url=new URL(info.authorization_endpoint);url.search=new URLSearchParams({response_type:'code',client_id:client,redirect_uri:redirect(),scope:'openid profile',state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
  if(native){const {Browser}=await import('@capacitor/browser');await Browser.open({url:url.href});setPending(false);}else location.assign(url.href);
 }catch(e){setError(e.message);setPending(false);}}
 if(auth&&!auth.login)return <AuthContext.Provider value={{...auth,logout:()=>{setAccessToken('');setAuth({demo:false,login:true});}}}>{children}</AuthContext.Provider>;
 return <main className="health-main"><section className="membership-hero"><span className="eyebrow">SYNEX HEALTH</span><h1>나의 건강 기록을 안전하게</h1><p>학교 계정으로 로그인하여 건강 기록과 구독을 연결합니다.</p></section><section className="card">{error&&<p role="alert">{error}</p>}{schools.length>0&&<label>학교 로그인 <select value={school} onChange={e=>setSchool(e.target.value)}><option value="">학교 선택</option>{schools.map(s=><option key={s.school_id} value={s.school_id}>{s.school_id}</option>)}</select></label>}{auth?.login?<button className="btn btn-primary" disabled={pending} onClick={login}>{pending?'로그인 중…':'학교 계정으로 로그인'}</button>:<><p>서버 연결을 확인하고 있습니다.</p><button className="btn" onClick={load}>다시 연결</button></>}</section></main>;
}
