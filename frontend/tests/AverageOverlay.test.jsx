import React from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {numericDelta,overlayPositions,interpolatePositions} from '../src/health/components/body3d/overlayMath.js';
import data from '../src/health/components/body3d/assets/human-mesh.json';
import {TemporalPhases} from '../src/health/components/exercise/poseCoach.js';
const {scene}=vi.hoisted(()=>({scene:vi.fn()}));
vi.mock('../src/health/components/body3d/BodyScene.jsx',()=>({default:p=>{scene(p);return <button onClick={()=>p.onSelect('RIGHT_LEG')}>3D 오른다리 선택</button>;}}));
import BodyMapWorkspace from '../src/health/components/body3d/BodyMapWorkspace.jsx';
const fixture={measurement:{height:165,segments:[{segment:'RIGHT_LEG',lean_mass_kg:7.1}]},body_profile:{gender:'female'},average_comparison:{selected_group_id:'g',groups:[{id:'g',metadata:{sex:'female',age_range:[20,24],height_range:[155,165],reference_source:'test',sample_size:100,version:'1'},segments:{RIGHT_LEG:{lean:{reference_value:7.8}}},totals:{}}]}};
beforeEach(()=>scene.mockClear());
it('calculates signed kg/percent without fabricating missing or zero denominators',()=>{expect(numericDelta(7.1,7.8).difference_percent).toBe(-9);expect(numericDelta(8.2,7.4).difference_kg).toBe(.8);expect(numericDelta(null,7).difference_kg).toBeNull();expect(numericDelta(2,0).difference_percent).toBeNull();});
it('two independently deformed surfaces keep identical pose/height and different regional volume',()=>{
 const base=Float32Array.from(data.profiles.female,v=>v*data.scale);
 const a=overlayPositions(base,data.regions,{RIGHT_LEG:7},165),b=overlayPositions(base,data.regions,{RIGHT_LEG:9},165);
 let changed=0;for(let i=0;i<a.length;i+=3){expect(a[i+1]).toBe(b[i+1]);if(data.regions[i/3]===5&&Math.abs(a[i+2]-b[i+2])>.0001)changed++;}
 expect(changed).toBeGreaterThan(100);expect(b.every(Number.isFinite)).toBe(true);
 expect(interpolatePositions(a,b,0)).toEqual(a);expect(interpolatePositions(a,b,1)).toEqual(b);
});
it('renders numeric comparison, legend and same-viewer overlay; toggles opacity and region',async()=>{
 const user=userEvent.setup();render(<MemoryRouter><BodyMapWorkspace comparisonData={fixture}/></MemoryRouter>);
 expect(screen.getByLabelText('레이어 범례')).toBeTruthy();expect(screen.getByText('-0.70')).toBeTruthy();expect(screen.getByText('-9.0')).toBeTruthy();
 let props=scene.mock.lastCall[0];expect(props.overlay.myValues.RIGHT_LEG).toBe(7.1);expect(props.overlay.referenceValues.RIGHT_LEG).toBe(7.8);
 await user.click(screen.getByText('레이어 · 투명도 · 겹쳐보기 설정'));
 const slider=screen.getByLabelText('비교 표면 투명도');await user.click(slider);await user.type(slider,'{ArrowRight}');
 await user.click(screen.getByRole('checkbox',{name:'비교군 평균'}));expect(scene.mock.lastCall[0].overlay.options.showReference).toBe(false);
 await user.click(screen.getByText('3D 오른다리 선택'));expect(scene.mock.lastCall[0].selectedSegment).toBe('RIGHT_LEG');
 expect(within(screen.getByRole('table')).getByText('7.8')).toBeTruthy();
});
it('no reference preserves own viewer and never synthesizes an average',()=>{render(<MemoryRouter><BodyMapWorkspace comparisonData={{...fixture,average_comparison:{groups:[]}}}/></MemoryRouter>);expect(screen.getAllByText(/현재 조건에 맞는 비교군/).length).toBeGreaterThan(0);expect(scene.mock.lastCall[0].overlay).toBeNull();expect(screen.queryByText('7.8')).toBeNull();});
it('temporal phases require stable start, bottom dwell, return, and reject tracking gaps',()=>{
 const coach=new TemporalPhases('squat');const seq=[[170,0],[170,200],[140,400],[105,600],[105,800],[135,1000],[165,1200]];
 const phases=seq.map(([a,t])=>coach.update(a,t,1));expect(phases.map(p=>p.movement_phase)).toEqual(['start','start','eccentric','eccentric','bottom','concentric','completion']);expect(phases.at(-1).reps).toBe(1);
 coach.update(140,1400,1);coach.update(100,1600,1);expect(coach.update(null,1800,0).movement_phase).toBe('unknown');expect(coach.update(170,2000,1).reps).toBe(1);
});
