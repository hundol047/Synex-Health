import React, { useEffect, useState } from "react";
import { HealthAPI } from "../shared/lib/api.js";
import { useGym } from "./GymContext.jsx";
import { Card, Field, Notice } from "./ui.jsx";
import { applicationChecklist, applicationPacket, nhis } from "./benefitPaperwork.js";

const tasks = [["points", "쌓인 포인트 사용"], ["apply", "처음 참여 신청"], ["program", "건강관리 프로그램 이수 확인"], ["conversion", "건강실천카드 자동 전환 신청"]];
const routes = [["online", "온라인"], ["visit", "공단 지사 방문"], ["fax", "팩스"], ["clinic", "등록한 참여의원"]];
const fileTitles = { prevent: "예방형_참여신청", manage: "관리형_참여신청", conversion: "카드자동전환_신청", program: "프로그램_이수확인" };
function OfficialLink({ href, children }) {
  return <a className="gym-button" href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}

export default function BenefitAssistant({ type }) {
  const { state } = useGym();
  const managed = type === "manage";
  const [task, setTask] = useState("points");
  const [method, setMethod] = useState("online");
  const [minor, setMinor] = useState(false);
  const [assessment, setAssessment] = useState(false);
  const [profile, setProfile] = useState(null);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    HealthAPI.getProfile().then(value => { if (active) setProfile(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => { setMessage(""); }, [type]);
  const child = managed && minor;
  const route = child ? "visit" : method === "clinic" && !managed ? "online" : method;
  const available = tasks.filter(([key]) => key === "conversion" ? managed : key === "program" ? !managed : true);
  const current = available.some(([key]) => key === task) ? task : "points";
  const kind = current === "apply" ? type : current;
  const paper = current === "conversion" || current === "program" || (current === "apply" && route !== "online");
  const selfName = state.self?.name;
  const data = {
    name: edits.name ?? (profile?.name || (selfName && selfName !== "나" ? selfName : "")),
    birth: edits.birth ?? (profile?.birth_date || ""),
    phone: edits.phone ?? "",
    address: edits.address ?? "",
  };
  function edit(key, value) {
    setEdits(prev => ({ ...prev, [key]: value }));
    setMessage("");
  }
  async function download(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const forms = current === "apply" ? applicationPacket(type, route, assessment) : [kind];
      const { saveBenefitPdf } = await import("./benefitPdf.js");
      const saved = await saveBenefitPdf(forms, { ...data, name: data.name.trim() }, "건강생활실천지원금_" + fileTitles[kind] + ".pdf");
      setMessage(saved ? "PDF 저장 절차를 마쳤습니다. 제출 전 서명과 남은 칸을 확인하세요." : "저장을 취소했습니다.");
    } catch {
      setMessage("PDF를 저장할 수 없습니다. 다시 시도하거나 아래 공단 지침의 별지 서식을 이용하세요.");
    } finally { setBusy(false); }
  }
  return <Card title="지원금 신청과 포인트 사용">
    <Field label="무엇을 하시겠어요?"><select value={current} disabled={busy} onChange={e => { setTask(e.target.value); setMessage(""); }}>{available.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
    {current === "points" && <>
      <p>공단에 적립된 포인트를 조회한 뒤 지정 온라인몰에서 사용할 수 있습니다.</p>
      {managed && <p><strong>진료비에 쓰려면</strong> 본인이 등록된 참여의원 수납창구에서 “건강생활실천지원금 포인트로 결제할게요”라고 말씀하세요. 의원이 잔액을 조회해 차감하므로 별도 환급 신청서를 쓸 필요가 없습니다.</p>}
      <OfficialLink href={nhis.points}>공단에서 포인트 조회·전환</OfficialLink>
    </>}
    {current === "apply" && <>
      {managed && <label className="gym-check"><input type="checkbox" checked={minor} onChange={e => {setMinor(e.target.checked);setMessage("");}} disabled={busy}/> 신청인이 만 14세 미만입니다</label>}
      <Field label="신청 방법"><select disabled={child || busy} value={route} onChange={e => {setMethod(e.target.value);setMessage("");}}>{routes.filter(([key]) => managed || key !== "clinic").map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      {child && <p>만 14세 미만 관리형은 법정대리인이 공단 지사를 방문해 신청합니다.</p>}
      {route === "fax" && <p>팩스는 65세 이상이거나 스마트폰 또는 본인 명의 휴대전화가 없는 분이 이용할 수 있습니다.</p>}
      {route === "clinic" && <p>65세 이상이거나 스마트폰이 없는 관리형 회원은 케어플랜을 수립한 참여의원에 신청을 위임할 수 있습니다.</p>}
      <ul>{applicationChecklist(type,route,child).map(item => <li key={item}>{item}</li>)}</ul>
      {route === "online" ? <OfficialLink href={nhis.apply}>공단에서 본인인증·참여 신청</OfficialLink> :
        <label className="gym-check"><input type="checkbox" checked={assessment} disabled={busy} onChange={e => {setAssessment(e.target.checked);setMessage("");}}/>선택 서류인 건강정보 이해능력 평가서도 포함</label>}
    </>}
    {current === "program" && <p>공단 운영 프로그램은 확인서를 생략할 수 있습니다. 그 외 인정 프로그램은 발급기관이 이수 내용과 직인을 작성한 별지 5호를 공단 지사에 제출하세요. 인정기관 직인이 있는 수료증으로도 대체할 수 있습니다.</p>}
    {current === "conversion" && <p>이미 참여 중인 관리형 회원 중 65세 이상 또는 스마트폰이 없어 지사·팩스·의원을 통해 신청한 분 등을 위한 서류입니다. 별지 7호에 서명 후 신분증 사본과 함께 지사에 방문하거나 팩스로 제출하세요. 방문 시 신분증을 확인하면 사본을 생략할 수 있습니다. 신청 후 1,000점 이상이 될 때마다 건강실천카드로 전환됩니다.</p>}
    {paper && <form onSubmit={download}>
      <fieldset disabled={busy} className="gym-form-fieldset">
        <legend>PDF에 넣을 정보</legend>
        <Field label="신청인 성명"><input autoComplete="name" required maxLength={40} value={data.name} onChange={e => edit("name",e.target.value)}/></Field>
        {kind !== "program" && <>
          <Field label="휴대전화번호"><input type="tel" autoComplete="tel" maxLength={24} value={data.phone} onChange={e => edit("phone",e.target.value)}/></Field>
          <Field label="주소"><input autoComplete="street-address" maxLength={120} value={data.address} onChange={e => edit("address",e.target.value)}/></Field>
        </>}
        {current === "apply" && route === "clinic" && <Field label="위임하는 회원의 생년월일"><input type="date" value={data.birth} onChange={e => edit("birth",e.target.value)}/></Field>}
        <p>성명을 확인해 주세요. 연락처나 주소는 출력 후 적어도 됩니다. 주민등록번호가 필요한 칸, 동의 표시, 작성일 및 서명은 제출자가 직접 작성합니다.</p>
        <button className="gym-button" type="submit" disabled={busy || !data.name.trim()}>{busy ? "PDF 만드는 중…" : "작성된 서류 PDF 저장"}</button>
      </fieldset>
      <Notice>{message}</Notice>
    </form>}
    <p><a className="gym-text-link" href={nhis.guide} target="_blank" rel="noreferrer">공단 지침·원본 서식 ↗</a> · <a href="tel:15771000">지사·팩스 문의 1577-1000</a></p>
  </Card>;
}
