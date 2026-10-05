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
it('school outage does not disable a configured general login',async()=>{
 const normal=api.getMockImplementation();
 api.mockImplementation(path=>{
  if(path==='/api/auth/config')return Promise.resolve({provider:{issuer:'https://id.test/',client_id:'web'}});
  if(path==='/api/auth/schools')return Promise.reject(Error('school unavailable'));
  return normal(path);
 });
 render(<AuthBoundary/>);
 const login=await screen.findByRole('button',{name:'로그인 · 회원가입'});
 await waitFor(()=>expect(login.disabled).toBe(false));
 expect(screen.getByRole('alert').textContent).toContain('학교 로그인');
 expect(screen.getByRole('checkbox').checked).toBe(false);
});
it('general outage does not disable a connected school',async()=>{
 const normal=api.getMockImplementation();
 api.mockImplementation(path=>{
  if(path==='/api/auth/config')return Promise.reject(Error('general unavailable'));
  if(path==='/api/auth/schools')return Promise.resolve([{school_id:'학교 A',issuer:'https://id.test/',client_id:'school'}]);
  return normal(path);
 });
 render(<AuthBoundary/>);
 fireEvent.change(await screen.findByRole('combobox'),{target:{value:'학교 A'}});
 expect((await screen.findByRole('button',{name:'학교 계정으로 로그인'})).disabled).toBe(false);
});
it.each([true,false])('exchanges the verified login for a session only when opted in (%s)',async remember=>{
 const {getAccessToken,setAccessToken}=await import('../src/shared/lib/session.js');
 setAccessToken('');
 const callback=location.origin+'/auth/callback';
 sessionStorage.setItem('synex-pkce',JSON.stringify({state:'test-state',created:Date.now(),verifier:'a'.repeat(43),redirect_uri:callback,remember,config:{issuer:'https://id.test/',client_id:'web',redirect_urls:[callback]}}));
 history.replaceState({},'','/auth/callback?code=code&state=test-state');
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,json:async()=>String(url).includes('openid-configuration')?{issuer:'https://id.test/',authorization_endpoint:'https://id.test/authorize',token_endpoint:'https://id.test/token'}:{access_token:'fresh-token'}}));
 const normal=api.getMockImplementation();
 api.mockImplementation(path=>{
  if(path==='/api/auth/session')return Promise.resolve({remembered:remember,expires_in:28800});
  if(path==='/api/health/profile')return Promise.resolve({id:'user',role:'student'});
  return normal(path);
 });
 try{
  render(<AuthBoundary><p>Authenticated content</p></AuthBoundary>);
  await screen.findByText('Authenticated content');
  expect(api).toHaveBeenCalledWith('/api/auth/session',{remember,transport:'web'});
  expect(getAccessToken()).toBe(remember?'':'fresh-token');
  expect(sessionStorage.getItem('synex-pkce')).toBeNull();
 }finally{fetch.mockRestore();setAccessToken('');}
});
it('loads login settings on WebViews without AbortSignal.timeout',async()=>{
 const timeout=AbortSignal.timeout;
 Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true});
 try{
  render(<AuthBoundary/>);
  await screen.findByText(/계정 로그인 연결을 준비 중/);
 }finally{Object.defineProperty(AbortSignal,'timeout',{value:timeout,configurable:true});}
});
