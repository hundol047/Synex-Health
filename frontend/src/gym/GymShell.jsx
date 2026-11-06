import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarDays,
  HeartHandshake,
  ScanLine,
  PersonStanding,
  House,
  ArrowUpRight,
  Settings,
} from "lucide-react";
import { COACH_BUILD } from "./store.js";
import "./gym.css";
const coachLinks = [
  ["/coach", "대시보드", LayoutDashboard],
  ["/coach/members", "회원 관리", Users],
  ["/coach/plan", "운동 계획", Dumbbell],
  ["/coach/schedule", "PT 스케줄", CalendarDays],
  ["/coach/feedback", "식단·피드백", HeartHandshake],
  ["/coach/benefits", "지원금 안내", ScanLine],
  ["/coach/sharing", "공유 센터", ArrowUpRight],
];
const memberLinks = [
  ["/health", "오늘", House],
  ["/health/my-plan", "내 운동", Dumbbell],
  ["/health/body", "내 몸", PersonStanding],
  ["/health/benefits", "건강 혜택", HeartHandshake],
  ["/health/coaching", "코칭", Users],
];
export default function GymShell({ children }) {
  const { pathname } = useLocation();
  const coach = pathname.startsWith("/coach");
  const links = coach ? coachLinks : memberLinks;
  return (
    <div className={"gym-shell " + (coach ? "gym-coach" : "gym-member")}>
      <aside className="gym-sidebar">
        <NavLink className="gym-brand" to={coach ? "/coach" : "/health"}>
          <span className="gym-brand-mark">S</span>
          <span>
            Synex Health
            <small>{coach ? "COACH WORKSPACE" : "MOVE WITH YOUR COACH"}</small>
          </span>
        </NavLink>
        <div className="gym-space-label">
          {coach ? "트레이너 워크스페이스" : "나의 트레이닝 공간"}
        </div>
        <nav aria-label="주 메뉴">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/coach" || to === "/health"}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="gym-side-bottom">
          <span className="gym-status-dot" />
          기기에 안전하게 저장
          <NavLink to={coach ? "/coach/sharing" : "/health/sharing"}>
            공유·가져오기 <ArrowUpRight size={15} />
          </NavLink>
          {!coach && (
            <NavLink to="/health/profile">
              <Settings size={15} />내 정보·운동 설정
            </NavLink>
          )}
        </div>
      </aside>
      <div className="gym-content">
        <header className="gym-top">
          <div className="gym-top-brand">
            <span>S</span>Synex {coach ? "Coach" : "Member"}
          </div>
          <NavLink
            to={coach ? "/coach/sharing" : "/health/sharing"}
            className="gym-pill"
          >
            {coach ? "계획·기록 공유" : "트레이너와 연결"}{" "}
            <ArrowUpRight size={14} />
          </NavLink>
        </header>
        <main className="gym-main">{children}</main>
      </div>
      <nav className="gym-mobile-nav" aria-label="하단 메뉴">
        {(coach ? coachLinks.slice(0, 5) : links).map(([to, label, Icon]) => (
          <NavLink to={to} key={to} end={to === "/coach" || to === "/health"}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
