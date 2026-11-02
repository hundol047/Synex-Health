import * as THREE from 'three';
import {REST,calibratePalmRoll,deformSurface,poseJoints,rigRotation} from '../exercise/rig.js';
import {calibrateWallSupport} from '../exercise/wallSupportCalibration.js';
import {calibrateGripScale,calibrateHandFrames} from '../exercise/exerciseGrip.js';
import {exerciseHandShape} from '../exercise/handPoses.js';
import {blinkAmount} from './livingFace.js';
import {calibrateTorsoClearance} from '../exercise/torsoClearance.js';

export function prepareDetailedModel(data,scale=1){
 const base=Float32Array.from(data.positions,v=>v*scale),rest=(data.rest||REST).map(p=>p.map(v=>v*scale));
 // The pelvis may be higher in a cosmetic proportion preset. It is not the
 // person's stature and must not enlarge equipment or support distances.
 rest.statureScale=scale;
 const weights=data.weights.map(row=>{const total=row.reduce((s,[,w])=>s+w,0);return row.map(([b,w])=>[b,w/total]);});
 rest.handFrames=calibrateHandFrames(base,weights,rest);
 rest.handGripScale=calibrateGripScale(base,weights,rest);
 rest.torsoClearance=calibrateTorsoClearance(base,weights,rest);
 rest.wallSupport=calibrateWallSupport(base,weights,rest);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(base.slice(),3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
 const indices=[];for(let i=0;i<data.groups.length;i++){geometry.addGroup(indices.length,data.groups[i].length,i);for(const index of data.groups[i])indices.push(index);}geometry.setIndex(indices);
 const source=data.sourceVertices||Array.from({length:base.length/3},(_,i)=>i),count=Math.max(...source)+1;
 const sums=new Float32Array(count*3);
 const guideBase=data.guidePositions?Float32Array.from(data.guidePositions,v=>v*scale):base;
 const model={base,guideBase,rest,weights,geometry,data,scale,source,sums,expression:base.slice(),palmRoll:calibratePalmRoll(base,weights,rest)};
 if(data.rigidHead){
  // Dense authored hair stays rigid on the head: keep every strand vertex,
  // but let the GPU transform it instead of skinning/rebuilding its normals.
  const hair=data.rigidHead,g=new THREE.BufferGeometry(),positions=Float32Array.from(hair.positions,(v,i)=>v*scale-rest[1][i%3]);
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(hair.uv,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(hair.normals,3));
  const indices=[];hair.groups.forEach((group,i)=>{g.addGroup(indices.length,group.length,i);for(const v of group)indices.push(v);});g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();
  model.rigidHeadGeometry=g;model.rigidHeadPosition=new THREE.Vector3();model.rigidHeadRotation=new THREE.Quaternion();
  model.rigidHeadHull=Float32Array.from(hair.boundsHull,(v,i)=>v*scale-rest[1][i%3]);
  // Wall clearance must include the hair silhouette, including the nape.
  const fullBase=new Float32Array(base.length+hair.positions.length);fullBase.set(base);fullBase.set(Float32Array.from(hair.positions,v=>v*scale),base.length);
  rest.wallSupport=calibrateWallSupport(fullBase,[...weights,...Array.from({length:hair.positions.length/3},()=>[[1,1]])],rest);
 }
 updateDetailedNormals(model);return model;
}
export function updateDetailedNormals(model){
 const {geometry,source,sums}=model;geometry.computeVertexNormals();sums.fill(0);
 const n=geometry.attributes.normal.array;
 for(let i=0;i<source.length;i++)for(let k=0;k<3;k++)sums[source[i]*3+k]+=n[i*3+k];
 for(let i=0;i<source.length;i++){const j=source[i]*3,len=Math.hypot(sums[j],sums[j+1],sums[j+2])||1;for(let k=0;k<3;k++)n[i*3+k]=sums[j+k]/len;}
 geometry.attributes.normal.needsUpdate=true;
}
export function poseDetailedModel(model,motion,progress){
 const {base,rest,weights,geometry,data,scale,expression}=model;
 const joints=poseJoints(motion,progress,rest);
 if(joints.handRoll&&!joints.boneRotations?.[12])joints.handRoll=model.palmRoll;
 expression.set(base);
 const grip=exerciseHandShape(motion,joints);
 for(let side=0;side<2;side++){
  const shape=Array.isArray(grip)?grip[side]:grip;
  for(const [i,x,y,z] of data.grips?.[shape]?.[side]||[]){expression[i*3]+=x*scale;expression[i*3+1]+=y*scale;expression[i*3+2]+=z*scale;}
 }
 const blink=blinkAmount(progress);
 if(data.sourceFamily==='vrm-toon'){
  for(const [name,amount] of [['vtuberRelaxed',.12],['vtuberHairSway',Math.sin(progress*Math.PI*2)]]){
   for(const [i,x,y,z] of data.morphs[name]||[]){expression[i*3]+=x*scale*amount;expression[i*3+1]+=y*scale*amount;expression[i*3+2]+=z*scale*amount;}
  }
 }
 for(const name of ['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight'])for(const [i,x,y,z] of data.morphs[name]||[]){expression[i*3]+=x*scale*blink;expression[i*3+1]+=y*scale*blink;expression[i*3+2]+=z*scale*blink;}
 deformSurface(expression,weights,joints,geometry.attributes.position.array,rest,false);
 geometry.attributes.position.needsUpdate=true;updateDetailedNormals(model);
 geometry.computeBoundingBox();
 if(model.rigidHeadGeometry){
  model.rigidHeadPosition.fromArray(joints[1]);model.rigidHeadRotation.copy(rigRotation(joints,1,rest));
  const point=new THREE.Vector3();
  // A convex hull gives exact extremal bounds for the rigid hair at any angle.
  // Include it in floor support so prone poses cannot push it through the mat.
  for(let i=0;i<model.rigidHeadHull.length;i+=3){point.fromArray(model.rigidHeadHull,i).applyQuaternion(model.rigidHeadRotation).add(model.rigidHeadPosition);geometry.boundingBox.expandByPoint(point);}
 }
 geometry.boundingSphere||=new THREE.Sphere();geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);
 return joints;
}

// Seated machines, benches and raised decks own their support height. Bringing
// their lowest vertex to the room floor would pull the character off the seat.
export function detailedFloorOffset(model,joints){
 const e=joints.equipment;
 if(e&&(e.seat||e.bench||e.footplate||e.pedalPivot||Number.isFinite(e.beltY)||['chair','support','incline'].includes(e.kind)))return 0;
 return .003*model.scale-model.geometry.boundingBox.min.y;
}
