import * as THREE from 'three';

export const vector = point => new THREE.Vector3(...point);
export const smoothStep = (start,end,value) => {
  const t = THREE.MathUtils.clamp((value-start)/(end-start),0,1);
  return t*t*t*(t*(t*6-15)+10);
};
export const repetition = t => smoothStep(.08,.43,t)*(1-smoothStep(.57,.94,t));
export const scaleFor = rest => rest[0][1]/.94;
export const segmentLength = (rest,a,b) => vector(rest[a]).distanceTo(vector(rest[b]));
export function orientation(up,front=[0,0,1]) {
  const y=vector(up).normalize(), z=vector(front).addScaledVector(y,-vector(front).dot(y));
  if(z.lengthSq()<1e-8)z.set(1,0,0).addScaledVector(y,-y.x);
  z.normalize();const x=y.clone().cross(z).normalize();z.copy(x).cross(y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
export function makeFrame(rest,hip=rest[0],up=[0,1,0],front=[0,0,1],pelvisFront=front) {
  const joints=rest.map(point=>point.slice()),axis=vector(up).normalize(),rotation=orientation(up,front);
  joints[0]=hip.slice();joints[1]=vector(hip).addScaledVector(axis,segmentLength(rest,0,1)).toArray();
  joints[2]=vector(joints[1]).addScaledVector(axis,segmentLength(rest,1,2)).toArray();
  const pelvis=orientation(up,pelvisFront);
  for(const [root,parent] of [[3,1],[6,1],[9,0],[12,0]])joints[root]=vector(rest[root]).sub(vector(rest[parent])).applyQuaternion(parent===0?pelvis:rotation).add(vector(joints[parent])).toArray();
  joints.boneRotations={0:rotation.toArray(),1:rotation.toArray()};
  return joints;
}
export function solveTwoBone(origin,target,upper,lower,pole) {
  const axis=vector(target).sub(vector(origin)),length=axis.length();
  if(length<1e-8)axis.set(0,-1,0);else axis.divideScalar(length);
  const distance=THREE.MathUtils.clamp(length,Math.abs(upper-lower)+1e-6,upper+lower-1e-6);
  const along=(upper*upper+distance*distance-lower*lower)/(2*distance),radius=Math.sqrt(Math.max(0,upper*upper-along*along));
  const bend=vector(pole).addScaledVector(axis,-vector(pole).dot(axis));
  if(bend.lengthSq()<1e-8)bend.set(1,0,0).addScaledVector(axis,-axis.x);
  bend.normalize();
  return [vector(origin).addScaledVector(axis,along).addScaledVector(bend,radius).toArray(),vector(origin).addScaledVector(axis,distance).toArray()];
}
export function solveLimb(joints,rest,side,type,target,pole) {
  const [root,middle,end]=type==='arm'?(side===0?[3,4,5]:[6,7,8]):(side===0?[9,10,11]:[12,13,14]);
  [joints[middle],joints[end]]=solveTwoBone(joints[root],target,segmentLength(rest,root,middle),segmentLength(rest,middle,end),pole);
  return joints;
}
export function setFoot(joints,rest,side,rotation=new THREE.Quaternion()) {
  const [ankle,toe]=side===0?[11,15]:[14,16];
  joints[toe]=vector(joints[ankle]).add(vector(rest[toe]).sub(vector(rest[ankle])).applyQuaternion(rotation)).toArray();return joints;
}
export function setHand(joints,rest,side,direction=[0,-1,0],roll) {
  const [wrist,finger]=side===0?[5,17]:[8,18];
  joints[finger]=vector(joints[wrist]).addScaledVector(vector(direction).normalize(),segmentLength(rest,wrist,finger)).toArray();
  if(Number.isFinite(roll)){joints.handRoll||=[0,0];joints.handRoll[side]=roll;}return joints;
}
