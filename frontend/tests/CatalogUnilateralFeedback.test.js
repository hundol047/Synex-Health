import {it,expect} from 'vitest';
import {CatalogPoseAnalyzer} from '../src/health/components/exercise/catalogPoseAnalyzer.js';
import {poseFeedback} from '../src/health/components/exercise/poseFeedback.js';

function press(){
 const p=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));
 for(const [id,x,y] of [[11,.4,.3],[12,.6,.3],[23,.4,.65],[24,.6,.65],[13,.3,.35],[14,.7,.35],[15,.3,.1],[16,.7,.1],[25,.4,.8],[26,.6,.8],[27,.4,.95],[28,.6,.95]])p[id]={x,y,z:0,visibility:1};
 return p;
}
it('detects one displaced wrist without averaging it away, labels the side and clears after correction',()=>{
 const a=new CatalogPoseAnalyzer('shoulder_press'),p=press();
 expect(a.update(p,0).issues.filter(i=>i.metric==='wristStack')).toHaveLength(0);
 p[15].x=.08; // 63% of torso length on one side; bilateral mean is only 31%.
 let r;for(const t of [100,300,500,800])r=a.update(p,t);
 const left=r.issues.find(i=>i.metric==='wristStack');
 expect(left).toMatchObject({side:'왼쪽',observedMs:700});
 expect(poseFeedback('shoulder_press',r).differences.find(i=>i.metric==='wristStack').evidence).toContain('왼쪽');
 expect(r.observations.find(i=>i.label.includes('손목')).value).toContain('%');
 p[15].x=.3;p[16].x=.92;r=a.update(p,900);
 const right=r.issues.find(i=>i.metric==='wristStack');
 expect(right).toMatchObject({side:'오른쪽',observedMs:0});
 expect(right.id).not.toBe(left.id);
 p[16].x=.7;
 expect(a.update(p,1000).issues.some(i=>i.metric==='wristStack')).toBe(false);
});
