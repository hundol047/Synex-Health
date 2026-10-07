import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,act,fireEvent} from '@testing-library/react';
const state=vi.hoisted(()=>({bind:vi.fn(),ready:false}));
vi.mock('../src/shared/lib/offline.js',()=>({bindOfflineAccount:state.bind,offlineState:()=>({ready:state.ready})}));
import {DeviceBoundary} from '../src/shared/components/AuthBoundary.jsx';
it('stops indefinite startup, ignores late completion, and retries only into verified storage',async()=>{
 vi.useFakeTimers();let resolve;
 state.ready=false;state.bind.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 try{
  render(<DeviceBoundary><h1>내 기록</h1></DeviceBoundary>);
  await act(async()=>{vi.advanceTimersByTime(20000);});
  expect(screen.getByRole('alert').textContent).toContain('응답이 늦어지고');
  state.ready=true;await act(async()=>resolve());
  expect(screen.queryByRole('heading',{name:'내 기록'})).toBeNull();
  state.bind.mockResolvedValueOnce();
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'기기 저장소 다시 열기'})));
  expect(screen.getByRole('heading',{name:'내 기록'})).toBeTruthy();
 }finally{vi.useRealTimers();}
});
it('does not admit a user when storage initialization rejects',async()=>{
 state.ready=false;state.bind.mockRejectedValueOnce(Error('기기 키 잠김'));
 render(<DeviceBoundary><h1>내 기록</h1></DeviceBoundary>);
 expect((await screen.findByRole('alert')).textContent).toBe('기기 키 잠김');
 expect(screen.queryByRole('heading',{name:'내 기록'})).toBeNull();
});
