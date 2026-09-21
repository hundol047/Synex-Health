import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Link } from 'react-router-dom';
import { Check, Crown, ShieldCheck, RefreshCw } from 'lucide-react';
import { BillingAPI, storePackages, buyPackage, restore, manageURL } from '../../shared/lib/subscriptions.js';
export default function SubscriptionPage() {
  const [status,setStatus]=useState(null), [plans,setPlans]=useState([]), [packages,setPackages]=useState([]);
  const [error,setError]=useState(''), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  async function reload() {
    const [p,s]=await Promise.all([BillingAPI.plans(),BillingAPI.status()]);setPlans(p.plans);setStatus(s);
    if(s.mode==='revenuecat' && Capacitor.isNativePlatform()) setPackages(await storePackages(s));
  }
  useEffect(()=>{reload().catch(e=>setError(e.message));},[]);
  async function act(fn,success) {
    setBusy(true);setError('');setMessage('');
    try {const result=await fn();setStatus(result);setMessage(success);} catch(e){setError(e.userCancelled?'구매를 취소했습니다.':e.message);} finally{setBusy(false);}
  }
  const native=Capacitor.isNativePlatform(), url=manageURL(status?.store);
  return <>
    <section className="membership-hero"><span className="eyebrow">SYNEX MEMBERSHIP</span><h1>나의 변화를, 더 꾸준하게</h1><p>기본 건강 관리는 무료로 시작하고,<br/>Plus로 매월 쌓인 기록을 한눈에 정리하세요.</p><span className="membership-badge"><ShieldCheck size={16}/> 건강 기록은 회원님의 계정에 보관됩니다</span></section>
    {error && <div className="card" role="alert"><p>{error}</p><button className="btn" onClick={()=>reload().catch(e=>setError(e.message))}>다시 확인</button></div>}
    {message && <p className="card" role="status">{message}</p>}
    {status && <section className="card membership-status"><div><small className="muted">현재 이용 중</small><h2>{status.active?'Synex Plus':'Synex Free'} {status.demo && <small>· 결제 없는 데모</small>}</h2>{status.expires_at && <p className="muted">{new Date(status.expires_at*1000).toLocaleDateString('ko-KR')}까지 이용 · {status.will_renew?'자동 갱신 예정':'갱신 해제'}</p>}</div><Link className="btn btn-ghost" to="/health/report">월별 리포트 보기 →</Link></section>}
    <div className="membership-grid">{plans.map(plan=><section className={`card membership-plan ${plan.id==='plus'?'featured':''}`} key={plan.id}>{plan.id==='plus' && <span className="eyebrow"><Crown size={16}/> 더 깊이 보는 나의 기록</span>}<h2>{plan.name}</h2><p className="membership-price">{plan.price_label}</p><ul>{plan.features.map(f=><li key={f}><Check size={18}/>{f}</li>)}</ul>{plan.id==='free'?<Link className="btn btn-ghost" to="/health">무료 기능 이용하기</Link>:<>
      {status?.mode==='demo' && <button className="btn btn-primary" disabled={busy||status.active} onClick={()=>act(()=>BillingAPI.demo('activate'),'Plus 데모를 시작했습니다. 실제 결제는 발생하지 않습니다.')}>{status.active?'Plus 데모 이용 중':'Plus 데모 체험 · 결제 없음'}</button>}
      {status?.mode==='revenuecat' && native && packages.map(p=><button key={p.identifier} className="btn btn-primary" disabled={busy||status.active} onClick={()=>act(()=>buyPackage(status,p),'구매 후 서버에서 구독 상태를 확인했습니다. 활성화가 지연되면 상태를 새로고침해 주세요.')}>{p.packageType==='ANNUAL'?'연간 구독':'월간 구독'} · {p.product.priceString}</button>)}
      {status?.mode==='disabled' && <p className="muted">스토어 결제 연결 준비 중입니다. 현재 결제할 수 없습니다.</p>}
      {status?.mode==='revenuecat' && (!native||!packages.length) && <p className="muted">연결된 모바일 앱의 스토어 상품을 확인해 주세요. 표시할 상품이 아직 없습니다.</p>}
    </>}</section>)}</div>
    {status && <section className="card"><h2>구독 관리</h2><div className="membership-actions"><button className="btn btn-ghost" disabled={busy} onClick={()=>act(BillingAPI.sync,'구독 상태를 확인했습니다.')}><RefreshCw size={16}/> 상태 새로고침</button>{native&&status.mode==='revenuecat'&&<button className="btn btn-ghost" disabled={busy} onClick={()=>act(()=>restore(status),'구매 복원 후 서버 확인을 마쳤습니다.')}>구매 복원</button>}{url&&<a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer" onClick={async e=>{if(native){e.preventDefault();try{const {Browser}=await import('@capacitor/browser');await Browser.open({url});}catch(err){setError(err.message);}}}}>스토어에서 구독 관리·해지</a>}{status.demo&&status.active&&<><button className="btn btn-ghost" disabled={busy||!status.will_renew} onClick={()=>act(()=>BillingAPI.demo('cancel'),'데모 갱신을 해제했습니다. 이용 기간까지 Plus를 유지합니다.')}>데모 갱신 해제</button><button className="btn btn-ghost" disabled={busy} onClick={()=>act(()=>BillingAPI.demo('reset'),'무료 요금제로 돌아왔습니다.')}>데모 종료</button></>}</div><p className="muted">유료 구독은 취소 전까지 자동 갱신됩니다. 실제 가격과 결제 주기는 스토어 구매 화면에서 확인합니다. 해지는 구매한 스토어에서 진행하며 만료 시 Free로 전환됩니다. 기존 건강 기록은 유지됩니다.</p></section>}
    <p className="muted">Plus는 기록 분석 기능을 제공합니다. 학교 건강센터 연결이나 의료 전문가 상담을 포함하지 않습니다.</p>
  </>;
}
