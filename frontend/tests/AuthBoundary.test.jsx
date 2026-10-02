import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import AuthBoundary from '../src/shared/components/AuthBoundary.jsx';
import {api} from '../src/shared/lib/api.js';
vi.mock('../src/shared/lib/api.js',()=>({BASE:'',getDemoUser:()=>'',api:vi.fn()}));
vi.mock('../src/shared/lib/offline.js',()=>({bindOfflineAccount:vi.fn(),offlineState:()=>({})}));
beforeEach(()=>{
 sessionStorage.clear();history.replaceState({},'','/health');
 api.mockImplementation(async path=>{
  if(path==='/api/health/status')return {demo:false};
  if(path==='/api/health/profile')throw Object.assign(Error('Unauthorized'),{status:401});
  if(path==='/api/auth/config')return {configured:false,provider:null};
  if(path==='/api/auth/schools')return [];
 });
});
it('disables login and explains missing configuration',async()=>{
 render(<AuthBoundary><p>Private records</p></AuthBoundary>);
 const login=await screen.findByRole('button',{name:'로그인 · 회원가입'});
 expect(login.disabled).toBe(true);
 expect(screen.getByRole('status').textContent).toContain('연결을 준비 중');
 expect(screen.queryByText('Private records')).toBeNull();
});
it('can retry when public configuration fails to load',async()=>{
 const normal=api.getMockImplementation();let fail=true;
 api.mockImplementation(path=>{if(path==='/api/auth/config'&&fail)return Promise.reject(Error('offline'));return normal(path);});
 render(<AuthBoundary/>);
 const retry=await screen.findByRole('button',{name:'다시 불러오기'});
 fail=false;fireEvent.click(retry);
 await waitFor(()=>expect(screen.queryByText(/설정을 불러오지 못했습니다/)).toBeNull());
});
it('shows a recoverable error for a callback without a transaction',async()=>{
 history.replaceState({},'','/auth/callback?code=invalid&state=bad');
 render(<AuthBoundary/>);
 expect((await screen.findByRole('alert')).textContent).toContain('유효하지 않습니다');
 expect(location.pathname).toBe('/health');
});
