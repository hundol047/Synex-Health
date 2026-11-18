import React from 'react';
import { describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { reportUnavailableRenderer } from '../src/health/components/exercise/exerciseDisplay.js';
import MotionFigure from '../src/health/components/exercise/MotionFigure.jsx';
import ExerciseMotion from '../src/health/components/exercise/ExerciseMotion.jsx';
import { MOTIONS,armMachinePivot,samplePose } from '../src/health/components/exercise/motions.js';
import { resolveBodyProfile } from '../src/health/components/body3d/bodyProfiles.js';

vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:({progress})=> <div data-testid="motion-render" data-progress={progress}>3D 시범</div>}));

describe('motion guidance',()=>{
  it('has finite, moving poses for every backend catalogue entry',()=>{
    const catalog=readFileSync('../backend/app/health/exercise_catalog.py','utf8');
    const ids=[...catalog.matchAll(/movement\('([^']+)'/g)].map(m=>m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(40);
    for(const id of ids){
      expect(MOTIONS[id]).toBeTruthy();
      const a=samplePose(id,0), b=samplePose(id,.31);
      expect(a).not.toEqual(b);
      expect(b.flat().every(Number.isFinite)).toBe(true);
    }
  });
  it.each(['leg_extension','seated_leg_curl'])('keeps %s knees fixed and the pad on the working side throughout a rep', id => {
    const exercise={motion_id:id,exercise_name:id};
    const {container,rerender}=render(<MotionFigure exercise={exercise}/>);
    const rest=samplePose(id,0);
    for(const phase of [0,.125,.25,.375,.5,.75,1]){
      rerender(<MotionFigure exercise={exercise} progress={phase}/>);
      const points=samplePose(id,phase);
      for(const [knee,ankle] of [[7,8],[9,10]]){
        const [x,y]=rest[knee];
        expect(points[knee]).toEqual([x,y]);
        const length=p=>Math.hypot(p[ankle][0]-x,p[ankle][1]-y);
        expect(length(points)).toBeCloseTo(length(rest),8);
      }
      const [x,y]=points[7], dx=points[8][0]-x, dy=points[8][1]-y;
      const roller=container.querySelector('[data-machine-roller]').getAttribute('transform');
      const [rx,ry]=roller.slice(10,-1).split(' ').map(Number);
      const side=((rx-x)*dy-(ry-y)*dx)/Math.hypot(dx,dy);
      expect(side).toBeCloseTo(id==='leg_extension'?13:-13,8);
    }
  });
  it.each(['lat_pulldown','cable_pushdown','cable_face_pull'])('connects both cable grips to the wrists during %s', id => {
    const exercise={motion_id:id,exercise_name:id};
    const {container,rerender}=render(<MotionFigure exercise={exercise}/>);
    for(const phase of [0,.25,.5,.75,1]){
      rerender(<MotionFigure exercise={exercise} progress={phase}/>);
      const pose=samplePose(id,phase);
      const grips=Array.from(container.querySelectorAll('[data-cable-grip]'),node=>
        ['cx','cy'].map(key=>Number(node.getAttribute(key))));
      expect(grips).toEqual([pose[4],pose[6]]);
    }
  });
  it.each(['machine_chest_press','machine_row'])('maintains both arm lengths and the handle arcs during %s', id => {
    const exercise={motion_id:id,exercise_name:id};
    const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
    const first=samplePose(id,0);
    const {container,rerender}=render(<MotionFigure exercise={exercise}/>);
    for(const phase of [0,.125,.25,.375,.5,.625,.75,.875,1]){
      const p=samplePose(id,phase);
      rerender(<MotionFigure exercise={exercise} progress={phase}/>);
      for(const wrist of [4,6]){
        const pivot=armMachinePivot(id,wrist);
        const handle=container.querySelector(`[data-handle="${wrist}"]`);
        expect(handle.getAttribute('transform')).toBe(`translate(${p[wrist][0]} ${p[wrist][1]})`);
        expect(distance(p[wrist],pivot)).toBeCloseTo(distance(first[wrist],pivot),7);
        expect(distance(p[1],p[wrist-1])).toBeCloseTo(56,7);
        expect(distance(p[wrist-1],p[wrist])).toBeCloseTo(56,7);
      }
    }
    expect(container.querySelector(id==='machine_row'?'[data-support="chest"]':'[data-support="back"]')).toBeTruthy();
  });
  it('follows both outer knees with the hip abduction pads while the seat and grips stay fixed', () => {
    const id='machine_hip_abduction', exercise={motion_id:id,exercise_name:id};
    const {container,rerender}=render(<MotionFigure exercise={exercise}/>);
    const start=samplePose(id,0);
    for(const phase of [0,.25,.5,.75,1]){
      const p=samplePose(id,phase);
      rerender(<MotionFigure exercise={exercise} progress={phase}/>);
      for(const knee of [7,9]){
        const pad=container.querySelector(`[data-knee-pad="${knee}"]`);
        expect(Number(pad.getAttribute('x'))+5-p[knee][0]).toBeCloseTo(knee===7?-13:13);
        expect(Number(pad.getAttribute('y'))+12).toBeCloseTo(p[knee][1]);
      }
      for(const anchor of [2,4,6])expect(p[anchor]).toEqual(start[anchor]);
    }
  });
  it('starts paused, supports scrub, playback, speed and reset',()=>{
    render(<ExerciseMotion exercise={{motion_id:'squat',exercise_name:'스쿼트',instructions:['천천히 앉습니다.'],cautions:[]}}/>);
    fireEvent.click(screen.getByText('2D 안내 보기'));
    expect(screen.getByRole('img',{name:'스쿼트 동작 시범'})).toBeTruthy();
    fireEvent.change(screen.getByLabelText('동작 구간'),{target:{value:50}});
    expect(screen.getByLabelText('동작 구간').value).toBe('50');
    fireEvent.click(screen.getByText('동작 재생'));
    expect(screen.getByText('일시정지')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('재생 속도'),{target:{value:.5}});
    fireEvent.click(screen.getByLabelText('처음 자세로'));
    expect(screen.getByLabelText('동작 구간').value).toBe('0');
    expect(screen.getByText('동작 재생')).toBeTruthy();
    fireEvent.click(screen.getByText('3D 안내 보기'));
  });
  it('remembers an explicit 2D choice after closing a demonstration',()=>{
    const view=id=><ExerciseMotion exercise={{motion_id:id,exercise_name:id}}/>;
    const first=render(view('squat'));
    fireEvent.click(screen.getByText('2D 안내 보기'));
    first.unmount();
    render(view('leg_press'));
    expect(screen.getByRole('img',{name:'leg_press 동작 시범'})).toBeTruthy();
    fireEvent.click(screen.getByText('3D 안내 보기'));
    expect(screen.getByText('3D 시범')).toBeTruthy();
  });
  it('keeps a rendering failure temporary and allows an explicit retry on the next exercise',()=>{
    const before=localStorage.getItem('synex-exercise-demo-dimension');
    const first=render(<ExerciseMotion exercise={{motion_id:'squat',exercise_name:'스쿼트'}}/>);
    act(()=>reportUnavailableRenderer());
    first.unmount();
    render(<ExerciseMotion exercise={{motion_id:'leg_press',exercise_name:'레그 프레스'}}/>);
    expect(screen.getByRole('img',{name:'레그 프레스 동작 시범'})).toBeTruthy();
    expect(localStorage.getItem('synex-exercise-demo-dimension')).toBe(before);
    fireEvent.click(screen.getByText('3D 다시 시도'));
    expect(screen.getByText('3D 시범')).toBeTruthy();
  });
  it('does not invent motion for unknown legacy exercises',()=>{
    render(<ExerciseMotion exercise={{motion_id:'unknown',exercise_name:'unknown'}}/>);
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('ties labelled movement steps to the scrubbed cycle and resets on exercise changes',()=>{
    const {rerender}=render(<ExerciseMotion exercise={{motion_id:'squat',exercise_name:'스쿼트',instructions:['천천히 앉습니다.'],cautions:[]}}/>);
    fireEvent.click(screen.getByRole('button',{name:'깊이·무릎 방향 확인 구간 보기'}));
    expect(screen.getByLabelText('동작 구간').value).toBe('43');
    expect(screen.getByRole('button',{name:'깊이·무릎 방향 확인 구간 보기'}).getAttribute('aria-current')).toBe('step');
    fireEvent.change(screen.getByLabelText('동작 구간'),{target:{value:80}});
    expect(screen.getByRole('button',{name:'바닥을 밀어 일어나기 구간 보기'}).getAttribute('aria-current')).toBe('step');
    fireEvent.click(screen.getByRole('button',{name:'동작 재생'}));
    rerender(<ExerciseMotion exercise={{motion_id:'leg_press',exercise_name:'레그 프레스',instructions:['발판을 확인합니다.'],cautions:[]}}/>);
    expect(screen.getByLabelText('동작 구간').value).toBe('0');
    expect(screen.getByRole('button',{name:'동작 재생'})).toBeTruthy();
    expect(screen.getByText('3D 시범')).toBeTruthy();
  });
  it('restarts a completed cycle and allows step selection within the second alternating side',()=>{
    render(<ExerciseMotion exercise={{motion_id:'lunge',exercise_name:'런지',instructions:[],cautions:[]}}/>);
    fireEvent.change(screen.getByLabelText('동작 구간'),{target:{value:75}});
    fireEvent.click(screen.getByRole('button',{name:'준비 구간 보기'}));
    expect(screen.getByLabelText('동작 구간').value).toBe('50');
    fireEvent.change(screen.getByLabelText('동작 구간'),{target:{value:100}});
    fireEvent.click(screen.getByRole('button',{name:'동작 재생'}));
    expect(screen.getByLabelText('동작 구간').value).toBe('0');
    expect(screen.getByRole('button',{name:'일시정지'})).toBeTruthy();
  });
  it('honours the workout pause and resumes only after another explicit play action',()=>{
    const exercise={motion_id:'squat',exercise_name:'스쿼트',instructions:[],cautions:[]};
    const {rerender}=render(<ExerciseMotion exercise={exercise}/>);
    fireEvent.click(screen.getByRole('button',{name:'동작 재생'}));
    rerender(<ExerciseMotion exercise={exercise} paused/>);
    expect(screen.getByRole('button',{name:'동작 재생'}).disabled).toBe(true);
    rerender(<ExerciseMotion exercise={exercise}/>);
    expect(screen.getByRole('button',{name:'동작 재생'}).disabled).toBe(false);
    expect(screen.queryByRole('button',{name:'일시정지'})).toBeNull();
  });
  it('renders each 30 fps interval on a 60 Hz display without discarding the interval remainder',()=>{
    let nextFrame;
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{nextFrame=callback;return 1;});
    const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
    const {unmount}=render(<ExerciseMotion exercise={{motion_id:'squat',exercise_name:'스쿼트',instructions:[],cautions:[]}}/>);
    try {
      fireEvent.click(screen.getByRole('button',{name:'동작 재생'}));
      for(const time of [0,16.667,33.334])act(()=>nextFrame(time));
      const first=Number(screen.getByTestId('motion-render').dataset.progress);
      expect(first).toBeGreaterThan(0);
      act(()=>nextFrame(50.001));
      expect(Number(screen.getByTestId('motion-render').dataset.progress)).toBe(first);
      act(()=>nextFrame(66.668));
      expect(Number(screen.getByTestId('motion-render').dataset.progress)).toBeCloseTo(first*2,6);
    } finally { unmount();raf.mockRestore();cancel.mockRestore(); }
  });
});

describe('human body profiles',()=>{
  it('has distinct male and female morphology and a neutral fallback',()=>{
    const male=resolveBodyProfile('male'),female=resolveBodyProfile('female');
    expect(male.shoulder).toBeGreaterThan(female.shoulder);
    expect(female.hip).toBeGreaterThan(male.hip);
    expect(resolveBodyProfile(undefined).label).toContain('중립');
  });
});
