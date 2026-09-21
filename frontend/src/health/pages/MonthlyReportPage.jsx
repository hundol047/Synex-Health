import { Capacitor } from '@capacitor/core';
import React,{useState} from 'react';
import { Link } from 'react-router-dom';
import { BillingAPI } from '../../shared/lib/subscriptions.js';
import { useApiData } from '../lib/useApiData.js';
export default function MonthlyReportPage(){
 const now=new Date(), current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
 const [month,setMonth]=useState(current);
 const report=useApiData(()=>BillingAPI.report(month),[month]);
 const labels={weight:'체중 (kg)',skeletal_muscle_mass:'골격근량 (kg)',body_fat_percentage:'체지방률 (%p)'};
 return <section className="card monthly-report"><span className="eyebrow">SYNEX PLUS · MONTHLY REVIEW</span><h1>한 달의 건강 기록</h1><div className="membership-actions no-print"><label>조회 월 <input type="month" value={month} max={current} onChange={e=>e.target.value&&setMonth(e.target.value)}/></label>{!Capacitor.isNativePlatform() && <button className="btn btn-primary" disabled={!report.data||report.loading||!!report.error} onClick={()=>window.print()}>인쇄 · PDF 저장</button>}</div>
 {report.loading?<p role="status">리포트를 준비하고 있습니다.</p>:report.error?<div role="alert"><p>{report.error.message}</p>{report.error.status===403?<Link className="btn btn-primary" to="/health/subscription">Plus 요금제 보기</Link>:<button className="btn" onClick={report.reload}>다시 시도</button>}</div>:report.data&&<><p>{month} 기록 요약</p><div className="stat-grid">{[['측정 횟수',report.data.measurement_count],['운동 완료 항목',report.data.completed_count],['운동한 날',report.data.active_days]].map(([label,v])=><div className="stat-tile" key={label}><p className="label">{label}</p><strong>{v}</strong></div>)}</div><h2>월 내 첫 측정 대비 마지막 측정</h2><div className="stat-grid">{Object.entries(report.data.changes).map(([key,v])=><div className="stat-tile" key={key}><p className="label">{labels[key]}</p><strong>{v==null?'비교 기록 부족':`${v>0?'+':''}${v}`}</strong></div>)}</div><p className="muted">{report.data.notice}</p><p className="muted">기록이 없는 항목은 추정하지 않습니다. PDF에는 건강정보가 포함되므로 공유 대상을 확인해 주세요.</p></>}
 </section>;
}
