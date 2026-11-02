import {it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Vector3,Quaternion} from 'three';
import female from '../src/health/components/character/assets/studio/female.json';
import male from '../src/health/components/character/assets/trainer/male.json';
import {studioTrainerData} from '../src/health/components/character/studioTrainer.js';
import {prepareDetailedModel,poseDetailedModel,detailedFloorOffset} from '../src/health/components/character/detailedModel.js';
import {REST,poseJoints,rigRotation} from '../src/health/components/exercise/rig.js';
import {calibrateHandFrames,handRestFrame} from '../src/health/components/exercise/exerciseGrip.js';
import {CLASP_MOTIONS} from '../src/health/components/exercise/handPoses.js';
import {normalizeCharacter,saveCharacter,readCharacter} from '../src/health/components/character/character.js';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
import texture from '../src/health/components/character/assets/authored/studio-head.json';
import {applyAthleteHighlights} from '../src/health/components/exercise/instructionMannequin.js';
const v=p=>new Vector3(...p);
const dispose=m=>{m.geometry.dispose();m.rigidHeadGeometry?.dispose();};

it('bundles the generated skin locally with verifiable source and output provenance',()=>{
 const bytes=fs.readFileSync(new URL('../src/health/components/character/assets/authored/'+texture.map,import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(texture.packedMapSha256);
 expect(texture.sourceLicense).toBe('CC BY 4.0');expect(texture.generatedImageSha256).toMatch(/^[a-f0-9]{64}$/);
 expect(bytes.length).toBeLessThan(350000);
});

it('fits a rotated palm surface rather than assuming every imported hand has the same normal',()=>{
 const {wrist,along,back}=handRestFrame(REST,0),normal=back.clone().applyAxisAngle(along,.40),across=normal.clone().cross(along),base=[],weights=[];
 for(let i=0;i<15;i++)for(let j=0;j<11;j++)for(const side of [-1,1]){
  base.push(...v(REST[wrist]).addScaledVector(along,.02+.20*i/14).addScaledVector(across,(j-5)*.006).addScaledVector(normal,side*.007).toArray());weights.push([[12,1]]);
 }
 const fitted=calibrateHandFrames(base,weights,REST);
 expect(v(fitted[0].back).angleTo(normal)).toBeLessThan(.005);
 expect(fitted[1].back.every(Number.isFinite)).toBe(true);
});

it('saves the studio preset without replacing existing settings or workout records',()=>{
 localStorage.clear();localStorage.setItem('workout-record','retained');
 for(const body of ['female','male']){saveCharacter({model:'detailed',body,detailedStyle:'studio'});expect(readCharacter()).toMatchObject({body,detailedStyle:'studio'});}
 expect(localStorage.getItem('workout-record')).toBe('retained');
 expect(normalizeCharacter({model:'custom',hair:'#391d13'})).toMatchObject({model:'custom',hair:'#391d13'});
});

for(const source of [female,male]){
 const data=studioTrainerData(source),body=source.body;
 it(`${body}: keeps exercise-muscle colors on the same anatomical vertices after proportion changes`,()=>{
  const before=prepareDetailedModel(source),after=prepareDetailedModel(data);
  try{for(const motion of ['squat','curl','full_pushup']){
   applyAthleteHighlights(before.geometry,1,motion,[],before.guideBase);
   applyAthleteHighlights(after.geometry,1,motion,[],after.guideBase);
   expect(after.geometry.attributes.exerciseHighlight.array).toEqual(before.geometry.attributes.exerciseHighlight.array);
  }}finally{dispose(before);dispose(after);}
 });
 it(`${body}: changes model proportions together with the rig while retaining eyes, clothing and source data`,()=>{
  const old=source.positions.slice();expect(studioTrainerData(source)).toBe(data);expect(source.positions).toEqual(old);
  expect(data.rest[0][1]).toBeGreaterThan(REST[0][1]+.05);
  expect(data.rest[1][1]-data.rest[0][1]).toBeLessThan(REST[1][1]-REST[0][1]);
  expect(v(data.eyes[0]).distanceTo(v(data.eyes[1]))/v(source.eyes[0]).distanceTo(v(source.eyes[1]))).toBeCloseTo(.9,4);
  expect(data.weights).toBe(source.weights);expect(data.groups).toBe(source.groups);expect(data.uv).toBe(source.uv);
  const m=prepareDetailedModel(data,1.1);try{expect(m.rest.statureScale).toBe(1.1);expect(m.rest[0][1]).toBeCloseTo(1.005*1.1);}finally{dispose(m);}
 });
 it(`${body}: keeps clasped wrists below 40 degrees and transports their palm roll through the forearm`,()=>{
  const m=prepareDetailedModel(data);
  try{for(const motion of CLASP_MOTIONS)for(let frame=0;frame<=20;frame++){
   const p=poseJoints(motion,frame/20,m.rest);
   for(const side of [0,1]){
    const [e,w,f]=side?[7,8,18]:[4,5,17],fore=v(p[w]).sub(v(p[e])),hand=v(p[f]).sub(v(p[w]));
    expect(fore.angleTo(hand)*180/Math.PI,`${motion}/${side}`).toBeLessThan(40);
    expect(fore.length()).toBeCloseTo(v(m.rest[w]).distanceTo(v(m.rest[e])),6);
    const palm=rigRotation(p,12+side,m.rest),lower=rigRotation(p,3+side*2,m.rest);
    const localFore=v(m.rest[w]).sub(v(m.rest[e])).normalize().applyQuaternion(palm),target=fore.clone().normalize();
    const expected=new Quaternion().setFromUnitVectors(localFore,target).multiply(palm);
    expect(lower.angleTo(expected)).toBeLessThan(.0001);
   }
   expect(Math.abs(p[5][1]-p[8][1])).toBeLessThan(.03);
  }}finally{dispose(m);}
 });
 it(`${body}: renders all exercises and stretches with finite geometry, welded seams and correct wall/floor support`,()=>{
  const m=prepareDetailedModel(data),hairPoint=new Vector3(),first=new Map(),pairs=[];
  data.sourceVertices.forEach((s,i)=>{if(first.has(s))pairs.push([first.get(s),i]);else first.set(s,i);});
  try{for(const {motion_id:motion} of [...catalog,...STRETCHES])for(const t of [0,.25,.5,.75,1]){
   const p=poseDetailedModel(m,motion,t),a=m.geometry.attributes.position.array,n=m.geometry.attributes.normal.array;
   expect(a.every(Number.isFinite),`${motion}/${t}`).toBe(true);expect(m.geometry.boundingSphere.radius).toBeLessThan(2.5);
   for(let i=0;i<n.length;i+=3)if(Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1)>.001)throw Error(`${motion}: non-unit normal ${i}`);
   for(const [x,y] of pairs)if(Math.hypot(a[x*3]-a[y*3],a[x*3+1]-a[y*3+1],a[x*3+2]-a[y*3+2])>.00003)throw Error(`${motion}: separated UV seam`);
   if(Number.isFinite(p.equipment?.wallZ)){
    const rear=['wall_hinge','wall_sit'].includes(motion),wall=p.equipment.wallZ;let gap=Infinity;
    for(let i=2;i<a.length;i+=3)gap=Math.min(gap,rear?a[i]-wall:wall-a[i]);
    for(let i=0;i<(m.rigidHeadHull?.length||0);i+=3){hairPoint.fromArray(m.rigidHeadHull,i).applyQuaternion(m.rigidHeadRotation).add(m.rigidHeadPosition);gap=Math.min(gap,rear?hairPoint.z-wall:wall-hairPoint.z);}
    expect(gap,`${motion}/${t}`).toBeGreaterThan(-.002);
   }
   if(['squat','full_pushup','plank'].includes(motion))expect(m.geometry.boundingBox.min.y+detailedFloorOffset(m,p)).toBeCloseTo(.003,5);
  }}finally{dispose(m);}
 },120000);
}
