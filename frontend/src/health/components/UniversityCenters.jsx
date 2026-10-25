import React,{useState,useEffect} from 'react';
import {Card} from '../../shared/components/ui.jsx';
import {UNIVERSITY_CENTERS,CENTER_SOURCES_CHECKED_ON,CENTER_KIND_LABELS,findUniversityCenters} from '../lib/universityCenters.js';
import OfficialCenterLink from './OfficialCenterLink.jsx';
import './university-centers.css';

export default function UniversityCenters() {
  const [query,setQuery]=useState(''),[measurementOnly,setMeasurementOnly]=useState(false);
  useEffect(()=>{if(window.location.hash==='#university-centers')document.getElementById('university-centers')?.scrollIntoView?.({block:'start'});},[]);
  const centers=findUniversityCenters(query,measurementOnly);
  return <div id="university-centers"><Card title="국내 대학 센터 찾기" className="university-centers">
    <p>공식 안내를 직접 확인한 {new Set(UNIVERSITY_CENTERS.map(c=>c.university)).size}개 대학입니다. 대한민국 전체 대학 목록이나 데이터 연동 제휴 목록은 아닙니다.</p>
    <p className="university-center-notice">공식 안내는 외부 브라우저로 엽니다. 홈페이지를 열거나 학교를 선택해도 측정 기록은 자동으로 가져오지 않습니다.</p>
    <details><summary>학교 승인을 받으면 어떻게 연결하나요?</summary><p>학교·센터가 기록 제공을 승인하고 측정 시스템 연결을 마치면, 학교 계정 확인 후 내 기록을 가져오는 순서로 진행합니다. 목록에 없는 국내 대학도 연결 대상으로 추가할 수 있습니다. 승인만으로 모든 기관이 자동 연결되지는 않습니다.</p><p>현재 개인용 앱은 기기 내 저장 방식입니다. 학교 기록 자동 수집은 기관 연결을 마친 서버 운영 버전에서 제공하며, 지금은 결과지를 직접 입력할 수 있습니다.</p></details>
    <label>대학·캠퍼스·지역 검색<input className="text-input" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="예: 서울대, 고려, 원주, 부산"/></label>
    <label className="university-center-filter"><input type="checkbox" checked={measurementOnly} onChange={e=>setMeasurementOnly(e.target.checked)}/>체성분 검사 안내가 있는 곳만</label>
    <p aria-live="polite">검색 결과 {centers.length}곳 · 출처 확인일 {CENTER_SOURCES_CHECKED_ON}</p>
    {!centers.length&&<div className="university-center-empty"><p>검색 조건에 맞는 확인된 센터가 없습니다. 목록에 없다는 이유로 해당 학교에 센터가 없다고 판단하지 않습니다.</p><button type="button" className="btn btn-ghost" onClick={()=>{setQuery('');setMeasurementOnly(false);}}>전체 확인 목록 보기</button></div>}
    <div className="university-center-grid">{centers.map(center=><article key={center.id} className="university-center-card" aria-label={`${center.university} ${center.campus}`}>
      <span className="university-center-region">{center.region} · {center.campus}</span>
      <h3>{center.university}</h3><strong>{center.center}</strong>
      <p className={`university-center-badge ${center.kind}`}>{CENTER_KIND_LABELS[center.kind]}</p>
      <p>{center.summary}</p><p className="muted">{center.eligibility}</p>
      <p className="university-center-source">출처: {center.sourceTitle}</p>
      <OfficialCenterLink center={center}/>
    </article>)}</div>
    <div className="university-center-next"><h3>이미 결과지를 받았나요?</h3><p>전신 골격근량과 부위별 근육 분석 값을 입력하면 내 3D 신체 비교에 반영됩니다. 모르는 값은 비워두세요.</p><a className="btn btn-primary" href="/health/profile#segment-measurements">내 결과지 입력하기</a></div>
  </Card></div>;
}
