import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {renderHook,act,cleanup,render,screen} from '@testing-library/react';
import {buildTempoPlan,tempoFrame,recommendedRest,tempoPrescription} from '../src/health/components/exercise/tempoSession.js';
import useTempoSession from '../src/health/components/exercise/useTempoSession.js';
import BodyweightDemo from '../src/health/components/exercise/BodyweightDemo.jsx';
import ExerciseMotion from '../src/health/components/exercise/ExerciseMotion.jsx';
vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:({progress})=><div data-testid="avatar" data-progress={progress}/> }));
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();Object.defineProperty(document,'hidden',{configurable:true,value:false});});
const squat={motion_id:'squat',exercise_name:'스쿼트',sets:1,reps:'1',rest_seconds:10};
describe('automatic guided timing',()=>{
 it('bounds set recovery and transitions without resting after the final exercise',()=>{
  for(const seconds of [-20,0,10,65,120,500])expect(recommendedRest({...squat,rest_seconds:seconds}).seconds).toBeGreaterThanOrEqual(10);
  expect(recommendedRest({...squat,rest_seconds:500}).seconds).toBe(120);
  const plan=buildTempoPlan([{...squat,sets:2},{motion_id:'plank',sets:1,hold_seconds:25}]);
  expect(plan.map(s=>s.kind)).toEqual(['prepare','work','rest','work','rest','work']);
  expect(plan.at(-1).durationMs).toBe(25000);expect(plan[4].restType).toBe('transition');
 });
 it('keeps timed dose separate from recovery and parses each-side counts',()=>{
  expect(tempoPrescription({motion_id:'lunge',reps:'각 8–12회'}).reps).toBe(16);
  const plan=buildTempoPlan([{motion_id:'plank',hold_seconds:40,sets:1,rest_seconds:15}]);
  expect(plan[1].durationMs).toBe(40000);expect(plan).toHaveLength(2);
  const walk=buildTempoPlan([{motion_id:'walk',dose_type:'duration',duration:'5분',sets:1}]);
  expect(walk[1].durationMs).toBe(300000);
 });
 it('drives avatar, rep number and alternating side from the same elapsed time',()=>{
  const work=buildTempoPlan([{motion_id:'lunge',reps:'각 2',sets:1}])[1];
  expect(work.durationMs).toBe(24000);
  expect(tempoFrame(work,3000)).toMatchObject({progress:.25,rep:1,side:'첫 번째 쪽'});
  expect(tempoFrame(work,9000)).toMatchObject({progress:.75,rep:2,side:'반대쪽'});
 });
 it('automatically goes from prepare to work, rest, next exercise and immediate completion',()=>{
  vi.useFakeTimers();const exercises=[squat,{...squat,motion_id:'hinge'}];
  const {result}=renderHook(()=>useTempoSession(exercises));
  act(()=>result.current.start());act(()=>vi.advanceTimersByTime(5100));
  expect(result.current.segment.kind).toBe('work');act(()=>vi.advanceTimersByTime(7100));
  expect(result.current.segment.kind).toBe('rest');act(()=>vi.advanceTimersByTime(10100));
  expect(result.current.segment).toMatchObject({kind:'work',exerciseIndex:1});
  act(()=>vi.advanceTimersByTime(22500));expect(result.current.state.status).toBe('complete');
 });
 it('pauses without advancing while hidden, then resumes at the same position',()=>{
  vi.useFakeTimers();const exercises=[squat];const {result}=renderHook(()=>useTempoSession(exercises));
  act(()=>result.current.start());act(()=>vi.advanceTimersByTime(6000));
  act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const elapsed=result.current.state.elapsed;act(()=>vi.advanceTimersByTime(30000));
  expect(result.current.state.elapsed).toBe(elapsed);expect(result.current.state.status).toBe('paused');
  act(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});result.current.start();});
  act(()=>vi.advanceTimersByTime(500));expect(result.current.state.elapsed).toBeGreaterThan(elapsed);
 });
 it('pauses on long timer stalls instead of consuming an unseen exercise',()=>{
  vi.useFakeTimers();let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now);
  const exercises=[squat],{result}=renderHook(()=>useTempoSession(exercises));act(()=>result.current.start());
  now=10000;act(()=>vi.advanceTimersByTime(50));expect(result.current.state.status).toBe('paused');expect(result.current.state.elapsed).toBe(0);
 });
 it('uses externally timed progress in both instructor views',async()=>{
  const a=render(<ExerciseMotion exercise={squat} playback={{progress:.7,running:true}}/>);
  expect(screen.getByTestId('avatar').dataset.progress).toBe('0.7');expect(screen.queryByLabelText('재생 속도')).toBeNull();a.unmount();
  render(<BodyweightDemo exerciseId="squat" playback={{progress:.3,running:true}}/>);
  expect((await screen.findByTestId('avatar')).dataset.progress).toBe('0.3');expect(screen.queryByLabelText('운동 시범 속도')).toBeNull();
 });
});
