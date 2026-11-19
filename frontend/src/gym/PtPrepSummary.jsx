import React from "react";
import { Link } from "react-router-dom";
import { appointmentStatus, dateKey } from "./workflow.js";

export default function PtPrepSummary({ member, now }) {
  const day = dateKey(now);
  const previous = member.appointments.filter(a => appointmentStatus(a, now) === "ended")
    .map(a => a.date).sort().at(-1);
  const records = member.logs.filter(l => l.date <= day && (!previous || l.date > previous))
    .sort((a, b) => b.date.localeCompare(a.date));
  const partial = records.find(l => l.exerciseResults?.some(e => e.completed.length < e.sets));
  const unfinished = partial?.exerciseResults.find(e => e.completed.length < e.sets);
  const hard = records.find(l => l.effort === "힘들었어요");
  const weights = Object.entries(member.dailyWeights ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const last = weights.at(-1);
  const waiting = member.logs.filter(log => log.question && !log.feedback).length;
  return <section className="gym-prep-summary" aria-label="PT 준비 요약">
    <h3>PT 준비 요약</h3>
    <p>{previous ? previous + " PT 예정일 다음 날부터" : "지금까지"} · 공유된 운동 {new Set(records.map(l => l.date)).size}일</p>
    {waiting > 0 && <p><Link className="gym-text-link" to={"/coach/feedback?member=" + encodeURIComponent(member.id) + "&questions=pending"}>
      답변할 운동 질문 {waiting}건 보기
    </Link></p>}
    {unfinished && <p>미완료 동작 · {partial.date} {unfinished.name} ({unfinished.completed.length}/{unfinished.sets}세트 수행)</p>}
    {hard && <p>힘들었다고 남긴 운동 · {hard.date} {hard.name}</p>}
    <p>{last ? "최근 공유 체중 · " + last[1].toFixed(1) + " kg (" + last[0] + ")" : "아직 회원이 공유한 체중이 없습니다."}</p>
    {last && <Link className="gym-text-link" to={"/coach/weight-trend?member=" + encodeURIComponent(member.id)}>체중 변화 그래프 보기</Link>}
  </section>;
}
