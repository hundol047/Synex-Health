import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import PoseCoachPage from '../src/health/pages/PoseCoachPage.jsx';
import {BODYWEIGHT_EXERCISES} from '../src/health/components/exercise/bodyweightGuide.js';
vi.mock('../src/health/components/exercise/CameraCoaching.jsx',()=>({default:({motion,immersive})=><div data-testid="coach" data-motion={motion} data-immersive={immersive}/> }));
afterEach(cleanup);
it('limits the full phone coaching selector to supported bodyweight exercises',()=>{
 render(<MemoryRouter initialEntries={['/health/pose?motion=shoulder_press']}><PoseCoachPage/></MemoryRouter>);
 expect(screen.getByLabelText('따라 할 운동').value).toBe('squat');expect(screen.getAllByRole('option').map(option=>option.value)).toEqual(Object.keys(BODYWEIGHT_EXERCISES));
 expect(screen.getByTestId('coach').dataset.immersive).toBe('true');expect(screen.getByRole('link',{name:'운동 홈으로 돌아가기'}).getAttribute('href')).toBe('/health');
});
it('switches the selected exercise to a new coaching session',()=>{
 render(<MemoryRouter initialEntries={['/health/pose?motion=plank']}><PoseCoachPage/></MemoryRouter>);
 const coach=screen.getByTestId('coach');
 expect(screen.getByTestId('coach').dataset.motion).toBe('plank');fireEvent.change(screen.getByLabelText('따라 할 운동'),{target:{value:'push_up'}});
 expect(screen.getByTestId('coach').dataset.motion).toBe('push_up');
 expect(screen.getByTestId('coach')).toBe(coach);
});
it('returns to the home route immediately and keeps modified link clicks available to the browser',()=>{
 render(<MemoryRouter initialEntries={['/health/pose?motion=plank']}><Routes><Route path="/health/pose" element={<PoseCoachPage/>}/><Route path="/health" element={<h1>운동 홈</h1>}/></Routes></MemoryRouter>);
 const back=screen.getByRole('link',{name:'운동 홈으로 돌아가기'});
 expect(back.getAttribute('href')).toBe('/health');
 let browserDefaultPreserved=false;
 document.addEventListener('click',event=>{browserDefaultPreserved=!event.defaultPrevented;event.preventDefault();},{once:true});
 fireEvent.click(back,{ctrlKey:true});
 expect(browserDefaultPreserved).toBe(true);expect(screen.getByTestId('coach').dataset.motion).toBe('plank');
 fireEvent.click(back,{button:0});
 expect(screen.getByRole('heading',{name:'운동 홈'})).toBeTruthy();
});
