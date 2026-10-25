import {it,expect} from 'vitest';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {CatalogPoseAnalyzer,CATALOG_POSE_EXERCISES} from '../src/health/components/exercise/catalogPoseAnalyzer.js';
import fixture from './pose-fixtures/squat.json';
// Synthetic software regressions, not human accuracy data.
const points=()=>structuredClone(fixture.scenarios.find(s=>s.name==='good').frames[0].landmarks);
for(const id of Object.keys(CATALOG_POSE_EXERCISES)){
 it(`${id}: static/noisy frames and interrupted tracking never invent repetitions`,()=>{
  const a=createExercisePoseAnalyzer(id);let r;
  for(let n=0;n<50;n++){const p=points();for(const q of p){q.x+=Math.sin(n)*.0001;q.y+=Math.cos(n)*.0001;}r=a.update(p,n*150);expect(r.reps).toBe(0);}
  r=a.update([],8000);expect(r.detected).toBe(false);expect(r.corrections).toEqual([]);
  expect(a.update(points(),8150).reps).toBe(0);
 });
 it(`${id}: clipped, missing and malformed frames suppress analysis`,()=>{
  const a=createExercisePoseAnalyzer(id);
  for(const p of [[],Array(33).fill(null),points().map(q=>({...q,x:-1})),points().map(q=>({...q,visibility:.1}))]){
   const r=a.update(p,200);expect(r.detected).toBe(false);expect(r.corrections).toEqual([]);
  }
 });
}
it('optional missing landmark does not crash a catalog analyzer',()=>{
 const p=points();p[0]=null;expect(()=>new CatalogPoseAnalyzer('hammer_curl').update(p,0)).not.toThrow();
});
function elbow(degrees){const p=points();for(const side of [0,1]){const e=p[13+side],s=p[11+side];const theta=Math.atan2(s.y-e.y,s.x-e.x)+degrees*Math.PI/180;p[15+side]={x:e.x+.14*Math.cos(theta),y:e.y+.14*Math.sin(theta),z:0,visibility:1};s.z=e.z=0;}return p;}
it('partial curl excursions cannot count a complete repetition',()=>{
 const a=new CatalogPoseAnalyzer('hammer_curl');for(const [t,v] of [[0,160],[150,115],[300,115],[450,115],[600,160]])a.update(elbow(v),t);
 expect(a.reps).toBe(0);
});
it('full endpoint excursion counts once and a tracking gap invalidates the next cycle',()=>{
 const a=new CatalogPoseAnalyzer('hammer_curl');for(const [t,v] of [[0,160],[150,40],[300,40],[450,40],[600,160]])a.update(elbow(v),t);
 expect(a.reps).toBe(1);a.update(elbow(40),750);a.update([],900);a.update(elbow(160),1050);expect(a.reps).toBe(1);
});
