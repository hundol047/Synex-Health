import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {mockFetch} from './helpers.js';
vi.mock('../src/health/components/body3d/BodyScene.jsx',()=>({default:()=> <div data-testid="body-scene-mock"/>}));
import ComparisonPage from '../src/health/pages/ComparisonPage.jsx';
function setup(previous){
 const measurements=[{id:'m1',measurement_date:'2026-09-01',weight:60,segments:[]},{id:'m2',measurement_date:'2026-10-01',weight:61,segments:[]}];
 mockFetch({'/api/body-map/comparison':{current_measurement_id:'m2',previous_measurement_id:previous,
 reference_comparison:{LEFT_ARM:{status:'below',reference_percent:85}},left_right_balance:{arm:{left_kg:2,right_kg:2.4,diff_percent:-18}},segment_deltas:[{segment:'LEFT_ARM',lean_mass_delta_kg:0.3,fat_mass_delta_kg:-0.1}]},
 '/api/body-composition':measurements,'/api/advanced/body':{measurements,profile:{gender:'female',height:165}}});
 render(<MemoryRouter><ComparisonPage/></MemoryRouter>);
}
it('renders reference, left/right and previous comparison data',async()=>{
 setup('m1');expect(await screen.findByText('기준보다 낮음')).toBeTruthy();expect(screen.getByText('85%')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'좌우 비교'}));expect(screen.getByText('왼쪽 2 kg')).toBeTruthy();expect(screen.getByText('오른쪽 2.4 kg')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'이전 비교'}));expect(screen.getByText('제지방 +0.3kg · 지방 -0.1kg')).toBeTruthy();
 expect(await screen.findAllByTestId('body-scene-mock')).toHaveLength(2);
});
it('shows the empty state for a first measurement',async()=>{
 setup(null);fireEvent.click(await screen.findByRole('button',{name:'이전 비교'}));
 expect(screen.getByText('첫 측정입니다')).toBeTruthy();expect(screen.getByText('비교할 이전 측정 데이터가 아직 없습니다.')).toBeTruthy();
 expect(screen.queryByTestId('body-scene-mock')).toBeNull();
});
