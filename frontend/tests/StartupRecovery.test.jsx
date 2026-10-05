import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import Onboarding from '../src/shared/components/Onboarding.jsx';
import ErrorBoundary from '../src/shared/components/ErrorBoundary.jsx';
it('finishes all intro steps even when local storage is unavailable',()=>{
 const get=vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('storage unavailable');});
 const set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('storage unavailable');});
 try{
  render(<Onboarding><h1>Ready</h1></Onboarding>);
  expect(screen.getByRole('button',{name:'이전'}).disabled).toBe(true);
  for(let i=0;i<6;i++)fireEvent.click(screen.getByRole('button',{name:'다음'}));
  fireEvent.click(screen.getByRole('button',{name:'시작하기'}));
  expect(screen.getByRole('heading',{name:'Ready'})).toBeTruthy();
 }finally{get.mockRestore();set.mockRestore();}
});
it('does not destroy a working screen on a background promise failure',()=>{
 const report=vi.fn();window.addEventListener('synex-diagnostic',report);
 try{
  render(<ErrorBoundary><input aria-label="운동 메모" defaultValue="진행 중 입력"/></ErrorBoundary>);
  fireEvent(window,new Event('unhandledrejection'));
  expect(screen.getByLabelText('운동 메모').value).toBe('진행 중 입력');
  expect(screen.queryByText('화면을 다시 불러와 주세요.')).toBeNull();
  expect(report).toHaveBeenCalled();
 }finally{window.removeEventListener('synex-diagnostic',report);}
});
