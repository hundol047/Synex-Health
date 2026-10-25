import {UNIVERSITY_CENTERS} from '../lib/universityCenters.js';
import OfficialCenterLink from './OfficialCenterLink.jsx';
import {schoolStatusLabel} from '../lib/integrationStatus.js';
import {LOCAL_ONLY} from '../../shared/lib/localMode.js';
import React, { useEffect, useState } from 'react';
import { HealthAPI,api } from '../../shared/lib/api.js';
import { useApiData } from '../lib/useApiData.js';
import { Card, ErrorState } from '../../shared/components/ui.jsx';

export default function SchoolSelector({profile,onSaved}) {
  const connection=useApiData(()=>api('/api/health/school-connection'),[]);
  const schools=useApiData(()=>HealthAPI.schools(),[]);
  const [query,setQuery]=useState(''),[selected,setSelected]=useState(profile?.school_id||'');
  const [share,setShare]=useState(!!profile?.share_with_center),[saving,setSaving]=useState(false);
  const [error,setError]=useState(null),[message,setMessage]=useState(''),[requested,setRequested]=useState('');
  useEffect(()=>{setSelected(profile?.school_id||'');setShare(!!profile?.share_with_center);},[profile?.school_id,profile?.share_with_center]);
  useEffect(()=>{if(window.location.hash==='#school-connection')document.getElementById('school-connection')?.scrollIntoView?.({block:'start'});},[]);
  const options=(schools.data||[]).filter(s=>s.name.includes(query)||s.region.includes(query)||s.id===selected);
  const current=(schools.data||[]).find(s=>s.id===selected);
  async function save(){
    setSaving(true);setError(null);setMessage('');
    try{await HealthAPI.selectSchool({school_id:selected||null,share_with_center:share});setMessage(LOCAL_ONLY?'학교 소속을 이 기기에 저장했습니다. 자동 연동은 설정되지 않았습니다.':'학교와 공유 설정을 저장했습니다. 측정 기록 연결 상태는 별도로 확인하세요.');onSaved?.();connection.reload();}
    catch(e){setError(e);}finally{setSaving(false);}
  }
  async function request(){
    setSaving(true);setError(null);setMessage('');
    try{const result=await HealthAPI.requestSchool(requested);setMessage(result.message);setRequested('');}
    catch(e){setError(e);}finally{setSaving(false);}
  }
  return <div id="school-connection"><Card title="내 학교 · 디지털헬스케어센터·스포츠센터">
    <p className="muted">인증 상태: {connection.data?.verified?'학교 계정 인증됨':'학교 인증 미완료'} · 건강센터: {LOCAL_ONLY?'기기 전용 · 미연결':schoolStatusLabel(connection.data?.integration_status)}</p><p className="muted">학교·캠퍼스를 선택해 소속을 설정합니다. 학교 선택 자체는 재학 인증이나 건강센터 시스템 연결을 의미하지 않습니다.</p>
    {schools.error&&<ErrorState message={schools.error.message} onRetry={schools.reload}/>}
    <p><a className="btn btn-ghost" href="/health/connections#university-centers">국내 대학 센터 찾기</a></p>
    <div className="profile-grid">
      <label>학교 검색<input className="text-input" placeholder="학교명 또는 지역" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <label>소속 학교<select className="text-input" disabled={schools.loading} value={selected} onChange={e=>{setSelected(e.target.value);setShare(false);setMessage('');}}>
        <option value="">선택하지 않음</option>{options.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
    </div>
    <p>센터가 있는 학교라도 자동으로 연결되지는 않습니다. 기관의 공식 연결 지원, 학교 계정 인증과 본인 측정 계정 확인이 필요합니다. 학교 이름만 선택해 다른 학생의 기록에 접근할 수는 없습니다.</p>
    {current&&<div className="motion-intensity" style={{marginTop:14}}><strong>{current.name}</strong><p>{current.integration_message}</p><div className="membership-actions">{UNIVERSITY_CENTERS.filter(c=>c.schoolId===selected).map(c=><OfficialCenterLink key={c.id} center={c}/>)}</div><p>기관 연결: {LOCAL_ONLY?'기기 전용 · 미연결':schoolStatusLabel(current.integration_status)}</p><p>측정 기록은 결과지를 직접 입력할 수 있습니다. 자동 가져오기는 연결 화면에서 본인 계정의 상태를 확인하세요.</p></div>}
    <label style={{display:'flex',gap:10,margin:'16px 0',fontSize:'.85rem',lineHeight:1.7}}>
      <input type="checkbox" disabled={LOCAL_ONLY||!selected} checked={share} onChange={e=>setShare(e.target.checked)}/>
      {LOCAL_ONLY?'기기 전용 모드에서는 학교 소속만 저장합니다. 건강센터에 기록을 공유하지 않습니다.':'선택한 학교의 Synex Health 상담사에게 건강 기록을 공유합니다. 해제하면 이후 조회가 차단됩니다.'}
    </label>
    {error&&<ErrorState message={error.message}/>}{message&&<p role="status">{message}</p>}
    <button type="button" className="btn btn-primary" onClick={save} disabled={saving||schools.loading||!!schools.error}>{saving?'처리 중...':'학교·공유 설정 저장'}</button>
    {!LOCAL_ONLY&&<details style={{marginTop:18}}><summary>목록에 학교가 없나요?</summary><p className="muted">학교 추가 요청은 관리자 확인 대기 상태로 저장됩니다.</p>
      <div style={{display:'flex',gap:8}}><input aria-label="추가 요청 학교명" className="text-input" maxLength={100} value={requested} onChange={e=>setRequested(e.target.value)} placeholder="학교명·캠퍼스"/><button type="button" className="btn btn-secondary" disabled={saving||requested.trim().length<2} onClick={request}>추가 요청</button></div>
    </details>}
  </Card></div>;
}
