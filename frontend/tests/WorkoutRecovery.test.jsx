import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,act,cleanup,renderHook} from '@testing-library/react';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES,recommendStretches} from '../src/health/components/exercise/stretchCatalog.js';
import {poseJoints,REST,BONES} from '../src/health/components/exercise/rig.js';
import {estimateCalories,recordedActiveMinutes} from '../src/health/components/exercise/workoutCalories.js';
import WorkoutResults from '../src/health/components/exercise/WorkoutResults.jsx';
import StretchRecovery from '../src/health/components/exercise/StretchRecovery.jsx';
import useTempoSession from '../src/health/components/exercise/useTempoSession.js';
vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:({motion,progress})=><div data-testid="stretch-model" data-motion={motion} data-progress={progress}/> }));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();Object.defineProperty(document,'hidden',{configurable:true,value:false});});
const exercises=[{exercise_id:'s',motion_id:'squat',exercise_name:'스쿼트',sets:2,reps:'1',rest_seconds:10},{exercise_id:'c',motion_id:'curl',exercise_name:'컬',sets:1,reps:'1',rest_seconds:10}];
it('skips all remaining sets/rest, never creates work time, preserves pause and finishes the last exercise',()=>{
 vi.useFakeTimers();const {result}=renderHook(()=>useTempoSession(exercises));
 act(()=>result.current.start());act(()=>vi.advanceTimersByTime(6100));act(()=>result.current.pause());
 const work=result.current.state.workMs[0];expect(work).toBeGreaterThan(0);expect(work).toBeLessThan(1300);
 act(()=>result.current.skipExercise());expect(result.current.segment).toMatchObject({exerciseIndex:1,kind:'work'});expect(result.current.state.status).toBe('paused');expect(result.current.state.workMs).toEqual({0:work});
 act(()=>result.current.skipExercise());expect(result.current.state.status).toBe('complete');expect(result.current.state.skipped).toEqual([0,1]);expect(result.current.state.workMs[1]).toBeUndefined();
 act(()=>result.current.start());expect(result.current.state.skipped).toEqual([]);expect(result.current.state.workMs).toEqual({});
});
it('uses actual active time, does not convert rest-inclusive logs or muscle mass into calories',()=>{
 expect(estimateCalories(70,10,3.5)).toEqual({gross:42.875,active:30.625});expect(estimateCalories(80,10,3.5).gross).toBeGreaterThan(42.875);
 expect(estimateCalories(70,-1,3.5)).toBeNull();expect(estimateCalories(0,10,3.5)).toBeNull();expect(estimateCalories(70,NaN,3.5)).toBeNull();
 expect(recordedActiveMinutes({actual_minutes:30})).toBe('');expect(recordedActiveMinutes({actual_minutes:30,timed_sets_seconds:[20,40]})).toBe('1');
 render(<WorkoutResults exercises={exercises} measurement={{weight:70,skeletal_muscle_mass:32}} skipped={[1]} workMs={{0:60000}}/>);
 expect(screen.getByLabelText('스쿼트 실제 운동 분').value).toBe('');expect(screen.getByLabelText('컬 실제 운동 분').value).toBe('0');
 fireEvent.click(screen.getByText('실제 시간 확인 · 칼로리 계산'));expect(screen.getByRole('alert')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('스쿼트 실제 운동 분'),{target:{value:'10'}});fireEvent.click(screen.getByText('실제 시간 확인 · 칼로리 계산'));
 expect(screen.getByText('운동 시간 동안의 예상 소모량')).toBeTruthy();expect(screen.getByText('약 47 kcal')).toBeTruthy();expect(screen.getByText('약 0 kcal')).toBeTruthy();
});
it('authors 30 distinct rigged stretches with finite joints and constant segment lengths through their complete cycles',()=>{
 expect(STRETCHES).toHaveLength(30);const poses=new Set();
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 for(const stretch of STRETCHES){for(let f=0;f<=20;f++){const pose=poseJoints(stretch.motion_id,f/20);expect(pose.flat().every(Number.isFinite)).toBe(true);for(const [a,b] of BONES)expect(distance(pose[a],pose[b]),stretch.id).toBeCloseTo(distance(REST[a],REST[b]),5);}const p=poseJoints(stretch.motion_id,.5);poses.add(JSON.stringify([p,p.boneRotations]));}
 expect(poses.size).toBe(30);
 for(const id of ['recovery_child','recovery_child_side'])for(const t of [0,.25,.5,.75,1]){const p=poseJoints(id,t);expect(p[5][0]).toBeGreaterThan(p[8][0]);expect(p[11][0]).toBeGreaterThan(p[14][0]);}
});
it('chooses four or five relevant, nonduplicate recovery movements for each exercise, excluding unperformed exercises',()=>{
 for(const exercise of catalog){const recommended=recommendStretches([exercise]);expect(recommended.length,exercise.motion_id).toBeGreaterThanOrEqual(4);expect(recommended.length).toBeLessThanOrEqual(5);expect(new Set(recommended.map(s=>s.id)).size).toBe(recommended.length);expect(recommended.every(s=>s.reasons.includes(exercise.name))).toBe(true);}
 expect(recommendStretches([])).toEqual([]);expect(recommendStretches([exercises[0]]).map(s=>s.id)).not.toEqual(recommendStretches([exercises[1]]).map(s=>s.id));
});
it('automatically prepares, plays both sides, moves to the next stretch, pauses on background and supports skipping',()=>{
 vi.useFakeTimers();render(<StretchRecovery exercises={exercises}/>);
 const first=screen.getByTestId('stretch-model').dataset.motion;
 expect(screen.getByText('자동 진행 중')).toBeTruthy();expect(screen.getByText('다음 자세 준비')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(5100));act(()=>vi.advanceTimersByTime(1000));expect(Number(screen.getByTestId('stretch-model').dataset.progress)).toBeGreaterThan(0);
 act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const before=screen.getByTestId('stretch-model').dataset.progress;act(()=>vi.advanceTimersByTime(60000));expect(screen.getByTestId('stretch-model').dataset.progress).toBe(before);
 Object.defineProperty(document,'hidden',{configurable:true,value:false});fireEvent.click(screen.getByText('스트레칭 계속하기'));
 act(()=>vi.advanceTimersByTime(60000));expect(screen.getByTestId('stretch-model').dataset.motion).not.toBe(first);
 const second=screen.getByTestId('stretch-model').dataset.motion;fireEvent.click(screen.getByText('이 스트레칭 건너뛰기'));expect(screen.getByTestId('stretch-model').dataset.motion).not.toBe(second);
 fireEvent.click(screen.getByText('스트레칭 종료'));expect(screen.queryByTestId('stretch-model')).toBeNull();
});
it('does not automatically stretch after a pain stop or when every exercise was skipped',()=>{
 const view=render(<StretchRecovery exercises={exercises} pain/>);expect(screen.queryByText('자동 진행 중')).toBeNull();expect(screen.getByRole('alert')).toBeTruthy();view.unmount();
 render(<WorkoutResults exercises={exercises} skipped={[0,1]}/>);expect(screen.queryByTestId('stretch-model')).toBeNull();cleanup();
 render(<WorkoutResults exercises={exercises} records={[]} skipped={[1]}/>);expect(screen.queryByTestId('stretch-model')).toBeNull();
});
it('imports only empty timer durations and keeps manual and skipped values until user confirms calories',()=>{
 render(<WorkoutResults exercises={[...exercises,{exercise_id:'p',motion_id:'plank',exercise_name:'플랭크'}]} skipped={[1]} workMs={{0:90000,1:20000,2:30000}} measurement={{weight:70}}/>);
 fireEvent.change(screen.getByLabelText('플랭크 실제 운동 분'),{target:{value:'2'}});
 fireEvent.click(screen.getByRole('button',{name:'빈 시간에 운동 타이머 값 가져오기'}));
 expect(screen.getByLabelText('스쿼트 실제 운동 분').value).toBe('1.5');
 expect(screen.getByLabelText('컬 실제 운동 분').value).toBe('0');
 expect(screen.getByLabelText('플랭크 실제 운동 분').value).toBe('2');
 expect(screen.queryByText('운동 시간 동안의 예상 소모량')).toBeNull();
});
