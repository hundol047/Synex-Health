import * as THREE from 'three';
import {REST,calibratePalmRoll,deformSurface,poseJoints} from '../exercise/rig.js';
import {calibrateWallSupport} from '../exercise/wallSupportCalibration.js';
import {calibrateGripScale} from '../exercise/exerciseGrip.js';
import {exerciseHandShape} from '../exercise/handPoses.js';
import {blinkAmount} from './livingFace.js';

export function prepareDetailedModel(data,scale=1){
 const base=Float32Array.from(data.positions,v=>v*scale),rest=REST.map(p=>p.map(v=>v*scale));
 const weights=data.weights.map(row=>{const total=row.reduce((s,[,w])=>s+w,0);return row.map(([b,w])=>[b,w/total]);});
 rest.handGripScale=calibrateGripScale(base,weights,rest);
 rest.wallSupport=calibrateWallSupport(base,weights,rest);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(base.slice(),3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
 const indices=[];for(let i=0;i<data.groups.length;i++){geometry.addGroup(indices.length,data.groups[i].length,i);for(const index of data.groups[i])indices.push(index);}geometry.setIndex(indices);
 const source=data.sourceVertices||Array.from({length:base.length/3},(_,i)=>i),count=Math.max(...source)+1;
 const sums=new Float32Array(count*3);
 const model={base,rest,weights,geometry,data,scale,source,sums,expression:base.slice(),palmRoll:calibratePalmRoll(base,weights,rest)};
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
 for(const name of ['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight'])for(const [i,x,y,z] of data.morphs[name]||[]){expression[i*3]+=x*scale*blink;expression[i*3+1]+=y*scale*blink;expression[i*3+2]+=z*scale*blink;}
 deformSurface(expression,weights,joints,geometry.attributes.position.array,rest,false);
 geometry.attributes.position.needsUpdate=true;updateDetailedNormals(model);
 geometry.computeBoundingBox();geometry.boundingSphere||=new THREE.Sphere();geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);
 return joints;
}

// Seated machines, benches and raised decks own their support height. Bringing
// their lowest vertex to the room floor would pull the character off the seat.
export function detailedFloorOffset(model,joints){
 const e=joints.equipment;
 if(e&&(e.seat||e.bench||e.footplate||e.pedalPivot||Number.isFinite(e.beltY)||['chair','support','incline'].includes(e.kind)))return 0;
 return .003*model.scale-model.geometry.boundingBox.min.y;
}
