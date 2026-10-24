import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {mockFetch} from './helpers.js';
vi.mock('../src/health/components/body3d/BodyScene.jsx',()=>({default:()=> <div data-testid="body-scene-mock"/>}));
import CounselorDashboardPage from '../src/health/pages/CounselorDashboardPage.jsx';
it.each([true,false])('renders the roster and selected detail with measurement=%s',async measured=>{
 const fetch=mockFetch({
 '/api/counselor/students/s1':{user:{id:'s1',name:'김지민'},current_measurement:measured?{id:'m1'}:null,comparison:measured?{reference_comparison:{},segment_deltas:[],left_right_balance:{}}:null,latest_analysis:measured?{summary:'상세 분석'}:null,routines:[],workouts:[],counselor_notes:[{id:'note',note:'이전 상담 메모'}]},
 '/api/counselor/students?':[{id:'s1',name:'김지민',latest_measurement_date:measured?'2026-10-01':null,skeletal_muscle_mass:measured?25:null,routine_completion_percent:11.1}]});
 render(<MemoryRouter><CounselorDashboardPage/></MemoryRouter>);
 const table=await screen.findByRole('table');expect(within(table).getByText('김지민')).toBeTruthy();
 if(!measured)expect(within(table).getByText('측정되지 않음')).toBeTruthy();
 fireEvent.click(within(table).getByRole('button',{name:'상세보기'}));
 expect(await screen.findByText('김지민 상세')).toBeTruthy();expect(screen.getByText('이전 상담 메모')).toBeTruthy();
 expect(fetch.mock.calls.some(([url])=>url==='/api/counselor/students/s1')).toBe(true);
 if(measured)expect(screen.getByText('상세 분석')).toBeTruthy();
 else expect(screen.getByText('비교할 체형 데이터가 아직 없습니다.')).toBeTruthy();
});
