import * as THREE from 'three';
import {characterSurface,normalizeCharacter} from '../character/character.js';
import {personalizedVertices,sportswear} from '../body3d/avatar.js';
import {footwearAnchors} from '../body3d/Footwear.jsx';
import {morphPositions,morphParameters} from '../body3d/morph.js';
import {bindSurface,calibratePalmRoll,REST} from './rig.js';
import {calibrateGripScale,gripSurface} from './exerciseGrip.js';
import {calibrateWallSupport} from './wallSupportCalibration.js';
import {fitExerciseClothing} from './exerciseAppearance.js';

// Support height of the rounded upper and sole, including a raised heel.
// The old center-minus-height estimate incorrectly sank pitched shoes into the mat.
export function exerciseShoeFloor(shoe) {
  const rotation = shoe.rotation || new THREE.Quaternion();
  const x = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation).y;
  const y = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).y;
  const z = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).y;
  const capsule = (width, depth, halfLength) => Math.abs(z) * halfLength + Math.hypot(width * x, depth * y, halfLength * z);
  return Math.min(shoe.center[1] - capsule(shoe.width / 2, .037, shoe.length / 4), shoe.center[1] - .025 * y - capsule(shoe.width * .52, .012, shoe.length * .255));
}

export function heelContactHeights(shoes,rest){
  const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  return shoes.map((shoe,side)=>{
    const ankle=side?14:11;
    const center=new THREE.Vector3(...shoe.center).sub(new THREE.Vector3(...rest[ankle])).applyQuaternion(rotation).toArray();
    return .003-exerciseShoeFloor({...shoe,center,rotation});
  });
}

// CPU data only, bounded to four recent bodies. No disposed GPU resources or
// persisted health data. Motion/highlight/color changes share the same support fit.
const bodies=new Map(),bindings=new Map();
export function prepareAthlete(measurement,profile={},character){
 const c=normalizeCharacter(character),gender=profile.gender;
 const shape=Object.fromEntries(['body','face','style','eyeSize','chest','hips','waist','shoulders','pants'].map(k=>[k,c[k]]));
 const key=JSON.stringify([gender,morphParameters(measurement,profile),shape]);
 if(bodies.has(key)){const body=bodies.get(key);bodies.delete(key);bodies.set(key,body);return body;}
 const scale=morphParameters(measurement,profile).heightScale;
 const base=characterSurface(personalizedVertices(measurement,profile),c,scale);
 if(!bindings.has(gender))bindings.set(gender,bindSurface(personalizedVertices({height:178,weight:70,body_fat_percentage:20,skeletal_muscle_mass:32},{gender})));
 const weights=bindings.get(gender),wear=fitExerciseClothing(sportswear(base,scale,gender),scale,c);
 const flat=morphPositions(Float32Array.from(REST.flat()),measurement,profile),rest=REST.map((_,i)=>Array.from(flat.slice(i*3,i*3+3)));
 const shoes=footwearAnchors(base);rest.heelContactHeights=heelContactHeights(shoes,rest);
 rest.handGripScale=calibrateGripScale(wear.positions,weights,rest);rest.wallSupport=calibrateWallSupport(wear.positions,weights,rest);
 const result={headBase:base,base:wear.positions,wear,weights,rest,scale,shoes,palmRoll:rest.wallSupport.palmRoll,grips:new Map()};
 bodies.set(key,result);if(bodies.size>4)bodies.delete(bodies.keys().next().value);return result;
}
export function getGripSurface(model,grip){
 const key=JSON.stringify(grip);
 if(!model.grips.has(key)){
  model.grips.set(key,gripSurface(model.base,model.weights,model.rest,grip));
  if(model.grips.size>8)model.grips.delete(model.grips.keys().next().value);
 }
 return model.grips.get(key);
}
