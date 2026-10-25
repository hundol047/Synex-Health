import {describe,it,expect} from 'vitest';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {PoseCalibration} from '../src/health/components/exercise/poseRules.js';

const pose=entries=>{
 const points=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.99}));
 for(const [i,x,y] of entries)points[i]={x,y,z:0,visibility:.99};
 return points;
};
const frontalSquat=()=>pose([[11,.35,.2],[12,.65,.2],[23,.42,.45],[24,.58,.45],[25,.32,.65],[26,.68,.65],[27,.3,.9],[28,.7,.9]]);
const supported=()=>pose([[11,.2,.3],[12,.2,.32],[13,.2,.48],[14,.2,.5],[15,.2,.6],[16,.2,.62],[23,.5,.3],[24,.5,.32],[25,.65,.3],[26,.65,.32],[27,.8,.3],[28,.8,.32]]);
const sideHinge=()=>pose([[11,.2,.45],[12,.22,.45],[23,.55,.55],[24,.57,.55],[25,.52,.74],[26,.54,.74],[27,.48,.91],[28,.5,.91]]);
const mirror=points=>points.map(p=>({...p,x:1-p.x}));
const imageCoordinates=(points,aspect)=>points.map(p=>({...p,y:p.y/aspect}));
const analyze=(id,p,aspect=1)=>createExercisePoseAnalyzer(id).update(p,100,aspect);

describe('bodyweight corrections grounded in visible joints',()=>{
 it('highlights knees and gives an actionable frontal squat direction',()=>{
  const p=frontalSquat();p[25].x=.48;p[26].x=.52;
  const r=analyze('squat',p),issue=r.issues.find(i=>i.id==='squat_knee_inward');
  expect(issue).toMatchObject({bodyPart:'무릎',joints:[25,26],severity:'adjust',view:'front'});
  expect(issue.message).toContain('발가락 방향');expect(r.corrections).toContain(issue.message);
  expect(r.issues.filter(i=>i.id==='squat_knee_inward')).toHaveLength(1);
 });

 for(const id of ['push_up','plank'])for(const direction of ['sag','pike'])it(`${id}: separates hip ${direction} and remains correct after mirroring`,()=>{
  const p=supported(),offset=direction==='sag'?.17:-.17;p[23].y+=offset;p[24].y+=offset;
  for(const points of [p,mirror(p)]){
   const r=analyze(id,points),issue=r.issues.find(i=>i.id===`${id}_hip_${direction}`);
   expect(issue).toMatchObject({bodyPart:'골반',joints:[23,24],severity:'adjust'});
   expect(issue.message).toContain(direction==='sag'?'조금 들어':'조금 낮춰');
   expect(r.issues.some(i=>i.id===`${id}_hip_${direction==='sag'?'pike':'sag'}`)).toBe(false);
  }
 });

 it('uses physical image proportions in portrait and landscape, without changing the correction',()=>{
  const p=supported();p[23].y+=.15;p[24].y+=.15;
  const reference=analyze('push_up',p);
  for(const aspect of [.75,4/3]){
   const r=analyze('push_up',imageCoordinates(p,aspect),aspect);
   expect(r.metrics.hip_height).toBeCloseTo(reference.metrics.hip_height,8);
   expect(r.issues.map(i=>i.id)).toEqual(reference.issues.map(i=>i.id));
  }
 });

 it('keeps sag direction correct when the body line is slightly tilted',()=>{
  const p=supported();p[23].y+=.16;p[24].y+=.16;
  const radians=12*Math.PI/180;
  const rotated=p.map(a=>({ ...a,x:.5+(a.x-.5)*Math.cos(radians)-(a.y-.4)*Math.sin(radians),y:.4+(a.x-.5)*Math.sin(radians)+(a.y-.4)*Math.cos(radians)}));
  expect(analyze('plank',rotated).issues.some(i=>i.id==='plank_hip_sag')).toBe(true);
 });

 it('does not identify overlapping side-view knees as frontal knee collapse',()=>{
  const p=frontalSquat();p[11].x=.46;p[12].x=.48;p[25].x=.48;p[26].x=.5;
  expect(analyze('squat',p).metrics.camera_view).toBe('side');
  expect(analyze('squat',p).issues.some(i=>i.id==='squat_knee_inward')).toBe(false);
 });

 it('allows normal forward lean in a hip hinge and in a deep squat',()=>{
  const hinge=analyze('hip_hinge',sideHinge());
  expect(hinge.metrics.torso_inclination).toBeGreaterThan(70);expect(hinge.issues).toEqual([]);
  const deep=pose([[11,.2,.45],[12,.22,.45],[23,.53,.53],[24,.55,.53],[25,.7,.65],[26,.72,.65],[27,.48,.9],[28,.5,.9]]);
  const r=analyze('squat',deep);expect(r.metrics.torso_inclination).toBeGreaterThan(70);
  expect(Math.min(...r.metrics.knee_flexion)).toBeLessThan(125);expect(r.issues).toEqual([]);
 });

 it('identifies squat-like knee flexion during a side-view hinge',()=>{
  const p=sideHinge();p[25]={...p[25],x:.75,y:.65};p[26]={...p[26],x:.77,y:.65};p[27].x=.55;p[28].x=.57;
  const r=analyze('hip_hinge',p);
  expect(r.issues.find(i=>i.id==='hinge_knee_flexion')).toMatchObject({bodyPart:'무릎·골반',severity:'adjust',view:'side'});
 });

 it('distinguishes camera guidance from a physical correction for front-view lunge stance',()=>{
  const p=frontalSquat();p[27].x=.49;p[28].x=.51;
  const r=analyze('lunge',p),issue=r.issues.find(i=>i.id==='lunge_camera');
  expect(issue).toMatchObject({severity:'camera',joints:[]});expect(issue.message).toContain('측면');
 });

 it('allows natural lunge hip flexion with an upright torso and standing preparation with feet together',()=>{
  const stepping=pose([[11,.45,.2],[12,.47,.2],[23,.45,.5],[24,.47,.5],[25,.55,.65],[26,.33,.67],[27,.5,.9],[28,.35,.9]]);
  const r=analyze('lunge',stepping);expect(Math.min(...r.metrics.hip_flexion)).toBeLessThan(145);
  expect(Math.min(...r.metrics.knee_flexion)).toBeGreaterThan(125);expect(r.issues).toEqual([]);
  const standing=pose([[11,.45,.2],[12,.47,.2],[23,.45,.5],[24,.47,.5],[25,.45,.7],[26,.47,.7],[27,.45,.9],[28,.47,.9]]);
  expect(analyze('lunge',standing).issues).toEqual([]);
 });

 it('still corrects narrow side-view support during a loaded lunge',()=>{
  const p=pose([[11,.5,.25],[12,.52,.25],[23,.5,.65],[24,.52,.65],[25,.4,.75],[26,.65,.75],[27,.51,.9],[28,.53,.9]]);
  expect(analyze('lunge',p).issues.find(i=>i.id==='lunge_stance')).toMatchObject({bodyPart:'발',severity:'adjust',joints:[27,28]});
 });

 it('does not call the natural forward wrist shift at the bottom of a push-up a support error',()=>{
  const p=supported();p[13]={...p[13],x:.45,y:.35};p[14]={...p[14],x:.45,y:.37};p[15].x=.5;p[16].x=.5;
  const r=analyze('push_up',p);expect(r.detected).toBe(true);
  expect(Math.min(...r.metrics.elbow_angle)).toBeLessThan(140);
  expect(r.issues.some(i=>i.id==='push_up_shoulder_support')).toBe(false);
 });

 it('refuses to infer push-ups from upright arm bending',()=>{
  const r=analyze('push_up',frontalSquat());
  expect(r.detected).toBe(false);expect(r.reps).toBe(0);expect(r.issues).toEqual([]);expect(r.corrections).toEqual([]);
  expect(r.feedback).toContain('바닥을 짚은 손');
 });

 it('refuses to infer a glute bridge or give knee corrections while standing',()=>{
  const a=createExercisePoseAnalyzer('glute_bridge');let r;
  for(let t=0;t<=3000;t+=200)r=a.update(frontalSquat(),t);
  expect(r.detected).toBe(false);expect(r.reps).toBe(0);expect(r.issues).toEqual([]);expect(r.corrections).toEqual([]);
  expect(r.feedback).toContain('누운 자세');
 });

 it('clears joint highlights and their persistence when tracking is lost or the body is cropped',()=>{
  const p=frontalSquat();p[25].x=.48;p[26].x=.52;const a=createExercisePoseAnalyzer('squat');
  a.update(p,0);expect(a.update(p,200).issues[0].observedMs).toBe(200);
  const obscured=structuredClone(p);obscured[25].visibility=.1;
  const lost=a.update(obscured,400);expect(lost.detected).toBe(false);expect(lost.issues).toEqual([]);expect(lost.corrections).toEqual([]);
  expect(a.update(p,600).issues[0].observedMs).toBe(0);
  const cropped=structuredClone(p);cropped[27].y=1.1;
  expect(a.update(cropped,800).issues).toEqual([]);
 });

 it('keeps sustained issue observations at slow inference rates without counting a repetition across the gaps',()=>{
  const p=frontalSquat();p[25].x=.48;p[26].x=.52;const a=createExercisePoseAnalyzer('squat');
  expect(a.update(p,0).issues[0].observedMs).toBe(0);
  const slow=a.update(p,800);expect(slow.issues[0].observedMs).toBe(800);expect(slow.reps).toBe(0);
  const interrupted=a.update(p,2300);expect(interrupted.issues[0].observedMs).toBe(0);expect(interrupted.reps).toBe(0);
 });

 it('rejects degenerate torso geometry even when every landmark has high model confidence',()=>{
  const p=frontalSquat();p[11]={...p[23]};p[12]={...p[24]};const r=analyze('squat',p);
  expect(r.detected).toBe(false);expect(r.reps).toBe(0);expect(r.issues).toEqual([]);expect(r.confidence).toBe(0);
 });
});

const fixtureFiles=import.meta.glob('./pose-fixtures/*.json',{eager:true,import:'default'});
for(const id of ['squat','lunge','push_up','plank','hip_hinge','side_lunge','glute_bridge'])it(`${id}: valid baseline produces no false correction`,()=>{
 const fixture=Object.values(fixtureFiles).find(f=>f.exercise===id),a=createExercisePoseAnalyzer(id);
 for(const f of fixture.scenarios.find(s=>s.name==='good').frames){const r=a.update(f.landmarks,f.time_ms);expect(r.detected).toBe(true);expect(r.issues).toEqual([]);expect(r.corrections).toEqual([]);}
});

it('counts a complete squat through visible poses but invalidates a repetition spanning tracking loss or a frame gap',()=>{
 const stand=pose([[11,.35,.2],[12,.65,.2],[23,.35,.45],[24,.65,.45],[25,.35,.65],[26,.65,.65],[27,.35,.9],[28,.65,.9]]);
 const mid=pose([[11,.4,.25],[12,.6,.25],[23,.43,.5],[24,.57,.5],[25,.3,.65],[26,.7,.65],[27,.3,.9],[28,.7,.9]]);
 const low=pose([[11,.4,.4],[12,.6,.4],[23,.45,.67],[24,.55,.67],[25,.3,.7],[26,.7,.7],[27,.3,.95],[28,.7,.95]]);
 const sequence=[stand,stand,stand,mid,low,low,mid,stand];
 const a=createExercisePoseAnalyzer('squat');let r;
 sequence.forEach((p,i)=>{r=a.update(p,i*200);});expect(r.reps).toBe(1);
 const b=createExercisePoseAnalyzer('squat');sequence.forEach((p,i)=>{r=b.update(i===4?[]:p,i*200);});expect(r.reps).toBe(0);
 const c=createExercisePoseAnalyzer('squat');sequence.forEach((p,i)=>{r=c.update(p,i*200+(i>=4?1000:0));});expect(r.reps).toBe(0);
});

it('calibrates a continuously visible body at slow phone inference rates and resets after a longer gap',()=>{
 const p=frontalSquat();p[0]={x:.5,y:.1,z:0,visibility:.99};const c=new PoseCalibration();
 for(let t=0;t<3200;t+=800)expect(c.update([p],t).ready).toBe(false);
 expect(c.update([p],3200).ready).toBe(true);expect(c.update([p],4700).ready).toBe(false);
 expect(c.update([p,p],5500).ready).toBe(false);
});

it('counts a comfortable supine bridge without demanding more extension than the movement guide',()=>{
 const bridge=hipY=>pose([[11,.2,.8],[12,.2,.82],[23,.4,hipY],[24,.4,hipY+.02],[25,.6,.6],[26,.6,.62],[27,.65,.85],[28,.65,.87]]);
 const start=bridge(.8),mid=bridge(.76),top=bridge(.745),a=createExercisePoseAnalyzer('glute_bridge');let r;
 expect(analyze('glute_bridge',top).angle).toBeLessThan(161);
 for(const [i,p] of [start,start,start,mid,top,top,mid,start].entries()){
  r=a.update(p,i*200);expect(r.detected).toBe(true);expect(r.issues).toEqual([]);
 }
 expect(r.reps).toBe(1);expect(r.repetition_count).toBe(1);
});
