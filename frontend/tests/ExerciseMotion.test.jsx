import React from 'react';
import { describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import ExerciseMotion from '../src/health/components/exercise/ExerciseMotion.jsx';
import { MOTIONS,samplePose } from '../src/health/components/exercise/motions.js';
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
