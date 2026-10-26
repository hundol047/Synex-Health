import {it,expect} from 'vitest';
import {Vector3} from 'three';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
import catalog from '../src/shared/lib/localCatalog.json';
import {REST,bindSurface,poseJoints,rigRotation} from '../src/health/components/exercise/rig.js';
import {gripSurface} from '../src/health/components/exercise/exerciseGrip.js';
import {displayBodyBase} from '../src/health/components/body3d/displaySurface.js';
const v=point=>new Vector3(...point);
it('avoids stretched finger-web spikes on both hand profiles',()=>{
 for(const gender of ['male','female']){
  const base=Float32Array.from(mesh.profiles[gender],x=>x*mesh.scale),weights=bindSurface(base);
  for(const shape of ['relaxed','clasp','closed']){
   const posed=gripSurface(base,weights,REST,shape);
   for(let i=0;i<mesh.indices.length;i+=3)for(let k=0;k<3;k++){
    const a=mesh.indices[i+k],b=mesh.indices[i+(k+1)%3];
    if(!weights[a].some(([bone,w])=>bone>=12&&w>.8)||!weights[b].some(([bone,w])=>bone>=12&&w>.8))continue;
    const before=new Vector3().fromArray(base,a*3).distanceTo(new Vector3().fromArray(base,b*3));
    if(before<.001)continue;
    const after=new Vector3().fromArray(posed,a*3).distanceTo(new Vector3().fromArray(posed,b*3));
    expect(after/before,`${gender} ${shape} edge ${a}-${b}`).toBeLessThan(2.5);
   }
  }
 }
});
it('carries grip roll through the forearm for every equipment motion and frame',()=>{
 for(const exercise of catalog)for(const t of [0,.125,.25,.375,.5,.625,.75,.875,1]){
  const pose=poseJoints(exercise.motion_id,t);
  if(!pose.equipment?.grip)continue;
  for(const side of [0,1]){
   const elbow=side?7:4,wrist=side?8:5,hand=rigRotation(pose,12+side),arm=rigRotation(pose,3+side*2);
   expect(v(pose[wrist]).sub(v(pose[elbow])).angleTo(v(pose[side?18:17]).sub(v(pose[wrist]))),exercise.motion_id).toBeLessThan(.001);
   const expected=v(REST[wrist]).sub(v(REST[elbow])).normalize().applyQuaternion(hand);
   const actual=v(pose[wrist]).sub(v(pose[elbow])).normalize();
   expect(arm.angleTo(hand),exercise.motion_id).toBeCloseTo(expected.angleTo(actual),6);
  }
 }
});
it('removes local chest detail while preserving mesh topology and all other regions',()=>{
 for(const gender of ['male','female']){
  const raw=Float32Array.from(mesh.profiles[gender],x=>x*mesh.scale),clean=displayBodyBase(gender);let changes=0;
  expect(clean.length).toBe(raw.length);
  for(let i=0;i<raw.length;i+=3){
   expect(clean[i]).toBe(raw[i]);expect(clean[i+1]).toBe(raw[i+1]);
   if(clean[i+2]!==raw[i+2]){changes++;expect(Math.abs(raw[i])).toBeLessThan(.16);expect(raw[i+1]).toBeGreaterThan(1.26);expect(raw[i+1]).toBeLessThan(1.33);expect(Math.abs(clean[i+2]-raw[i+2])).toBeLessThan(.025);}
  }
  expect(changes).toBeGreaterThan(20);
 }
});
