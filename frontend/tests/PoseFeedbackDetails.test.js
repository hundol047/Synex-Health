import {describe,it,expect} from 'vitest';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {poseFeedback,PoseSessionReport} from '../src/health/components/exercise/poseFeedback.js';
import {stableCoachingFeedback} from '../src/health/components/exercise/CameraCoaching.jsx';
const floor=()=>{
 const p=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.99}));
 for(const [i,x,y] of [[11,.2,.3],[12,.2,.32],[13,.2,.48],[14,.2,.5],[15,.2,.6],[16,.2,.62],[23,.5,.3],[24,.5,.32],[27,.8,.3],[28,.8,.32]])p[i]={x,y,z:0,visibility:.99};
 return p;
};
function observe(offset){const p=floor();p[23].y+=offset;p[24].y+=offset;const a=createExercisePoseAnalyzer('plank');a.update(p,0);return stableCoachingFeedback(a.update(p,400));}
describe('measured camera feedback',()=>{
 it('changes the actual observation, numerical evidence and action for sag, pike and aligned poses',()=>{
  const sag=poseFeedback('plank',observe(.17)),pike=poseFeedback('plank',observe(-.17)),aligned=poseFeedback('plank',observe(0));
  expect(sag.message).toContain('조금 들어');expect(pike.message).toContain('조금 낮춰');
  expect(sag.differences[0].evidence).toContain('아래');expect(pike.differences[0].evidence).toContain('위');
  expect(aligned.differences).toEqual([]);expect(aligned.message).toContain('180°');
  expect(new Set([sag.message,pike.message,aligned.message]).size).toBe(3);
 });
 it('does not infer physical corrections from missing joints or carry the previous correction forward',()=>{
  const a=createExercisePoseAnalyzer('plank');a.update(floor(),0);const bad=floor();bad[23].visibility=.1;
  const d=poseFeedback('plank',a.update(bad,200));expect(d.differences).toEqual([]);expect(d.observations).toEqual([]);expect(d.phase).toBeNull();
 });
 it('keeps image-plane angles independent of inferred depth noise',()=>{
  const p=floor(),noisy=p.map((v,i)=>({...v,z:i%2?2:-2}));
  const a=createExercisePoseAnalyzer('plank').update(p,0),b=createExercisePoseAnalyzer('plank').update(noisy,0);
  expect(a.metrics.body_alignment).toEqual(b.metrics.body_alignment);
 });
 it('provides distinct effort guidance for every supported exercise without claiming measured muscle activation',()=>{
  const ids=['squat','lunge','side_lunge','push_up','plank','hip_hinge','glute_bridge'];
  expect(new Set(ids.map(id=>poseFeedback(id,null).muscle.load)).size).toBe(ids.length);
 });
 it('records only observed clip evidence and treats a no-person clip as insufficient',()=>{
  const empty=new PoseSessionReport();for(let t=0;t<=2000;t+=200)empty.add({detected:false},t);
  expect(empty.snapshot()).toMatchObject({sufficient:false,observedSeconds:0,issues:[],reps:0});
  const report=new PoseSessionReport(),sag=observe(.17);
  for(let t=0;t<=2000;t+=200)report.add({...sag,reps:5+(t>=1000?1:0)},t);
  expect(report.snapshot()).toMatchObject({sufficient:true,observedSeconds:2,reps:1});expect(report.snapshot().issues[0].id).toBe('plank_hip_sag');
  expect(JSON.stringify(report.snapshot())).not.toContain('landmarks');
 });
 it('does not count lost tracking or long sampling gaps as valid analysis time',()=>{
  const report=new PoseSessionReport();report.add(observe(0),0);report.add({detected:false},200);report.add(observe(0),400);report.add(observe(0),5000);
  expect(report.snapshot().observedSeconds).toBe(0);expect(report.snapshot().sufficient).toBe(false);
 });
});
