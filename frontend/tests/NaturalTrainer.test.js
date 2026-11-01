import {it,expect} from 'vitest';
import {Vector3} from 'three';
import female from '../src/health/components/character/assets/scanned/female.json';
import male from '../src/health/components/character/assets/trainer/male.json';
import {naturalTrainerData,naturalPortraitPoint} from '../src/health/components/character/naturalTrainer.js';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import {normalizeCharacter,saveCharacter,readCharacter} from '../src/health/components/character/character.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';

it('keeps the selected detailed style across saves without replacing existing records',()=>{
 localStorage.clear();localStorage.setItem('existing-record','keep');
 expect(normalizeCharacter({model:'detailed',body:'female'}).detailedStyle).toBe('natural');
 for(const detailedStyle of ['original','natural']){
  saveCharacter({model:'detailed',body:'female',detailedStyle});
  expect(readCharacter()).toMatchObject({model:'detailed',body:'female',detailedStyle});
  expect(localStorage.getItem('existing-record')).toBe('keep');
 }
 expect(normalizeCharacter({detailedStyle:'bad'}).detailedStyle).toBe('natural');
});

for(const source of [female,male]){
 const data=naturalTrainerData(source),body=source.body;
 it(`${body}: refines only the portrait and preserves source, eyes, body and rig`,()=>{
  const original=JSON.stringify(source),again=naturalTrainerData(source);
  expect(JSON.stringify(source)).toBe(original);expect(again.positions).toEqual(data.positions);
  expect(data.positions).not.toEqual(source.positions);
  expect(data.weights).toBe(source.weights);expect(data.groups).toBe(source.groups);
  expect(data.grips).toBe(source.grips);expect(data.eyes).toBe(source.eyes);
  let largest=0;
  for(let i=0;i<source.positions.length;i+=3){
   if(source.positions[i+1]<=1.54)for(let k=0;k<3;k++)if(data.positions[i+k]!==source.positions[i+k])throw Error('Body or hands changed');
   largest=Math.max(largest,Math.hypot(...[0,1,2].map(k=>data.positions[i+k]-source.positions[i+k])));
  }
  expect(largest).toBeLessThan(.009);
  for(let g=0;g<data.groups.length;g++)if(data.surfaceMaterials[g].kind==='Eyes')for(const i of new Set(data.groups[g])){
   expect(data.positions.slice(i*3,i*3+3)).toEqual(source.positions.slice(i*3,i*3+3));
  }
 });
 it(`${body}: keeps full native eyelid closure after relaxing the resting lids`,()=>{
  for(const [name,rows] of Object.entries(source.morphs)){
   const changed=new Map(data.morphs[name].map(([i,...d])=>[i,d]));
   for(const [i,...delta] of rows){
    const target=naturalPortraitPoint(delta.map((v,k)=>source.positions[i*3+k]+v),source.eyes,body);
    const closed=changed.get(i).map((v,k)=>data.positions[i*3+k]+v);
    expect(Math.hypot(...closed.map((v,k)=>v-target[k]))).toBeLessThan(1e-8);
   }
  }
 });
 it(`${body}: retains welded seams and does not reverse portrait triangles`,()=>{
  const first=new Map();
  data.sourceVertices.forEach((s,i)=>{if(first.has(s))expect(data.positions.slice(i*3,i*3+3)).toEqual(data.positions.slice(first.get(s)*3,first.get(s)*3+3));else first.set(s,i);});
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),old=new Vector3(),next=new Vector3();
  const normal=(p,ids,out)=>out.copy(b.fromArray(p,ids[1]*3).sub(a.fromArray(p,ids[0]*3))).cross(c.fromArray(p,ids[2]*3).sub(a));
  for(const group of data.groups)for(let t=0;t<group.length;t+=3){
   const ids=group.slice(t,t+3);if(ids.every(i=>source.positions[i*3+1]<1.54))continue;
   normal(source.positions,ids,old);normal(data.positions,ids,next);
   if(old.lengthSq()>1e-18)expect(old.dot(next),`triangle ${ids}`).toBeGreaterThan(0);
  }
 });
 it(`${body}: keeps all exercise/stretch poses finite and preserves support contacts`,()=>{
  const model=prepareDetailedModel(data);
  try{for(const {motion_id:motion} of [...catalog,...STRETCHES])for(const progress of [0,.25,.5,.75,1]){
   const joints=poseDetailedModel(model,motion,progress),p=model.geometry.attributes.position.array,n=model.geometry.attributes.normal.array;
   expect(p.every(Number.isFinite),`${motion}/${progress}`).toBe(true);expect(model.geometry.boundingSphere.radius).toBeLessThan(2.5);
   for(let i=0;i<n.length;i+=3)if(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)>.001)throw Error(`${motion}: normal ${i/3}`);
   if(Number.isFinite(joints.equipment?.wallZ)){
    const wall=joints.equipment.wallZ,rear=['wall_hinge','wall_sit'].includes(motion);let gap=Infinity;
    for(let i=2;i<p.length;i+=3)gap=Math.min(gap,rear?p[i]-wall:wall-p[i]);
    expect(gap,`${motion}/${progress}`).toBeGreaterThan(-.002);
   }
   if(['squat','full_pushup','plank'].includes(motion))expect(model.geometry.boundingBox.min.y+detailedFloorOffset(model,joints)).toBeCloseTo(.003,5);
  }}finally{model.geometry.dispose();}
 },120000);
}
