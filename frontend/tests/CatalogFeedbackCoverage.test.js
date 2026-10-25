import {it,expect} from 'vitest';
import {COACHING_CATALOG} from '../src/health/components/exercise/coachingCatalog.js';
import {createExercisePoseAnalyzer} from '../src/health/components/exercise/poseCoach.js';
import {poseFeedback} from '../src/health/components/exercise/poseFeedback.js';
import {poseJoints} from '../src/health/components/exercise/rig.js';
const mapping={0:2,11:3,12:6,13:4,14:7,15:5,16:8,23:9,24:12,25:10,26:13,27:11,28:14,29:11,30:14,31:15,32:16};
function projection(motion,phase,view){const joints=poseJoints(motion,phase),points=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));for(const [mp,joint] of Object.entries(mapping)){const [x,y,z]=joints[joint];points[mp]={x:.5+(view==='front'?x:view==='side'?z:(x+z)/Math.sqrt(2))*.29,y:.78-y*.29,z:0,visibility:1};}return points;}
const shifts=[[],[[11,12],'x',.10],[[11,12],'x',-.10],[[11],'y',.10],[[23],'y',.10],[[25,26],'x',.1],[[25],'x',-.1],[[13,14],'x',.1],[[13,14],'y',.1],[[15,16],'y',.15],[[15,16],'x',.15],[[27,28],'y',.12],[[31,32],'y',-.10],[[11,12],'x',.24],[[11,12],'x',.32],[[27],'x',.15],[[28],'x',-.15],['straightKnee'],['bentKnees']];
const rows=[];
for(const c of Object.values(COACHING_CATALOG)){
 const messages=new Set(),observations=new Set(),issues=new Set(),examples=[];let detected=0;
 for(const view of c.views.includes('any')?['front','side','oblique']:c.views)for(const phase of [0,.125,.25,.5,.75])for(const shift of shifts){
  const p=projection(c.motionId,phase,view);if(shift[0]==='straightKnee'){for(const s of [0,1])for(const axis of ['x','y'])p[25+s][axis]=(p[23+s][axis]+p[27+s][axis])/2;}else if(shift[0]==='bentKnees'){for(const side of [0,1]){p[25+side].x=(p[23+side].x+p[27+side].x)/2+.12;p[25+side].y=(p[23+side].y+p[27+side].y)/2;}}else if(shift.length)for(const joint of shift[0])p[joint][shift[1]]+=shift[2];
  const r=createExercisePoseAnalyzer(c.id).update(p,100,1);if(!r.detected)continue;detected++;
  const f=poseFeedback(c.id,r);messages.add(f.message);observations.add(JSON.stringify(f.observations));for(const i of f.differences){issues.add(i.metric);if(!examples.some(e=>e.metric===i.metric))examples.push({metric:i.metric,message:i.message,evidence:i.evidence});}
 }
 rows.push({id:c.id,label:c.label,detected,messages:messages.size,observations:observations.size,issueTypes:[...issues],examples});
}

it('varies observed feedback for every exercise, with distinct correction conditions where observable',()=>{
 expect(rows).toHaveLength(74);
 for(const row of rows){expect(row.detected,row.id).toBeGreaterThan(0);expect(row.messages,row.id).toBeGreaterThan(1);expect(row.observations,row.id).toBeGreaterThan(1);expect(row.issueTypes.length,row.id).toBeGreaterThan(0);for(const example of row.examples)expect(example.message,row.id).toBeTruthy();}
});

