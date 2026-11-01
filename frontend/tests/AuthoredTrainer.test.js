import {it,expect} from 'vitest';
import {Vector3} from 'three';
import data from '../src/health/components/character/assets/authored/female.json';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import {deformSurface} from '../src/health/components/exercise/rig.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';

const dispose=m=>{m.geometry.dispose();m.rigidHeadGeometry.dispose();};
it('retains the source face, eye layers and dense authored hair with its attribution',()=>{
 expect(data.sourceLicense.author).toBe('Jungle Jim');expect(data.sourceLicense.license).toBe('CC BY 4.0');
 expect(data.weights.length).toBeLessThan(35000);
 expect(data.rigidHead.positions.length/3).toBeGreaterThan(60000);
 expect(data.surfaceMaterials.filter(s=>s.kind==='Eyes')).toHaveLength(2);
 expect(data.surfaceMaterials.some(s=>s.name==='Std_Eye_R')).toBe(false);
 const head=data.surfaceMaterials.findIndex(s=>s.name==='Std_Skin_Head');
 for(const index of new Set(data.groups[head]))if(data.positions[index*3+1]>1.56)expect(data.weights[index]).toEqual([[1,1]]);
 for(const rows of data.weights)expect(rows.reduce((s,[,w])=>s+w,0)).toBeCloseTo(1,4);
 for(let i=0;i<data.rigidHead.normals.length;i+=3)expect(Math.hypot(...data.rigidHead.normals.slice(i,i+3))).toBeCloseTo(1,3);
});
it('keeps the shared head/body boundary welded while retaining the source neck blend',()=>{
 const headGroup=data.surfaceMaterials.findIndex(s=>s.name==='Std_Skin_Head'),bodyGroup=data.surfaceMaterials.findIndex(s=>s.name==='Std_Skin_Body');
 const head=new Map([...new Set(data.groups[headGroup])].map(i=>[data.sourceVertices[i],i]));
 const pairs=[...new Set(data.groups[bodyGroup])].filter(i=>head.has(data.sourceVertices[i])).map(i=>[head.get(data.sourceVertices[i]),i]);
 expect(pairs.length).toBeGreaterThan(5);
 const model=prepareDetailedModel(data);
 try{for(const motion of ['squat','full_pushup','wall_push','recovery_child','recovery_neck_side']){
  poseDetailedModel(model,motion,.5);const p=model.geometry.attributes.position.array;
  for(const [a,b] of pairs)expect(Math.hypot(p[a*3]-p[b*3],p[a*3+1]-p[b*3+1],p[a*3+2]-p[b*3+2]),motion).toBeLessThan(.00003);
 }}finally{dispose(model);}
});
it('moves rigid hair exactly with the existing head deformation without rewriting its vertices',()=>{
 const model=prepareDetailedModel(data),local=model.rigidHeadGeometry.attributes.position,original=local.array.slice();
 const hair=data.rigidHead.positions,base=Float32Array.from(hair),weights=Array.from({length:hair.length/3},()=>[[1,1]]),expected=new Float32Array(hair.length),p=new Vector3();
 try{for(const motion of ['squat','full_pushup','wall_push','dumbbell_bench_press','recovery_child']){
  const joints=poseDetailedModel(model,motion,.5);deformSurface(base,weights,joints,expected,model.rest,false);
  for(let i=0;i<hair.length;i+=3*97){
   p.fromArray(local.array,i).applyQuaternion(model.rigidHeadRotation).add(model.rigidHeadPosition);
   expect(p.distanceTo(new Vector3().fromArray(expected,i))).toBeLessThan(.000001);
  }
 }
 expect(local.array).toEqual(original);expect(local.version).toBe(0);
 }finally{dispose(model);}
});
it('keeps finite body surfaces, normals and complete bounds through all 74 exercises and 30 stretches',()=>{
 const model=prepareDetailedModel(data);
 try{for(const {motion_id:motion} of [...catalog,...STRETCHES])for(const phase of [0,.25,.5,.75,1]){
  poseDetailedModel(model,motion,phase);
  expect(model.geometry.attributes.position.array.every(Number.isFinite),`${motion}/${phase}`).toBe(true);
  expect(model.geometry.boundingSphere.radius,`${motion}/${phase}`).toBeLessThan(2.5);
  const n=model.geometry.attributes.normal.array;
  for(let i=0;i<n.length;i+=3)if(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)>.001)throw new Error(`${motion}/${phase}: invalid normal ${i/3}`);
 }}finally{dispose(model);}
},120000);
it('keeps the complete hair silhouette and body on the safe side of walls',()=>{
 const model=prepareDetailedModel(data),p=new Vector3();
 try{for(const motion of ['wall_push','close_wall_push','wall_hinge','wall_sit','calf_stretch'])for(let frame=0;frame<=16;frame++){
  const joints=poseDetailedModel(model,motion,frame/16),wall=joints.equipment.wallZ,rear=['wall_hinge','wall_sit'].includes(motion);let gap=Infinity;
  const v=model.geometry.attributes.position.array;
  for(let i=2;i<v.length;i+=3)gap=Math.min(gap,rear?v[i]-wall:wall-v[i]);
  const hull=model.rigidHeadHull;
  for(let i=0;i<hull.length;i+=3){p.fromArray(hull,i).applyQuaternion(model.rigidHeadRotation).add(model.rigidHeadPosition);gap=Math.min(gap,rear?p.z-wall:wall-p.z);}
  expect(gap,`${motion}/${frame}`).toBeGreaterThan(-.002);
 }}finally{dispose(model);}
},30000);
it('includes rigid hair in floor support and retains anchored bench/machine heights',()=>{
 const model=prepareDetailedModel(data),p=new Vector3();
 try{for(const motion of ['full_pushup','plank','squat']){
  const joints=poseDetailedModel(model,motion,.5);let lowest=Infinity;
  const hair=model.rigidHeadGeometry.attributes.position.array;
  for(let i=0;i<hair.length;i+=3){p.fromArray(hair,i).applyQuaternion(model.rigidHeadRotation).add(model.rigidHeadPosition);lowest=Math.min(lowest,p.y);}
  const body=model.geometry.attributes.position.array;for(let i=1;i<body.length;i+=3)lowest=Math.min(lowest,body[i]);
  expect(lowest+detailedFloorOffset(model,joints)).toBeCloseTo(.003,5);
 }
 for(const motion of ['dumbbell_bench_press','leg_press','stationary_cycle']){const joints=poseDetailedModel(model,motion,.5);expect(detailedFloorOffset(model,joints)).toBe(0);}
 }finally{dispose(model);}
});
it('keeps native finger curls isolated from the head and opposite arm',()=>{
 for(const state of ['relaxed','clasp','closed'])for(let side=0;side<2;side++){
  const rows=data.grips[state][side];expect(rows.length).toBeGreaterThan(50);
  for(const [i,x,y,z] of rows){expect(data.weights[i].some(([b,w])=>b===12+side&&w>0)).toBe(true);expect(data.positions[i*3+1]).toBeLessThan(1.3);expect(Math.hypot(x,y,z)).toBeLessThan(.16);}
 }
});
