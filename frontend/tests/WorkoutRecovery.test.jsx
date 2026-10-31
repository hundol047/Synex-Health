import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,act,cleanup,renderHook} from '@testing-library/react';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES,recommendStretches} from '../src/health/components/exercise/stretchCatalog.js';
import {poseJoints,REST,BONES} from '../src/health/components/exercise/rig.js';
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
it('shows only recovery stretching after a workout, without calorie or actual-time inputs',()=>{
 render(<WorkoutResults exercises={exercises} skipped={[1]}/>);
 expect(screen.getByTestId('stretch-model')).toBeTruthy();
 expect(screen.queryByText(/칼로리/)).toBeNull();expect(screen.queryByLabelText(/실제 운동 분/)).toBeNull();
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
it('keeps advancing to the next stretch when loading the next model stalls a frame',()=>{
 vi.useFakeTimers();let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
 render(<StretchRecovery exercises={exercises}/>);
 const first=screen.getByTestId('stretch-model').dataset.motion;
 // A 3-second stall used to pause the sequence at every new stretch.
 act(()=>{now+=3000;vi.advanceTimersByTime(40);});
 expect(screen.getByText('자동 진행 중')).toBeTruthy();
 for(let i=0;i<2000&&screen.getByTestId('stretch-model').dataset.motion===first;i++)act(()=>{now+=33;vi.advanceTimersByTime(34);});
 expect(screen.getByTestId('stretch-model').dataset.motion).not.toBe(first);
 expect(screen.getByText('자동 진행 중')).toBeTruthy();
});
it('continues through the rest of the full list after choosing a stretch there',()=>{
 render(<StretchRecovery exercises={exercises} autoStart={false}/>);
 fireEvent.click(screen.getByText('전체 30가지 · 동작 바꾸기'));
 fireEvent.click(screen.getAllByRole('button',{pressed:false}).find(b=>b.classList.contains('stretch-choice')));
 expect(screen.getByText(/^1 \/ 30/)).toBeTruthy();
});
it('does not automatically stretch after a pain stop or when every exercise was skipped',()=>{
 const view=render(<StretchRecovery exercises={exercises} pain/>);expect(screen.queryByText('자동 진행 중')).toBeNull();expect(screen.getByRole('alert')).toBeTruthy();view.unmount();
 render(<WorkoutResults exercises={exercises} skipped={[0,1]}/>);expect(screen.queryByTestId('stretch-model')).toBeNull();cleanup();
 render(<WorkoutResults exercises={exercises} records={[]} skipped={[1]}/>);expect(screen.queryByTestId('stretch-model')).toBeNull();
});
