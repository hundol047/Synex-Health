import PendingWorkouts from './PendingWorkouts.jsx';
import { useAuth } from './AuthBoundary.jsx';
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, PersonStanding, GitCompare, Dumbbell, ClipboardList, TrendingUp, MessageCircle, User, Users, Crown } from 'lucide-react';
import {offlineState} from '../lib/offline.js';
import { getDemoUser, setDemoUser, syncPendingWorkouts } from '../lib/api.js';

const STUDENT_NAV = [
  { to: '/health', label: '홈', icon: Home, end: true },
  { to: '/health/body', label: '내 몸 보기', icon: PersonStanding },
  { to: '/health/comparison', label: '비교', icon: GitCompare },
  { to: '/health/routine', label: '루틴', icon: Dumbbell },
  { to: '/health/workout', label: '운동기록', icon: ClipboardList },
  { to: '/health/progress', label: '변화 추적', icon: TrendingUp },
  { to: '/health/agent', label: '건강 코치', icon: MessageCircle },
  { to: '/health/subscription', label: '멤버십', icon: Crown },
  { to: '/health/profile', label: '프로필', icon: User },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [offline,setOffline]=useState(offlineState()),[syncError,setSyncError]=useState(''),[cached,setCached]=useState(false);
  const [online,setOnline] = useState(navigator.onLine);
  useEffect(()=>{
    const update=()=>{setOnline(navigator.onLine);if(navigator.onLine)syncPendingWorkouts().then(()=>{setSyncError('');setCached(false);}).catch(()=>setSyncError('미전송 기록이 있습니다. 연결·로그인 상태를 확인한 후 다시 시도하세요.'));};
    const pending=()=>setOffline(offlineState()),cache=()=>setCached(true);
    window.addEventListener('synex-offline-change',pending);window.addEventListener('synex-cache-used',cache);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    update();
    let back;
    const ready=Capacitor.getPlatform()==='android' ? import('@capacitor/app').then(({App})=>App.addListener('backButton',({canGoBack})=>{if(canGoBack)history.back();else App.minimizeApp();})).then(h=>{back=h;}) : Promise.resolve();
    return()=>{window.removeEventListener('synex-offline-change',pending);window.removeEventListener('synex-cache-used',cache);window.removeEventListener('online',update);window.removeEventListener('offline',update);ready.then(()=>back?.remove());};
  },[]);
  const auth = useAuth();
  const demoUser = getDemoUser();
  const isAdmin = auth.demo ? demoUser==='admin-demo' : auth.role==='admin';
  const isCounselor = auth.demo ? demoUser === 'counselor-demo' : ['counselor','admin'].includes(auth.role);

  async function switchRole(id) {
    if(offlineState().pending&&!window.confirm('미전송 기록을 삭제하고 데모 계정을 바꿀까요?'))return;
    await setDemoUser(id);
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
      <main className="health-main">{!online && <div className="card" role="status">오프라인입니다. 열었던 화면을 표시합니다. 저장한 운동 기록은 기기에 암호화 보관하며, 연결 복구 또는 재로그인 후 전송합니다.</div>}{cached&&<p role="status">저장된 화면을 표시 중입니다. 최신 정보가 아닐 수 있습니다.</p>}{syncError&&<p role="status">{syncError}</p>}<PendingWorkouts state={offline}/><NavLink to="/health/diagnostics">기기 진단</NavLink>{children}</main>
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
