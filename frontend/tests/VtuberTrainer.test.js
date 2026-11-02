import {it,expect} from 'vitest';
import {Vector3} from 'three';
import data from '../src/health/components/character/assets/vtuber/female.json';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import {poseJoints} from '../src/health/components/exercise/rig.js';
import {CLASP_MOTIONS} from '../src/health/components/exercise/handPoses.js';
import {normalizeCharacter,readCharacter,saveCharacter} from '../src/health/components/character/character.js';
import {createVtuberMaterial,createVtuberOutline} from '../src/health/components/character/vtuberMaterials.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
const v=p=>new Vector3(...p);

it('retains the source permissions and native animated face instead of a realistic-face recolor',()=>{
 expect(data.sourceLicense).toMatchObject({authors:['pixiv Inc.'],commercialUsage:'corporation',allowRedistribution:true,modification:'allowModificationRedistribution'});
 expect(data.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
 for(const key of ['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight','vtuberRelaxed'])expect(data.morphs[key].length).toBeGreaterThan(100);
 expect(data.weights.length).toBeLessThan(30000);
});

it('persists the dedicated toon model while preserving records and old model choices',()=>{
 localStorage.clear();localStorage.setItem('saved-workout','retained');
 saveCharacter({model:'vtuber',body:'male',style:'realistic'});
 expect(readCharacter()).toMatchObject({model:'vtuber',body:'female',style:'toon'});
 expect(localStorage.getItem('saved-workout')).toBe('retained');
 for(const model of ['custom','detailed'])expect(normalizeCharacter({model,body:'male'})).toMatchObject({model,body:'male'});
});

it('uses toon surfaces and painted eyes without realistic skin highlights',()=>{
 const skin=createVtuberMaterial(data.surfaceMaterials[0],{}),cloth=createVtuberMaterial(data.surfaceMaterials[1],{}),eye=createVtuberMaterial(data.surfaceMaterials[6],{}),outline=createVtuberOutline(skin,data.surfaceMaterials[0]);
 try{expect(skin.isMeshBasicMaterial).toBe(true);expect(skin.toneMapped).toBe(false);expect(cloth.isMeshToonMaterial).toBe(true);expect(eye.isMeshBasicMaterial).toBe(true);expect(eye.toneMapped).toBe(false);expect(outline.side).toBe(1);}finally{skin.dispose();cloth.dispose();eye.dispose();outline.dispose();}
});

it('keeps the native eyes closed at the blink peak and resets deterministically when paused',()=>{
 const m=prepareDetailedModel(data);
 try{
  poseDetailedModel(m,'squat',0);const opened=m.expression.slice();
  poseDetailedModel(m,'squat',.777);const closed=m.expression.slice();
  expect(data.morphs.AK_09_EyeBlinkLeft.some(([i])=>v(opened.slice(i*3,i*3+3)).distanceTo(v(closed.slice(i*3,i*3+3)))>.005)).toBe(true);
  poseDetailedModel(m,'squat',0);expect(m.expression).toEqual(opened);
 }finally{m.geometry.dispose();}
});

it('keeps wrists below 40 degrees and arm lengths fixed for the smaller native hands',()=>{
 const m=prepareDetailedModel(data);
 try{for(const motion of CLASP_MOTIONS)for(let frame=0;frame<=30;frame++){
  const p=poseJoints(motion,frame/30,m.rest);
  for(const [e,w,f]of [[4,5,17],[7,8,18]]){
   const fore=v(p[w]).sub(v(p[e])),hand=v(p[f]).sub(v(p[w]));
   expect(fore.length()).toBeCloseTo(v(m.rest[w]).distanceTo(v(m.rest[e])),6);
   expect(fore.angleTo(hand)*180/Math.PI,`${motion}/${frame}`).toBeLessThan(40);
  }
 }}finally{m.geometry.dispose();}
});

it('renders every exercise and stretch without invalid geometry, open seams or wall penetration',()=>{
 const m=prepareDetailedModel(data),first=new Map(),pairs=[];
 data.sourceVertices.forEach((key,i)=>{if(first.has(key))pairs.push([first.get(key),i]);else first.set(key,i);});
 try{for(const {motion_id:motion}of [...catalog,...STRETCHES])for(const t of [0,.25,.5,.75,1]){
  const p=poseDetailedModel(m,motion,t),a=m.geometry.attributes.position.array,n=m.geometry.attributes.normal.array;
  expect(a.every(Number.isFinite),`${motion}/${t}`).toBe(true);expect(n.every(Number.isFinite)).toBe(true);
  expect(m.geometry.boundingSphere.radius,`${motion}/${t}`).toBeLessThan(2.5);
  for(const [x,y]of pairs)if(Math.hypot(a[x*3]-a[y*3],a[x*3+1]-a[y*3+1],a[x*3+2]-a[y*3+2])>.00003)throw Error(`${motion}: split seam`);
  if(Number.isFinite(p.equipment?.wallZ)){
   const rear=['wall_hinge','wall_sit'].includes(motion),wall=p.equipment.wallZ;let gap=Infinity;
   for(let i=2;i<a.length;i+=3)gap=Math.min(gap,rear?a[i]-wall:wall-a[i]);
   expect(gap,`${motion}/${t}`).toBeGreaterThan(-.002);
  }
  if(['squat','full_pushup','plank'].includes(motion))expect(m.geometry.boundingBox.min.y+detailedFloorOffset(m,p)).toBeCloseTo(.003,5);
 }}finally{m.geometry.dispose();}
},90000);
