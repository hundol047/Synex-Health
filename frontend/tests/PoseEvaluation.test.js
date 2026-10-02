import {it,expect} from 'vitest';
import {evaluate} from '../scripts/evaluate-pose.mjs';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
it('rejects high-visibility landmarks outside camera frame',()=>{
 const points=Array.from({length:33},()=>({x:-.2,y:.3,z:0,visibility:1}));
 const result=createExercisePoseAnalyzer('curl').update(points,100);
 expect(result.detected).toBe(false);expect(result.corrections).toEqual([]);expect(result.reps).toBe(0);
});
it('reports actual count errors and missing coverage without claiming validation',()=>{
 const result=evaluate({sessions:[{participant_id:'synthetic-1',device:'fixture',lighting:'fixture',view:'front',exercise:'squat',expected_reps:2,frames:[{time_ms:0,landmarks:[],expected_visible:false}]}]});
 expect(result.real_data_attested).toBe(false);expect(result.per_exercise.squat.mean_absolute_error).toBe(2);expect(result.per_exercise.squat.tracking_coverage).toBe(0);expect(result.missing_exercises).toContain('curl');
 expect(()=>evaluate({sessions:[]})).toThrow();
});
it('validates raw frame bounds before correcting portrait coordinates',()=>{
 const points=Array.from({length:33},()=>({x:.5,y:.3,z:0,visibility:1}));
 for(const [i,x,y] of [[23,.4,.4],[25,.4,.65],[27,.4,.9],[24,.6,.4],[26,.6,.65],[28,.6,.9]])points[i]={x,y,z:0,visibility:1};
 for(const ratio of [480/640,640/480]){
  const result=createExercisePoseAnalyzer('squat').update(points,100,ratio);
  expect(result.detected).toBe(true);expect(result.angle).toBe(180);
 }
 points[27].y=1.1;
 expect(createExercisePoseAnalyzer('squat').update(points,100,.75).detected).toBe(false);
});
const fixture=entries=>{const p=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));for(const [i,x,y] of entries)p[i]={x,y,z:0,visibility:1};return p;};
const plank=()=>fixture([[11,.2,.3],[12,.2,.4],[13,.22,.5],[14,.22,.6],[23,.5,.3],[24,.5,.4],[27,.8,.3],[28,.8,.4]]);
const squat=()=>fixture([[11,.35,.2],[12,.65,.2],[23,.45,.45],[24,.55,.45],[25,.48,.65],[26,.52,.65],[27,.3,.9],[28,.7,.9]]);
it('does not count standing upright or missing arm support as a plank',()=>{
 const p=fixture([[11,.4,.2],[12,.6,.2],[23,.4,.5],[24,.6,.5],[27,.4,.9],[28,.6,.9]]),a=createExercisePoseAnalyzer('plank');let r;
 for(let t=0;t<=3000;t+=150)r=a.update(p,t);
 expect(r.detected).toBe(false);expect(r.seconds).toBe(0);expect(r.movement_phase).toBe('unknown');
 const unsupported=plank();unsupported[13].y=.1;expect(a.update(unsupported,3150).detected).toBe(false);
});
it('counts the same supported hold duration at different inference rates',()=>{
 for(const interval of [150,300,500]){const a=createExercisePoseAnalyzer('plank');let r;for(let t=0;t<=3000;t+=interval)r=a.update(plank(),t);expect(r.seconds).toBe(3);expect(r.detected).toBe(true);}
});
it('does not add tracking gaps or backward timestamps to hold duration',()=>{
 const a=createExercisePoseAnalyzer('plank');a.update(plank(),0);a.update(plank(),500);a.update(plank(),3000);expect(a.update(plank(),3500).seconds).toBe(1);
 a.update([],3600);a.update(plank(),8000);expect(a.update(plank(),8500).seconds).toBe(1);
 expect(a.update(plank(),8400).seconds).toBe(1);
});
it('routes visible frontal squat knee feedback through the active analyzer',()=>{
 const r=createExercisePoseAnalyzer('squat').update(squat(),100);expect(r.corrections.join(' ')).toContain('무릎이 안쪽');
});
it('routes side-view trunk feedback but suppresses it when shoulders are uncertain',()=>{
 const p=squat();p[11]={x:.2,y:.35,z:0,visibility:1};p[12]={x:.22,y:.35,z:0,visibility:1};
 expect(createExercisePoseAnalyzer('squat').update(p,100).corrections.join(' ')).toContain('상체 기울기');
 p[11].visibility=.2;expect(createExercisePoseAnalyzer('squat').update(p,200).corrections).toEqual([]);
 p[11].visibility=1;p[11].x=-.1;expect(createExercisePoseAnalyzer('squat').update(p,300).corrections).toEqual([]);
});
it('rejects non-finite joint confidence instead of reporting tracked movement',()=>{
 const p=squat();p[25].visibility=NaN;const r=createExercisePoseAnalyzer('squat').update(p,100);expect(r.detected).toBe(false);expect(r.corrections).toEqual([]);
});
