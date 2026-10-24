import {it,expect} from 'vitest';
import {createExercisePoseAnalyzer,SUPPORTED_POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
import {CATALOG_POSE_EXERCISES,CatalogPoseAnalyzer} from '../src/health/components/exercise/catalogPoseAnalyzer.js';
import fixture from './pose-fixtures/squat.json';
const points=()=>structuredClone(fixture.scenarios.find(s=>s.name==='good').frames[0].landmarks);
for(const [id,profile] of Object.entries(CATALOG_POSE_EXERCISES)){
 it(`${id}: explicit protocol, missing joints suppress corrections, finite observations`,()=>{
  expect(SUPPORTED_POSE_EXERCISES[id].label).toBe(profile.label);expect(profile.instructions.length).toBeGreaterThan(0);
  const analyzer=createExercisePoseAnalyzer(id);const lost=analyzer.update([],0);
  expect(lost.detected).toBe(false);expect(lost.corrections).toEqual([]);
  const p=points();let out;for(let t=0;t<1000;t+=200)out=analyzer.update(p,t);
  expect(JSON.stringify(out)).not.toContain('NaN');expect(out.reps).toBeGreaterThanOrEqual(0);
  const bad=points();bad[profile.joints[0]].visibility=0;
  expect(analyzer.update(bad,1200).detected).toBe(false);
 });
}
it('different exercise families respond to different observed form faults',()=>{
 const p=points();p[13].x=.95;p[14].x=.05;
 const curl=new CatalogPoseAnalyzer('hammer_curl').update(p,0);
 const hinge=new CatalogPoseAnalyzer('wall_hinge').update(p,0);
 expect(curl.corrections.join(' ')).toContain('팔꿈치');
 expect(hinge.metrics).toHaveProperty('hip_angle');expect(hinge.corrections).not.toEqual(curl.corrections);
});
it('tracking loss never counts a return as a completed repetition',()=>{
 const a=new CatalogPoseAnalyzer('wall_push');a.update(points(),0);a.update([],200);
 expect(a.update(points(),400).reps).toBe(0);
 expect(()=>createExercisePoseAnalyzer('made-up')).toThrow();
});
