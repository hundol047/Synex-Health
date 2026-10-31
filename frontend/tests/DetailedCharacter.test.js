import {it,expect} from 'vitest';
import female from '../src/health/components/character/assets/detailed/female.json';
import male from '../src/health/components/character/assets/detailed/male.json';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import {normalizeCharacter,saveCharacter,readCharacter,DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';

it('preserves the chosen model without changing health records or legacy customization',()=>{
 localStorage.setItem('health-record','unchanged');
 saveCharacter({...DEFAULT_CHARACTER,model:'detailed',body:'female'});
 expect(readCharacter()).toMatchObject({model:'detailed',body:'female'});
 expect(normalizeCharacter({model:'unknown'}).model).toBe('custom');
 expect(normalizeCharacter({body:'female',eyes:'#356ba5'})).toMatchObject({model:'custom',eyes:'#356ba5'});
 expect(localStorage.getItem('health-record')).toBe('unchanged');
});
for(const [body,data] of [['female',female],['male',male]]){
 it(`${body}: keeps all facial vertices attached to the head, including differently capitalized upper-lip bones`,()=>{
  expect(data.positions.length/3).toBeLessThan(15000);expect(data.sourceVertices.length).toBe(data.weights.length);
  for(let i=0;i<data.weights.length;i++){
   expect(data.weights[i].reduce((s,[,w])=>s+w,0)).toBeCloseTo(1,4);
   // The throat blends to the torso; the mouth/eyes above it must not.
   if(data.positions[i*3+1]>1.57&&data.positions[i*3+2]>.075)expect(data.weights[i].find(([bone])=>bone===1)?.[1]||0,`head vertex ${i}`).toBeGreaterThan(.99);
  }
  for(const name of ['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight']){
   expect(data.morphs[name].length).toBeGreaterThan(20);
   for(const [i,x,y,z] of data.morphs[name]){expect(data.positions[i*3+1]).toBeGreaterThan(1.60);expect(Math.hypot(x,y,z)).toBeLessThan(.025);}
  }
 });
 it(`${body}: preserves finite surfaces for every exercise and recovery stretch`,()=>{
  const model=prepareDetailedModel(data),other=prepareDetailedModel(data);
  try{
   expect(other.geometry).not.toBe(model.geometry);
   for(const {motion_id:id} of [...catalog,...STRETCHES])for(const phase of [0,.25,.5,.75,1]){
    poseDetailedModel(model,id,phase);
    const pos=model.geometry.attributes.position.array;
    expect(pos.every(Number.isFinite),`${id}/${phase}`).toBe(true);
    expect(model.geometry.boundingSphere.radius,`${id}/${phase} radius`).toBeLessThan(2.5);
    expect(model.geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
   }
  }finally{model.geometry.dispose();other.geometry.dispose();}
 },60000);
 it(`${body}: fits the complete surface to support walls through the whole repetition`,()=>{
  const model=prepareDetailedModel(data);
  try{
   for(const id of ['wall_push','close_wall_push','wall_hinge','wall_sit','calf_stretch'])for(let f=0;f<=16;f++){
    const joints=poseDetailedModel(model,id,f/16),z=joints.equipment.wallZ,rear=['wall_hinge','wall_sit'].includes(id);let gap=Infinity;
    const p=model.geometry.attributes.position.array;for(let i=2;i<p.length;i+=3)gap=Math.min(gap,rear?p[i]-z:z-p[i]);
    expect(gap,`${id}/${f}`).toBeGreaterThan(-.002);
   }
  }finally{model.geometry.dispose();}
 },30000);
 it(`${body}: grounds free demonstrations without pulling machines and benches to the floor`,()=>{
  const model=prepareDetailedModel(data);
  try{
   for(const id of ['shoulder_roll','squat','wall_push','curl'])for(const phase of [0,.5]){
    const joints=poseDetailedModel(model,id,phase),offset=detailedFloorOffset(model,joints);
    expect(model.geometry.boundingBox.min.y+offset).toBeCloseTo(.003,6);
   }
   for(const id of ['leg_extension','seated_leg_curl','dumbbell_bench_press','leg_press','stationary_cycle','treadmill_walk','elliptical']){
    const joints=poseDetailedModel(model,id,.5);expect(detailedFloorOffset(model,joints),id).toBe(0);
   }
  }finally{model.geometry.dispose();}
 });
 it(`${body}: curls authored finger joints while keeping face, wrist and opposite hand stationary`,()=>{
  for(const shape of ['relaxed','clasp','closed'])for(let side=0;side<2;side++){
   const rows=data.grips[shape][side];expect(rows.length).toBeGreaterThan(30);
   for(const [i,x,y,z] of rows){
    expect(data.weights[i].some(([b,w])=>b===12+side&&w>.5)).toBe(true);
    expect(data.positions[i*3+1]).toBeLessThan(1.3);expect(Math.hypot(x,y,z)).toBeLessThan(.16);
   }
  }
 });
}
