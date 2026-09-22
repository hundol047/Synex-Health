import React from 'react';
import { describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import ExerciseMotion from '../src/health/components/exercise/ExerciseMotion.jsx';
import { MOTIONS,samplePose } from '../src/health/components/exercise/motions.js';
import { resolveBodyProfile } from '../src/health/components/body3d/bodyProfiles.js';

vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:()=> <div>3D 시범</div>}));

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
});

describe('human body profiles',()=>{
  it('has distinct male and female morphology and a neutral fallback',()=>{
    const male=resolveBodyProfile('male'),female=resolveBodyProfile('female');
    expect(male.shoulder).toBeGreaterThan(female.shoulder);
    expect(female.hip).toBeGreaterThan(male.hip);
    expect(resolveBodyProfile(undefined).label).toContain('중립');
  });
});
