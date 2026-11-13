import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { planPeriod } from "./workflow.js";
export default function PlanPeriodNotice({ plan }) {
  const p = planPeriod(plan);
  if (p.kind === "none") return null;
  return (
    <div className={"gym-period-notice " + p.kind}>
      <CalendarDays size={20} />
      <div>
        <strong>
          {p.kind === "current"
            ? "이번 주 트레이너 계획"
            : p.kind === "past"
              ? "지난 기간의 운동 계획"
              : "미리 받은 다음 계획"}
        </strong>
        <p>
          {p.label} ·{" "}
          {p.kind === "current"
            ? `주 ${plan.frequency}회 · 내 일정과 컨디션에 맞게 이어가세요.`
            : p.kind === "past"
              ? "최신 계획을 가져오거나, 담당 트레이너와 확인한 뒤 이 구성을 사용하세요."
              : "해당 기간이 시작되기 전에도 구성을 살펴볼 수 있어요."}
        </p>
      </div>
      {p.kind === "past" && (
        <Link to="/health/sharing">
          최신 계획 확인
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}
