import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, PersonStanding, GitCompare, Dumbbell, ClipboardList, TrendingUp, MessageCircle, User, Users } from 'lucide-react';
import { getDemoUser, setDemoUser } from '../lib/api.js';

const STUDENT_NAV = [
  { to: '/health', label: '홈', icon: Home, end: true },
  { to: '/health/body', label: '3D Body', icon: PersonStanding },
  { to: '/health/comparison', label: '비교', icon: GitCompare },
  { to: '/health/routine', label: '루틴', icon: Dumbbell },
  { to: '/health/workout', label: '운동기록', icon: ClipboardList },
  { to: '/health/progress', label: '변화 추적', icon: TrendingUp },
  { to: '/health/agent', label: 'AI 코치', icon: MessageCircle },
  { to: '/health/profile', label: '프로필', icon: User },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const demoUser = getDemoUser();
  const isCounselor = demoUser === 'counselor-demo';

  function switchRole(id) {
    setDemoUser(id);
    navigate(id === 'counselor-demo' ? '/health-center' : '/health');
    window.location.reload();
  }

  const nav = isCounselor ? [{ to: '/health-center', label: '학생 관리', icon: Users, end: true }] : STUDENT_NAV;

  return (
    <div className="health-shell">
      <header className="health-topbar">
        <div className="health-brand">
          <span className="health-brand-icon">SH</span>
          Synex <span style={{ color: 'var(--blue)' }}>Health</span>
        </div>
        <nav className="health-desktop-nav">
          {nav.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
        </nav>
        <div className="health-role-switch" role="tablist" aria-label="데모 역할 전환">
          <button className={!isCounselor ? 'active' : ''} onClick={() => switchRole('student-jimin')}>학생</button>
          <button className={isCounselor ? 'active' : ''} onClick={() => switchRole('counselor-demo')}>상담사</button>
        </div>
      </header>
      <main className="health-main">{children}</main>
      <nav className="health-bottom-nav">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
