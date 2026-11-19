import React, { useMemo, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { MapPin, LocateFixed } from "lucide-react";
import { Card, Field, Notice, PageHead } from "./ui.jsx";
import { distanceKm, findFacilities } from "./facilities.js";
import directory from "./facility-directory.json";
import { today } from "./store.js";

const addressLookup = registerPlugin("FacilityAddress");
const official = "https://nfa.kspo.or.kr/spoint/selectSpointFacility.kspo";
const notice = "https://nfa.kspo.or.kr/community/board/selectNoticeView.kspo?contSn=40212&menuId=A05_B01";
const voucherMap = "https://www.spoinfo.or.kr/map/map.do";
function mapLink(item) {
  return "https://map.kakao.com/link/search/" + encodeURIComponent(item.address.split("(")[0].trim());
}

function Facility({ item, position }) {
  const [pin, setPin] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function locateAddress() {
    setBusy(true);
    try {
      const result = await addressLookup.find({ address: item.address.split("(")[0].trim() });
      setPin([result.latitude, result.longitude]);
      setError("");
    } catch {
      setError("건물 위치를 확인하기 어렵습니다. 주소로 지도를 열어 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return <li className="gym-facility">
    <h3>{item.name}</h3>
    <p>{item.address} {item.detail}</p>
    {pin && position ? <strong>건물까지 직선 {distanceKm(position, pin).toFixed(1)} km</strong>
      : item.distance != null && <small>{item.areaName} 중심까지 약 {item.distance.toFixed(1)} km</small>}
    <div>
      <a className="gym-text-link" href={pin ? "https://map.kakao.com/link/map/" + encodeURIComponent(item.name) + "," + pin.join(",") : mapLink(item)} target="_blank" rel="noreferrer"><MapPin size={16}/> 지도 보기</a>
      {position && !pin && Capacitor.getPlatform() === "android" &&
        <button className="gym-button secondary small" disabled={busy} onClick={locateAddress}>{busy ? "주소 확인 중…" : "건물까지 거리"}</button>}
    </div>
    {error && <p role="status">{error}</p>}
  </li>;
}

export default function NearbyFacilities() {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);
  const [gyms, setGyms] = useState(true);
  const [limit, setLimit] = useState(10);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const date = today();
  const results = useMemo(() => findFacilities(directory.rows, { query, position, gyms, date }), [query, position, gyms, date]);
  function locate() {
    if (!navigator.geolocation) { setMessage("이 기기에서는 지역명으로 검색해 주세요."); return; }
    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition([coords.latitude, coords.longitude]); setQuery(""); setLimit(10); setBusy(false);
    }, () => {
      setBusy(false); setMessage("위치를 확인할 수 없습니다. 지역명으로 검색하거나 기기의 위치 권한을 확인해 주세요.");
    }, { maximumAge: 60000, timeout: 12000, enableHighAccuracy: false });
  }
  const searched = position || query.trim();
  return <>
    <PageHead eyebrow="내 주변" title="운동 혜택 시설 찾기">튼튼머니 등록 시설의 위치를 확인하고, 스포츠강좌이용권 사용처도 찾아보세요.</PageHead>
    <Card title="튼튼머니 등록 시설">
      <p>국민체육진흥공단은 2026년 8월 3일부터 기본 운동 포인트 적립 중단을 공지했습니다. 방문 전 지급 재개 여부를 확인하세요. <a className="gym-text-link" href={notice} target="_blank" rel="noreferrer">지급 공지 ↗</a></p>
      <button className="gym-button" onClick={locate} disabled={busy}><LocateFixed size={17}/>{busy ? "위치 확인 중…" : "내 위치로 찾기"}</button>
      {position && <button className="gym-button secondary" onClick={() => { setPosition(null); setLimit(10); }}>위치 사용 해제</button>}
      <Field label="지역 또는 시설 이름"><input type="search" placeholder="예: 원주시 반곡동, 피트니스" value={query} onChange={e => {setQuery(e.target.value); setLimit(10);}} /></Field>
      <label className="gym-check"><input type="checkbox" checked={gyms} onChange={e => {setGyms(e.target.checked); setLimit(10);}}/>이름에 헬스·피트니스·짐·PT 등이 있는 시설만 보기</label>
      <Notice>{message}</Notice>
      {position && <p>동네 중심이 가까운 순으로 표시합니다. 지역 검색 없이 내 위치로 찾으면 반경 30 km 이내 동네를 조회합니다.</p>}
      {searched && <><p aria-live="polite">{results.length ? `검색 결과 ${results.length}곳` : "일치하는 시설이 없습니다. 지역명을 바꾸거나 헬스장 필터를 해제해 보세요."}</p>
        <ul className="gym-facilities">{results.slice(0, limit).map(item => <Facility key={[item.name,item.address,item.detail].join("|")} item={item} position={position}/>)}</ul>
        {limit < results.length && <button className="gym-button secondary" onClick={() => setLimit(limit+10)}>시설 더 보기</button>}</>}
      <p>시설 목록 기준일 {directory.checked} · <a className="gym-text-link" href={official} target="_blank" rel="noreferrer">공단 최신 등록 목록 ↗</a></p>
    </Card>
    <Card title="스포츠강좌이용권 사용처">
      <p>이용권 선정 회원은 가맹시설의 등록 강좌를 결제할 수 있습니다. 공식 지도에서 ‘스포츠강좌이용권 가능시설’ 표시와 수강 가능한 강좌를 확인하세요.</p>
      <a className="gym-button secondary" href={voucherMap} target="_blank" rel="noreferrer">공식 시설 지도 열기 ↗</a>
    </Card>
    <p className="gym-muted">동네 위치 자료 · 행정안전부 법정동·국토지리정보원 브이월드, swuhalee 가공. 건강생활실천지원금 참여 자격은 건강보험공단에서 확인하세요.</p>
  </>;
}
