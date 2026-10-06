import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import NativeServerSetup from '../src/shared/components/NativeServerSetup.jsx';
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}));
vi.mock('../src/shared/lib/api.js',()=>({BASE:''}));
it('does not mount login when a native APK has no server',()=>{
 render(<NativeServerSetup><p>Login mounted</p></NativeServerSetup>);
 expect(screen.getByRole('heading',{name:'서버 연결이 필요합니다'})).toBeTruthy();
 expect(screen.queryByText('Login mounted')).toBeNull();
});
it('does not save an HTML frontend URL as the API server',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>{throw Error('HTML');}});
 try{
  localStorage.removeItem('synex-server-origin-v1');
  render(<NativeServerSetup/>);
  fireEvent.change(screen.getByLabelText('Synex Health API 서버 주소'),{target:{value:'https://health.test'}});
  fireEvent.click(screen.getByRole('button',{name:'서버 확인 · 연결'}));
  expect((await screen.findByRole('alert')).textContent).toContain('API 대신');
  expect(localStorage.getItem('synex-server-origin-v1')).toBeNull();
 }finally{fetch.mockRestore();}
});
