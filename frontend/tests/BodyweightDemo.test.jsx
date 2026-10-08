import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act,waitFor,cleanup} from '@testing-library/react';
import BodyweightDemo from '../src/health/components/exercise/BodyweightDemo.jsx';

vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:({progress})=><output data-testid="demo-progress">{progress}</output>}));

let frames,frameId;
beforeEach(()=>{
 frames=new Map();frameId=0;
 vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{frames.set(++frameId,callback);return frameId;}));
 vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frames.delete(id)));
 vi.spyOn(document,'hidden','get').mockReturnValue(false);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
function frame(time){
 const [id,callback]=frames.entries().next().value;
 frames.delete(id);
 act(()=>callback(time));
}

it('gives the plank a breathing demo with a stable hold cue and an effective pause control',async()=>{
 render(<BodyweightDemo exerciseId="plank"/>);
 await screen.findByTestId('demo-progress');
 frame(0);frame(80);
 expect(Number(screen.getByTestId('demo-progress').textContent)).toBeGreaterThan(0);
 expect(screen.getByLabelText('현재 시범 안내').textContent).toContain('유지 · 호흡');
 fireEvent.click(screen.getByRole('button',{name:'운동 시범 일시정지'}));
 expect(frames.size).toBe(0);
 fireEvent.click(screen.getByRole('button',{name:'운동 시범 재생'}));
 await waitFor(()=>expect(frames.size).toBe(1));
});

it('starts still for reduced motion and stops the demo when the page is hidden',async()=>{
 vi.spyOn(window,'matchMedia').mockReturnValue({matches:true});
 render(<BodyweightDemo exerciseId="plank"/>);
 await screen.findByTestId('demo-progress');
 expect(frames.size).toBe(0);
 fireEvent.click(screen.getByRole('button',{name:'운동 시범 재생'}));
 await waitFor(()=>expect(frames.size).toBe(1));
 vi.spyOn(document,'hidden','get').mockReturnValue(true);
 fireEvent(document,new Event('visibilitychange'));
 expect(frames.size).toBe(0);
});

it('keeps 24 evenly scheduled updates on a 60 Hz display without accumulating render delay',async()=>{
 render(<BodyweightDemo exerciseId="squat"/>);
 const progress=await screen.findByTestId('demo-progress');
 frame(0);
 let updates=0,previous=progress.textContent;
 for(let tick=1;tick<=120;tick++){
  frame(tick*1000/60);
  if(progress.textContent!==previous){updates++;previous=progress.textContent;}
 }
 expect(updates).toBe(48);
 expect(Number(progress.textContent)).toBeCloseTo(.25,6);
});
