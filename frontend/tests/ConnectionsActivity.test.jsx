import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConnectionsPage from '../src/health/pages/ConnectionsPage.jsx';
vi.mock('../src/shared/lib/api.js',()=>({api:vi.fn(()=>Promise.resolve({status:'not_connected'})),HealthAPI:{}}));
vi.mock('../src/shared/lib/deviceHealth.js',()=>({HEALTH_TYPES:['steps'],healthAvailability:vi.fn(()=>Promise.resolve({available:true,provider:'HealthKit'})),readDeviceHealth:vi.fn(()=>Promise.resolve({status:'read_complete',samples:[{type:'steps',startDate:'2026-10-01T10:00:00',endDate:'2026-10-01T11:00:00',value:100}]}))}));
vi.mock('../src/shared/lib/reminders.js',()=>({setReminders:vi.fn(),registerPush:vi.fn()}));
it('requires separate activity consent and removes the summary on revocation',async()=>{
 const user=userEvent.setup();render(<ConnectionsPage/>);
 await screen.findByText(/HealthKit · 사용 가능/);await user.click(screen.getByRole('checkbox',{name:'걸음 수'}));
 await user.click(screen.getByRole('button',{name:'권한 요청 · 최근 7일 읽기'}));
 await screen.findByText(/불러온 기록 1건/);
 expect(screen.queryByRole('heading',{name:'기기 건강 기록 · 일별 활동 추이'})).toBeNull();
 const consent=screen.getByRole('checkbox',{name:/일별 활동 추이에 반영/});await user.click(consent);
 expect(screen.getByRole('table',{name:/선택한 기기 건강 기록/}).textContent).toContain('100');
 await user.click(consent);expect(screen.queryByRole('table',{name:/선택한 기기 건강 기록/})).toBeNull();
});
