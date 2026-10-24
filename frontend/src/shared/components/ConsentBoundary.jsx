import React,{useEffect,useState,lazy,Suspense} from 'react';
import {api,BASE} from '../lib/api.js';
import {useAuth} from './AuthBoundary.jsx';
import {lockOffline,bindOfflineAccount} from '../lib/offline.js';
const PrivacyPage=lazy(()=>import('../../health/pages/PrivacyPage.jsx'));

export default function ConsentBoundary({children}){
 const [status,setStatus]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[manage,setManage]=useState(false);
 const [checks,setChecks]=useState({privacy_collection:false,sensitive_health:false,age_14_or_over:false});
 const auth=useAuth();
 async function load(){try{const next=await api('/api/consents');if(next.active){const me=await api('/api/health/profile');await bindOfflineAccount(me.id,BASE);}else lockOffline();setStatus(next);setError('');}catch(e){setError(e.message);}}
 useEffect(()=>{load();const reset=()=>{lockOffline();setStatus(null);setChecks({privacy_collection:false,sensitive_health:false,age_14_or_over:false});load();};window.addEventListener('synex-consent-required',reset);return()=>window.removeEventListener('synex-consent-required',reset);},[]);
 useEffect(()=>{if(!status?.active||auth.demo||auth.role!=='student')return;let active=true;
  api('/api/integrations/inbody').then(async s=>{if(!active||!s)return;const last=Date.parse(s.last_sync_time||'');if(['MAPPED','SYNCED','ERROR'].includes(s.operational_state)&&(!Number.isFinite(last)||Date.now()-last>=21600000))await api('/api/integrations/inbody/sync?trigger=app_login',{});}).catch(()=>{});
  return()=>{active=false;};
 },[status?.active,auth.demo,auth.role]);
 if(status?.active)return children;
 if(manage)return <main><button onClick={()=>{setManage(false);load();}}>동의 화면으로 돌아가기</button><Suspense fallback={<p>개인정보 관리를 여는 중입니다.</p>}><PrivacyPage consentGate/></Suspense></main>;
 if(!status)return <main><p>{error||'동의 상태를 확인하고 있습니다.'}</p>{error&&<button onClick={load}>다시 시도</button>}</main>;
 const labels={privacy_collection:'개인정보 수집·이용 동의 (필수)',sensitive_health:'민감정보(건강정보) 처리 동의 (필수, 별도)',age_14_or_over:'만 14세 이상입니다 (필수)'};
 return <main className="health-main"><section className="card"><h1>건강정보 처리 동의</h1><p>운영: {status.operator||'운영자 설정 대기'} · 문의: {status.support_email||'문의처 설정 대기'}</p>
 <h2>개인정보 수집·이용</h2><p>목적: 계정 식별과 서비스 제공. 항목: 로그인 식별자, 이름, 이메일, 학교, 생년월일. 보유 기간: {status.retention_policy||'운영자 설정 필요'}. 동의를 거부할 수 있으며 거부하면 건강기록 저장 서비스를 이용할 수 없습니다.</p>
 <h2>민감정보 별도 처리</h2><p>목적: 체성분 추적·운동 안내·기록 관리. 항목: 키, 체중, 체성분, 운동 제한·통증·수행 기록, 자세 분석 결과. 보유 기간: {status.retention_policy||'운영자 설정 필요'}. 동의를 거부하거나 철회할 수 있으며 이후 새 저장·분석·자동 연동과 상담사 조회가 중지됩니다. 학교 공유 동의는 별도입니다.</p>
 <p>만 14세 미만은 현재 가입할 수 없습니다. 보호자 동의 절차는 제공하지 않습니다. 기존 기록은 개인정보 관리에서 내보내거나 삭제할 수 있습니다.</p>
 {Object.entries(labels).map(([key,label])=><label key={key} style={{display:'block'}}><input type="checkbox" checked={checks[key]} onChange={e=>setChecks({...checks,[key]:e.target.checked})}/>{label}</label>)}
 {error&&<p role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy||!status.retention_policy||!Object.values(checks).every(Boolean)} onClick={async()=>{setBusy(true);try{await api('/api/consents',{...checks,version:status.version});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}}>동의하고 계속</button>
 <button className="btn" onClick={()=>setManage(true)}>동의 없이 내보내기·삭제 관리</button></section></main>;
}
