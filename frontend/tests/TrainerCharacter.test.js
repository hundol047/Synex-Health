import {it,expect} from 'vitest';
import female from '../src/health/components/character/assets/trainer/female.json';
import male from '../src/health/components/character/assets/trainer/male.json';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';

for(const [body,data] of [['female',female],['male',male]]){
 it(`${body} trainer: uses a complete clothed model with separate skin, eyes, lashes and authored hair`,()=>{
  expect(data.weights.length).toBeLessThan(35000);
  expect(data.positions.length).toBe(data.weights.length*3);
  expect(data.surfaceMaterials.map(s=>s.kind)).toEqual(['Skin','Eyes','Eyebrows','Eyelashes','Hair','Clothes','Clothes','Clothes']);
  expect(data.surfaceMaterials.filter(s=>s.muscleGuide).map(s=>s.kind)).toEqual(['Skin','Clothes','Clothes']);
  expect(data.surfaceMaterials[7].muscleGuide).toBe(true);
  expect(data.surfaceMaterials[6].muscleGuide).toBe(false);
  for(const surface of data.surfaceMaterials){expect(surface.map).toMatch(/^[\w-]+\.webp$/);expect(surface.mapSourceHash).toMatch(/^[a-f0-9]{64}$/);}
  for(const row of data.weights)expect(row.reduce((s,[,w])=>s+w,0)).toBeCloseTo(1,4);
  // Export normalization must use the unclothed full-height base, before the
  // outfit masks the legs. Using exposed skin doubled the head and eye spacing.
  const eyeSeparation=Math.hypot(...data.eyes[0].map((v,k)=>v-data.eyes[1][k]));
  expect(eyeSeparation).toBeGreaterThan(.05);expect(eyeSeparation).toBeLessThan(.08);
 });
 it(`${body} trainer: retains the iris surface and excludes the separate opaque-looking cornea island`,()=>{
  const eyeVertices=new Set(data.groups[1]);expect(eyeVertices.size).toBeGreaterThan(300);
  for(const i of eyeVertices){
   expect(data.weights[i]).toEqual([[1,1]]);
   expect(data.uv[i*2]>.85&&data.uv[i*2+1]<.15).toBe(false);
  }
  for(const name of ['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight']){
   expect(data.morphs[name].length).toBeGreaterThan(50);
   for(const [i,x,y,z] of data.morphs[name]){expect(eyeVertices.has(i)).toBe(false);expect(Math.hypot(x,y,z)).toBeLessThan(.025);}
  }
 });
 it(`${body} trainer: keeps native face proportions rigid when the torso and head move`,()=>{
  const model=prepareDetailedModel(data),eyes=[...new Set(data.groups[1])];
  const distance=(p,a,b)=>Math.hypot(p[a*3]-p[b*3],p[a*3+1]-p[b*3+1],p[a*3+2]-p[b*3+2]);
  try{for(const motion of ['squat','wall_push','plank','dumbbell_bench_press']){
   poseDetailedModel(model,motion,.5);const p=model.geometry.attributes.position.array;
   for(let i=0;i<eyes.length-40;i+=40)expect(distance(p,eyes[i],eyes[i+40])).toBeCloseTo(distance(model.base,eyes[i],eyes[i+40]),5);
  }}finally{model.geometry.dispose();}
 });
 it(`${body} trainer: has finite surfaces and unit normals across every exercise and recovery stretch`,()=>{
  const model=prepareDetailedModel(data);
  try{for(const {motion_id:motion} of [...catalog,...STRETCHES])for(const phase of [0,.25,.5,.75,1]){
   poseDetailedModel(model,motion,phase);
   expect(model.geometry.attributes.position.array.every(Number.isFinite),`${motion}/${phase}`).toBe(true);
   expect(model.geometry.boundingSphere.radius,`${motion}/${phase}`).toBeLessThan(2.5);
   const normals=model.geometry.attributes.normal.array;
   for(let i=0;i<normals.length;i+=3){const length=Math.hypot(normals[i],normals[i+1],normals[i+2]);if(Math.abs(length-1)>.001)throw new Error(`${motion}/${phase}: invalid normal ${i/3}: ${length}`);}
  }}finally{model.geometry.dispose();}
 },60000);
 it(`${body} trainer: keeps skin, clothing and hair in front of support walls and free feet on the floor`,()=>{
  const model=prepareDetailedModel(data);
  try{for(const motion of ['wall_push','close_wall_push','wall_hinge','wall_sit','calf_stretch'])for(let f=0;f<=16;f++){
   const joints=poseDetailedModel(model,motion,f/16),z=joints.equipment.wallZ,rear=['wall_hinge','wall_sit'].includes(motion);let gap=Infinity;
   const p=model.geometry.attributes.position.array;for(let i=2;i<p.length;i+=3)gap=Math.min(gap,rear?p[i]-z:z-p[i]);
   expect(gap,`${motion}/${f}`).toBeGreaterThan(-.002);
  }
  for(const motion of ['squat','wall_push','curl']){const joints=poseDetailedModel(model,motion,.5);expect(model.geometry.boundingBox.min.y+detailedFloorOffset(model,joints)).toBeCloseTo(.003,6);}
  for(const motion of ['dumbbell_bench_press','leg_press','stationary_cycle']){const joints=poseDetailedModel(model,motion,.5);expect(detailedFloorOffset(model,joints)).toBe(0);}
  }finally{model.geometry.dispose();}
 },30000);
 it(`${body} trainer: finger grips leave the face and opposite arm unchanged`,()=>{
  for(const shape of ['relaxed','clasp','closed'])for(let side=0;side<2;side++){
   const rows=data.grips[shape][side];expect(rows.length).toBeGreaterThan(30);
   for(const [i,x,y,z] of rows){expect(data.weights[i].some(([b,w])=>b===12+side&&w>0)).toBe(true);expect(data.positions[i*3+1]).toBeLessThan(1.3);expect(Math.hypot(x,y,z)).toBeLessThan(.16);}
  }
 });
}
