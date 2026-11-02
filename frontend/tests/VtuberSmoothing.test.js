import {it,expect} from 'vitest';
import source from '../src/health/components/character/assets/vtuber/female.json';
import {VTUBER_OUTFITS} from '../src/health/components/character/vtuberOptions.js';
import {customizeVtuberData} from '../src/health/components/character/vtuberAppearance.js';
import {prepareDetailedModel,poseDetailedModel} from '../src/health/components/character/detailedModel.js';
import {createVtuberSmoothing} from '../src/health/components/character/vtuberSmoothing.js';
import {applyAthleteHighlights} from '../src/health/components/exercise/instructionMannequin.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';

it('refines visible curves while preserving the rig and independently welded UV seams',()=>{
 const d=customizeVtuberData(source,{vtuberOutfit:'crop'}),model=prepareDetailedModel(d),original=model.base.slice(),s=createVtuberSmoothing(model);
 try{
  expect(s.geometry.index.count).toBe(model.geometry.index.count*4);
  expect(s.geometry.attributes.position.count).toBeLessThan(100000);
  expect(s.geometry.groups.map(g=>g.count)).toEqual(d.groups.map(g=>g.length*4));
  expect(model.base).toEqual(original);expect(model.geometry.attributes.position.count).toBe(d.weights.length);
  for(const row of s.stencils){expect(row.reduce((n,[,w])=>n+w,0)).toBeCloseTo(1,6);expect(row.every(([,w])=>w>=0)).toBe(true);}
  let changed=0;
  for(let i=0;i<d.weights.length;i++){
   const row=s.stencils[s.vertexIds[i]],hand=d.weights[i].some(([bone,w])=>bone>=12&&w>.2);
   if(hand)expect(row).toHaveLength(1);
   const delta=Math.hypot(...[0,1,2].map(k=>s.geometry.attributes.position.array[i*3+k]-original[i*3+k]));
   if(delta>.0001)changed++;
  }
  expect(changed).toBeGreaterThan(1000);
  const seen=new Map(),p=s.geometry.attributes.position.array;
  s.vertexIds.forEach((id,i)=>{const point=Array.from(p.slice(i*3,i*3+3));if(seen.has(id))expect(point).toEqual(seen.get(id));else seen.set(id,point);});
 }finally{s.dispose();model.geometry.dispose();}
},60000);

it('keeps the refined surface within posed support bounds across the exercise catalog',()=>{
 const d=customizeVtuberData(source,{vtuberOutfit:'crop',vtuberChest:1,vtuberHips:1,vtuberGlutes:1}),model=prepareDetailedModel(d),s=createVtuberSmoothing(model);
 try{
  const motions=[...new Set([...catalog,...STRETCHES].map(e=>e.motion_id))];
  expect(motions.length).toBeGreaterThan(90);
  for(const motion of motions){
   poseDetailedModel(model,motion,.5);s.update();
   const p=s.geometry.attributes.position.array,n=s.geometry.attributes.normal.array,box=model.geometry.boundingBox;
   expect(p.every(Number.isFinite),motion).toBe(true);expect(n.every(Number.isFinite),motion).toBe(true);
   let inside=true;for(let i=0;i<p.length;i+=3)for(let k=0;k<3;k++)if(p[i+k]<box.min.getComponent(k)-.000002||p[i+k]>box.max.getComponent(k)+.000002)inside=false;
   expect(inside,motion).toBe(true);
  }
 }finally{s.dispose();model.geometry.dispose();}
},60000);

it('preserves all six outfit atlases and expression surfaces with bounded refinement',()=>{
 for(const outfit of VTUBER_OUTFITS){
  const d=customizeVtuberData(source,{vtuberOutfit:outfit.id,vtuberChest:-1,vtuberHips:-1,vtuberGlutes:-1}),m=prepareDetailedModel(d),s=createVtuberSmoothing(m);
  try{
   expect(s.geometry.attributes.position.count,outfit.id).toBeLessThan(100000);
   expect(s.geometry.attributes.uv.count).toBe(s.geometry.attributes.position.count);
   expect(s.geometry.attributes.vtuberRest.array.every(Number.isFinite)).toBe(true);
   for(const name of ['EyeIris_00_EYE','EyeWhite_00_EYE','FaceEyeline_00_FACE','FaceMouth_00_FACE']){
    const g=d.groups[d.surfaceMaterials.findIndex(material=>material.name===name)];
    for(const i of new Set(g))expect(s.stencils[s.vertexIds[i]],name).toHaveLength(1);
   }
   for(const phase of [0,.25,.75,1]){poseDetailedModel(m,'wall_push',phase);s.update();expect(s.geometry.attributes.position.array.every(Number.isFinite),outfit.id).toBe(true);}
  }finally{s.dispose();m.geometry.dispose();}
 }
},60000);

it('attaches red muscle guidance to the refined surface without sliding during motion',()=>{
 const m=prepareDetailedModel(customizeVtuberData(source,{vtuberOutfit:'crop'})),s=createVtuberSmoothing(m);
 try{
  applyAthleteHighlights(s.geometry,1,'squat',[],s.guide);
  const attribute=s.geometry.attributes.exerciseHighlight,original=attribute.array.slice();
  expect(attribute.count).toBe(s.geometry.attributes.position.count);
  expect(original.some(value=>value>.5)).toBe(true);
  poseDetailedModel(m,'squat',.5);s.update();expect(attribute.array).toEqual(original);
 }finally{s.dispose();m.geometry.dispose();}
});
