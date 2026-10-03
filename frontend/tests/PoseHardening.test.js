import {it,expect} from 'vitest';
import {createExercisePoseAnalyzer,TemporalPhases,POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
import {PoseCalibration} from '../src/health/components/exercise/poseRules.js';
const fixtures=import.meta.glob('./pose-fixtures/*.json',{eager:true,import:'default'});
for(const fixture of Object.values(fixtures))for(const scenario of fixture.scenarios){
 it(`${fixture.exercise}: ${scenario.name}`,()=>{
  const coach=createExercisePoseAnalyzer(fixture.exercise);let r;
  for(const f of scenario.frames)r=coach.update(f.landmarks,f.time_ms);
  expect(r.detected).toBe(scenario.expected_detected);
  if(scenario.expected_correction)expect(r.corrections.join(' ')).toContain(scenario.expected_correction);
  if(scenario.name==='good')expect(Object.keys(r.metrics).length).toBeGreaterThanOrEqual(3);
  if(!r.detected){expect(r.corrections).toEqual([]);expect(r.warnings).toEqual([]);expect(r.repetition_count).toBe(0);expect(['LOW','LOST']).toContain(r.tracking_quality);}
 });
}
it('requires stable single-person calibration, rejects missing body, multiple people and gaps',()=>{
 const p=Object.values(fixtures).find(f=>f.exercise==='squat').scenarios[0].frames[0].landmarks;
 const c=new PoseCalibration();for(let t=0;t<2500;t+=250)expect(c.update([p],t).ready).toBe(false);
 expect(c.update([p],2500).ready).toBe(true);expect(c.update([p,p],2750).ready).toBe(false);
 for(let t=3000;t<=5500;t+=250)c.update([p],t);expect(c.ready).toBe(true);
 expect(c.update([p],7000).ready).toBe(false);expect(c.update([],7250).ready).toBe(false);
});
for(const id of Object.keys(POSE_EXERCISES).filter(id=>id!=='plank'))it(`${id}: one full temporal cycle and tracking loss`,()=>{
 const c=POSE_EXERCISES[id],low=['shoulder_press','lateral_raise','front_raise','glute_bridge'].includes(id);
 const start=low?c.down-5:c.up+5,extreme=low?c.up+5:c.down-5,mid=(start+extreme)/2;
 const a=new TemporalPhases(id);let r;
 for(const [i,angle] of [start,start,start,mid,extreme,extreme,mid,start].entries())r=a.update(angle,i*200,1);
 expect(r.reps).toBe(1);a.update(mid,1600,1);a.update(extreme,1800,0);expect(a.update(start,2000,1).reps).toBe(1);
});
