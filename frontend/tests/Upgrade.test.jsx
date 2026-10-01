import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import ExerciseCard from '../src/health/components/exercise/ExerciseCard.jsx';
import {MOTIONS} from '../src/health/components/exercise/motions.js';
import {createExercisePoseAnalyzer,POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
import {morphPositions} from '../src/health/components/body3d/morph.js';
import {cacheResponse,cachedResponse,queueWorkout,syncWorkouts,offlineState,clearOffline} from '../src/shared/lib/offline.js';
import {RemoteBodyShapeProvider,DisabledBodyShapeProvider} from '../src/shared/lib/bodyShape.js';
afterEach(async()=>{cleanup();await clearOffline();});
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
it('photo providers never invent models or bypass upload consent',async()=>{
 await expect(new DisabledBodyShapeProvider().estimate()).rejects.toThrow();const remote=new RemoteBodyShapeProvider({estimate:vi.fn()});await expect(remote.estimate({}, {consent:true})).rejects.toThrow('별도 동의');
});
