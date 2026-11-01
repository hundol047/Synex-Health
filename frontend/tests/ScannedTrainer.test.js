import {it,expect} from 'vitest';
import fs from 'node:fs';
import data from '../src/health/components/character/assets/scanned/female.json';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
const dispose=m=>m.geometry.dispose();
it('keeps traceable scan attribution and separate native-resolution face/eye maps',()=>{
 expect(data.sourceLicense).toMatchObject({author:'Renderpeople',license:'CC BY 4.0'});
 expect(data.sourceLicense.url).toContain('dc448c3be0e74f96a55fb475a13433cf');
 expect(data.refinement.faceResculpted).toBe(false);
 const names=new Set(data.surfaceMaterials.map(s=>s.map));expect(names.size).toBe(6);
 for(const map of names)expect(fs.existsSync(new URL('../src/health/components/character/assets/scanned/'+map,import.meta.url))).toBe(true);
 expect(data.positions.length/3).toBeLessThan(45000);expect(data.groups.reduce((n,g)=>n+g.length/3,0)).toBe(65900);
 for(const row of data.weights)expect(row.reduce((n,[,w])=>n+w,0)).toBeCloseTo(1,5);
});
it('retains authored eyelid closure without moving the eye globes or hands',()=>{
 const eyeVertices=new Set([4,15,19,20].flatMap(i=>data.groups[i]));
 for(const rows of Object.values(data.morphs)){
  expect(rows.length).toBeGreaterThan(50);
  for(const [i,x,y,z] of rows){expect(eyeVertices.has(i)).toBe(false);expect(data.positions[i*3+1]).toBeGreaterThan(1.58);expect(Math.hypot(x,y,z)).toBeLessThan(.035);}
 }
});
it('preserves finite surfaces and unit normals across every exercise and recovery stretch',()=>{
 const m=prepareDetailedModel(data);
 try{for(const {motion_id:motion} of [...catalog,...STRETCHES])for(const phase of [0,.25,.5,.75,1]){
  poseDetailedModel(m,motion,phase);expect(m.geometry.attributes.position.array.every(Number.isFinite),`${motion}/${phase}`).toBe(true);expect(m.geometry.boundingSphere.radius,`${motion}/${phase}`).toBeLessThan(2.5);
  const n=m.geometry.attributes.normal.array;
  for(let i=0;i<n.length;i+=3)if(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)>.001)throw new Error(`${motion}/${phase}: invalid normal ${i/3}`);
 }}finally{dispose(m);}
},120000);
it('keeps shared UV seam vertices welded under floor, wall and hand-supported poses',()=>{
 const first=new Map(),pairs=[];data.sourceVertices.forEach((s,i)=>{if(first.has(s))pairs.push([first.get(s),i]);else first.set(s,i);});expect(pairs.length).toBeGreaterThan(50);
 const m=prepareDetailedModel(data);
 try{for(const motion of ['squat','full_pushup','wall_push','curl','recovery_child']){
  poseDetailedModel(m,motion,.5);const p=m.geometry.attributes.position.array;
  for(const [a,b] of pairs)expect(Math.hypot(p[a*3]-p[b*3],p[a*3+1]-p[b*3+1],p[a*3+2]-p[b*3+2]),motion).toBeLessThan(.00003);
 }}finally{dispose(m);}
});
it('keeps body and hair clear of walls and respects floor or equipment support',()=>{
 const m=prepareDetailedModel(data);
 try{
  for(const motion of ['wall_push','close_wall_push','wall_hinge','wall_sit','calf_stretch'])for(let frame=0;frame<=16;frame++){
   const j=poseDetailedModel(m,motion,frame/16),p=m.geometry.attributes.position.array,w=j.equipment.wallZ,rear=['wall_hinge','wall_sit'].includes(motion);let gap=Infinity;
   for(let i=2;i<p.length;i+=3)gap=Math.min(gap,rear?p[i]-w:w-p[i]);expect(gap,`${motion}/${frame}`).toBeGreaterThan(-.002);
  }
  for(const motion of ['squat','full_pushup','plank']){const j=poseDetailedModel(m,motion,.5);expect(m.geometry.boundingBox.min.y+detailedFloorOffset(m,j)).toBeCloseTo(.003,5);}
  for(const motion of ['dumbbell_bench_press','leg_press','stationary_cycle']){const j=poseDetailedModel(m,motion,.5);expect(detailedFloorOffset(m,j)).toBe(0);}
 }finally{dispose(m);}
},30000);
