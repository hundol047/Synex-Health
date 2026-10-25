import {describe,it,expect} from 'vitest';
import catalog from '../src/shared/lib/localCatalog.json';
import {COACHING_CATALOG,coachingMotionId} from '../src/health/components/exercise/coachingCatalog.js';
import {CatalogPoseAnalyzer} from '../src/health/components/exercise/catalogPoseAnalyzer.js';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {poseFeedback} from '../src/health/components/exercise/poseFeedback.js';
import {poseJoints} from '../src/health/components/exercise/rig.js';
const mapping={0:2,11:3,12:6,13:4,14:7,15:5,16:8,23:9,24:12,25:10,26:13,27:11,28:14,29:11,30:14,31:15,32:16};
function projection(motion,phase,view){
 const joints=poseJoints(motion,phase),points=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));
 for(const [mp,joint] of Object.entries(mapping)){
  const [x,y,z]=joints[joint];points[mp]={x:.5+(view==='front'?x:view==='side'?z:(x+z)/Math.sqrt(2))*.29,y:.78-y*.29,z:0,visibility:1};
 }
 return points;
}
const frontal=()=>projection('curl',0,'front');
describe('74 exercise camera coverage',()=>{
 it('has one explicit observation contract and analyzer for every exercise, including all equipment variants',()=>{
  expect(Object.keys(COACHING_CATALOG)).toHaveLength(74);
  for(const exercise of catalog){const id=coachingMotionId(exercise.motion_id),config=COACHING_CATALOG[id];expect(config.motionId).toBe(exercise.motion_id);expect(config.required.length).toBeGreaterThan(5);expect(config.observations.length).toBeGreaterThan(1);expect(config.effort.load).toBeTruthy();expect(createExercisePoseAnalyzer(id).update([],100).detected).toBe(false);}
  expect(coachingMotionId('pushup')).not.toBe(coachingMotionId('full_pushup'));expect(coachingMotionId('unknown')).toBeNull();
 });
 it('observes actual joint values for every catalog profile using synthetic projections, without treating these as accuracy validation',()=>{
  const missing=[];
  for(const c of Object.values(COACHING_CATALOG)){
   const analyzer=new CatalogPoseAnalyzer(c.id);let detected=false;
   for(const view of c.views.includes('any')?['front','side','oblique']:c.views)for(const phase of [0,.25,.5,.75]){
    const r=analyzer.update(projection(c.motionId,phase,view),100+phase*400,1);
    if(r.detected){detected=true;expect(r.observations.length).toBe(c.observations.length);expect(r.observations.every(o=>o.value&&!o.value.includes('NaN'))).toBe(true);expect(poseFeedback(c.id,r).muscle.load).toBeTruthy();}
   }
   if(!detected)missing.push(c.id);
  }
  expect(missing).toEqual([]);
 });
 it('withholds all new profiles for each hidden required joint, wrong timestamps and portrait bounds',()=>{
  for(const c of Object.values(COACHING_CATALOG)){
   const p=projection(c.motionId,.5,c.views[0]==='any'?'side':c.views[0]);
   for(const joint of c.required){const hidden=p.map(x=>({...x}));hidden[joint].visibility=.1;const r=new CatalogPoseAnalyzer(c.id).update(hidden,100);expect(r.detected,c.id).toBe(false);expect(r.issues).toEqual([]);}
   const r=new CatalogPoseAnalyzer(c.id).update(p,NaN);expect(r.reps).toBe(0);expect(r.detected).toBe(false);
  }
 });
 it('changes advice from actual motion, preserves it under mirroring/aspect correction and suppresses a wrong view',()=>{
  const c=new CatalogPoseAnalyzer('hammer_curl'),p=frontal();const good=c.update(p,100);expect(good.detected).toBe(true);expect(good.issues).toEqual([]);
  p[11].x-=.10;p[12].x-=.10;
  const bad=c.update(p,300);expect(bad.issues.some(i=>i.metric==='trunkLean')).toBe(true);
  const mirrored=p.map(x=>({...x,x:1-x.x})),portrait=p.map(x=>({...x,y:x.y/1.5}));
  for(const [points,aspect] of [[mirrored,1],[portrait,1.5]])expect(new CatalogPoseAnalyzer('hammer_curl').update(points,100,aspect).issues.map(x=>x.metric)).toEqual(bad.issues.map(x=>x.metric));
  expect(new CatalogPoseAnalyzer('leg_extension').update(frontal(),100).detected).toBe(false);
 });
 it('counts a full observed curl but never joins partial reps over occlusion or a frame gap',()=>{
  function run(gap=false,hide=false){const c=new CatalogPoseAnalyzer('hammer_curl');let r,time=0;for(const [phase,frames] of [[0,4],[.25,3],[.5,4],[.75,3],[0,4]])for(let i=0;i<frames;i++){time+=200;if(phase===.5&&i===0){if(gap)time+=2000;if(hide)c.update([],time-10);}r=c.update(projection('hammer_curl',phase,'front'),time);}return r;}
  expect(run().reps).toBe(1);expect(run(true).reps).toBe(0);expect(run(false,true).reps).toBe(0);
 });
 it('does not invent repetitions for scapula, gait and rotation proxies',()=>{
  for(const id of ['scapular','walk','thoracic_rotation','machine_hip_abduction']){const c=new CatalogPoseAnalyzer(id);let r;for(let i=0;i<30;i++)r=c.update(projection(id,(i%10)/10,'front'),i*200);expect(r.reps).toBe(0);if(r.detected)expect(r.count_supported).toBe(false);}
 });
});
