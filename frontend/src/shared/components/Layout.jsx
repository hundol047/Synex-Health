import { useAuth } from './AuthBoundary.jsx';
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, PersonStanding, GitCompare, Dumbbell, ClipboardList, TrendingUp, MessageCircle, User, Users, Crown } from 'lucide-react';
import { getDemoUser, setDemoUser } from '../lib/api.js';

const STUDENT_NAV = [
  { to: '/health', label: '홈', icon: Home, end: true },
  { to: '/health/body', label: '3D Body', icon: PersonStanding },
  { to: '/health/comparison', label: '비교', icon: GitCompare },
  { to: '/health/routine', label: '루틴', icon: Dumbbell },
  { to: '/health/workout', label: '운동기록', icon: ClipboardList },
  { to: '/health/progress', label: '변화 추적', icon: TrendingUp },
  { to: '/health/agent', label: 'AI 코치', icon: MessageCircle },
  { to: '/health/subscription', label: '멤버십', icon: Crown },
  { to: '/health/profile', label: '프로필', icon: User },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [online,setOnline] = useState(navigator.onLine);
  useEffect(()=>{
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    let back;
    const ready=Capacitor.getPlatform()==='android' ? import('@capacitor/app').then(({App})=>App.addListener('backButton',({canGoBack})=>{if(canGoBack)history.back();else App.minimizeApp();})).then(h=>{back=h;}) : Promise.resolve();
    return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);ready.then(()=>back?.remove());};
  },[]);
  const auth = useAuth();
  const demoUser = getDemoUser();
  const isAdmin = auth.demo ? demoUser==='admin-demo' : auth.role==='admin';
  const isCounselor = auth.demo ? demoUser === 'counselor-demo' : ['counselor','admin'].includes(auth.role);

  function switchRole(id) {
    setDemoUser(id);
    navigate(id==='admin-demo'?'/health/admin':id === 'counselor-demo' ? '/health-center' : '/health');
    window.location.reload();
  }

  const nav = isAdmin ? [{to:'/health/admin',label:'관리자',icon:Users,end:true}] : isCounselor ? [{ to: '/health-center', label: '학생 관리', icon: Users, end: true }] : STUDENT_NAV;

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
        {auth.demo ? <div className="health-role-switch" role="tablist" aria-label="데모 역할 전환">
          <button className={!isCounselor&&!isAdmin ? 'active' : ''} onClick={() => switchRole('student-jimin')}>학생</button>
          <button className={isCounselor&&!isAdmin ? 'active' : ''} onClick={() => switchRole('counselor-demo')}>상담사</button><button className={isAdmin?'active':''} onClick={()=>switchRole('admin-demo')}>관리자</button>
        </div> : <button className="btn btn-ghost" onClick={auth.logout}>로그아웃</button>}
      </header>
      <main className="health-main">{!online && <div className="card" role="status">인터넷 연결이 끊겼습니다. 기록 저장·구독 확인은 연결 후 다시 시도해 주세요.</div>}{children}</main>
      <nav className="health-bottom-nav" aria-label="모바일 메뉴">
        {(isCounselor||isAdmin ? nav : nav.filter(item => ['/health','/health/body','/health/routine','/health/subscription','/health/profile'].includes(item.to))).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
