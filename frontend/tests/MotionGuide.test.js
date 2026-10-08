import {describe,it,expect} from 'vitest';
import catalog from '../src/shared/lib/localCatalog.json';
import {getMotionGuide,motionPhase,cameraMotionId} from '../src/health/components/exercise/motionGuide.js';

describe('catalogue movement guidance',()=>{
 it('gives all 74 movements concrete steps, finite playback durations and a complete cycle',()=>{
  expect(catalog).toHaveLength(74);
  for(const exercise of catalog){
   const guide=getMotionGuide(exercise.motion_id);
   expect(guide.name).toBe(exercise.name);
   expect(guide.durationMs).toBeGreaterThan(0);
   expect(Number.isFinite(guide.durationMs)).toBe(true);
   expect(guide.phases[0].start).toBe(0);
   expect(guide.phases.at(-1).end).toBe(1);
   expect(guide.phases.every(phase=>phase.cue&&phase.label&&phase.label!=='천천히 움직이기')).toBe(true);
   for(let index=1;index<guide.phases.length;index++)expect(guide.phases[index].start).toBe(guide.phases[index-1].end);
  }
 });
 it('names different movement actions and keeps alternating and held guidance coherent',()=>{
  expect(motionPhase('squat',.2).label).toBe('천천히 앉기');
  expect(motionPhase('leg_press',.2).label).toBe('발판 밀기');
  expect(motionPhase('bird_dog',.1).label).toBe('반대 팔·다리 뻗기');
  expect(motionPhase('lunge',.25).label).toBe(motionPhase('lunge',.75).label);
  expect(motionPhase('plank',.01).label).toBe(motionPhase('plank',.95).label);
  expect(motionPhase('missing',.5)).toBeNull();
 });
 it('maps exactly seven catalogue exercises to camera analysis, excluding unsupported variants',()=>{
  const supported=catalog.filter(exercise=>exercise.training_type==='bodyweight'&&cameraMotionId(exercise.motion_id));
  expect(supported.map(exercise=>exercise.motion_id).sort()).toEqual(['bridge','full_pushup','hinge','lunge','plank','side_lunge','squat']);
  expect(cameraMotionId('hinge')).toBe('hip_hinge');
  expect(cameraMotionId('bridge')).toBe('glute_bridge');
  expect(cameraMotionId('full_pushup')).toBe('push_up');
  for(const id of ['pushup','incline_push','wall_push','curl','machine_chest_press'])expect(cameraMotionId(id)).toBeNull();
 });
});
