import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import ExerciseCard from '../src/health/components/exercise/ExerciseCard.jsx';
import {MOTIONS} from '../src/health/components/exercise/motions.js';
import {createExercisePoseAnalyzer,POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
import {morphPositions} from '../src/health/components/body3d/morph.js';
import {cacheResponse,cachedResponse,queueWorkout,syncWorkouts,offlineState,clearOffline} from '../src/shared/lib/offline.js';
import {RemoteBodyShapeProvider,DisabledBodyShapeProvider} from '../src/shared/lib/bodyShape.js';
afterEach(()=>{cleanup();clearOffline();});
it('routine cards render exercise preview without requiring user click',()=>{
 render(<ExerciseCard exercise={{exercise_name:'스쿼트',motion_id:'squat',sets:3,reps:'10',instructions:['천천히 움직이세요']}}/>);
 expect(screen.getByTestId('exercise-preview').querySelector('svg')).toBeTruthy();expect(screen.getByText('천천히 움직이세요')).toBeTruthy();expect(screen.queryByText('동작 재생')).toBeNull();
});
it('all catalog motions have a still SVG before animation scheduling',()=>{
 for(const id of Object.keys(MOTIONS)){const {unmount}=render(<ExerciseCard exercise={{exercise_name:id,motion_id:id}}/>);expect(screen.getByTestId('exercise-preview').querySelector('svg')).toBeTruthy();unmount();}
});
it('all analyzers suppress uncertain feedback and expose the common contract',()=>{
 expect(Object.keys(POSE_EXERCISES).length).toBeGreaterThanOrEqual(10);
 for(const id of Object.keys(POSE_EXERCISES)){const a=createExercisePoseAnalyzer(id),r=a.update([],10);expect(r.detected).toBe(false);expect(r.confidence).toBe(0);expect(r.corrections).toEqual([]);expect(r.range_of_motion).toBeNull();expect(r.completion_state).toBe('tracking_lost');}
});
it('waist changes abdomen without stretching height',()=>{
 const base=new Float32Array([.15,1.15,.1,.15,1.6,.1]);const a=morphPositions(base,{waist_circumference:65}),b=morphPositions(base,{waist_circumference:110});expect(b[2]).toBeGreaterThan(a[2]);expect(b[1]).toBe(a[1]);expect(b[5]).toBe(a[5]);
});
it('offline queue retries once per logical workout and keeps failed records',async()=>{
 cacheResponse('/api/exercise-routines',[{id:'r'}]);expect(cachedResponse('/api/exercise-routines')).toEqual([{id:'r'}]);expect(cachedResponse('/api/billing/subscription')).toBeUndefined();
 const body={routine_id:'r',date:'2026-09-30',day_number:1,routine_exercise_id:'s'};queueWorkout(body);queueWorkout({...body,rpe:4});expect(offlineState().pending).toBe(1);
 await expect(syncWorkouts(()=>Promise.reject(Error('offline')))).rejects.toThrow();expect(offlineState().pending).toBe(1);const send=vi.fn(()=>Promise.resolve());await syncWorkouts(send);expect(send).toHaveBeenCalledTimes(1);expect(offlineState().pending).toBe(0);
});
it('photo providers never invent models or bypass upload consent',async()=>{
 await expect(new DisabledBodyShapeProvider().estimate()).rejects.toThrow();const remote=new RemoteBodyShapeProvider({estimate:vi.fn()});await expect(remote.estimate({}, {consent:true})).rejects.toThrow('별도 동의');
});
